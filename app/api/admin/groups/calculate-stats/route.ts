import { NextResponse } from "next/server";
import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  groups,
  products,
  productsGroups,
  productsShopsPrices,
} from "@/db/schema";
import {
  parseUnitWithGroupConversion,
  type Measurement,
} from "@/lib/unit-utils";

type GroupCandidate = {
  groupId: number;
  groupHumanId: string;
  groupCompareBy: string | null;
  productId: number;
  unit: string;
  minPrice: number | string | null;
};

type ComparableType = "measure" | "count";

type ProductCandidate = {
  productId: number;
  price: number;
  unitPrice: number;
  comparableType: ComparableType;
};

type GroupStat = {
  cheaper: { productId: number; price: number } | null;
  bestValue: { productId: number; unitPrice: number } | null;
};

const PRICE_EPSILON = 1e-6;

function getComparableType(measurement: Measurement | null): ComparableType | null {
  if (!measurement) return null;
  return measurement === "count" ? "count" : "measure";
}

export async function POST() {
  try {
    const minCurrentPrice = sql<number>`min(${productsShopsPrices.currentPrice})`;
    const groupCandidates = await db
      .select({
        groupId: groups.id,
        groupHumanId: groups.humanNameId,
        groupCompareBy: groups.compareBy,
        productId: products.id,
        unit: products.unit,
        minPrice: minCurrentPrice.as("minPrice"),
      })
      .from(groups)
      .innerJoin(productsGroups, eq(productsGroups.groupId, groups.id))
      .innerJoin(products, eq(products.id, productsGroups.productId))
      .innerJoin(
        productsShopsPrices,
        and(
          eq(productsShopsPrices.productId, products.id),
          isNotNull(productsShopsPrices.currentPrice),
          or(
            isNull(productsShopsPrices.hidden),
            eq(productsShopsPrices.hidden, false)
          )
        )
      )
      .where(or(isNull(products.deleted), eq(products.deleted, false)))
      .groupBy(
        groups.id,
        groups.humanNameId,
        groups.compareBy,
        products.id,
        products.unit
      );

    // Group candidates by groupId for processing
    const candidatesByGroup = new Map<number, GroupCandidate[]>();
    for (const row of groupCandidates as GroupCandidate[]) {
      const existing = candidatesByGroup.get(row.groupId) ?? [];
      existing.push(row);
      candidatesByGroup.set(row.groupId, existing);
    }

    const groupStats = new Map<number, GroupStat>();

    for (const [groupId, candidates] of candidatesByGroup) {
      if (candidates.length === 0) continue;

      const groupHumanId = candidates[0].groupHumanId;
      const groupCompareBy = candidates[0].groupCompareBy;

      // Parse all products and calculate unit prices
      const parsedProducts: ProductCandidate[] = [];
      let cheaperCandidate: { productId: number; price: number } | null = null;

      // Count products by comparable type
      const countByType: Record<ComparableType, number> = { measure: 0, count: 0 };

      for (const row of candidates) {
        const price = Number(row.minPrice);
        if (!Number.isFinite(price) || price <= 0) {
          continue;
        }

        // Track cheapest product (regardless of unit parsing)
        if (
          !cheaperCandidate ||
          price < cheaperCandidate.price ||
          (Math.abs(price - cheaperCandidate.price) < PRICE_EPSILON &&
            row.productId < cheaperCandidate.productId)
        ) {
          cheaperCandidate = { productId: row.productId, price };
        }

        // Parse unit with group-specific conversions
        const parsed = parseUnitWithGroupConversion(row.unit, groupHumanId);
        if (!parsed) continue;

        const unitPrice = price / parsed.base;
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) continue;

        const comparableType = getComparableType(parsed.measurement);
        if (!comparableType) continue;

        countByType[comparableType]++;
        parsedProducts.push({
          productId: row.productId,
          price,
          unitPrice,
          comparableType,
        });
      }

      // Determine the target measurement type (same logic as group-products.ts)
      const wantsCount =
        typeof groupCompareBy === "string" &&
        groupCompareBy.toLowerCase() === "count";

      let targetType: ComparableType;
      if (wantsCount && countByType.count > 0) {
        targetType = "count";
      } else if (countByType.measure > countByType.count) {
        targetType = "measure";
      } else if (countByType.count > 0) {
        targetType = "count";
      } else {
        targetType = "measure";
      }

      // Find best value product within the target type
      let bestValueCandidate: { productId: number; unitPrice: number } | null = null;

      for (const product of parsedProducts) {
        if (product.comparableType !== targetType) continue;

        if (
          !bestValueCandidate ||
          product.unitPrice < bestValueCandidate.unitPrice ||
          (Math.abs(product.unitPrice - bestValueCandidate.unitPrice) < PRICE_EPSILON &&
            product.productId < bestValueCandidate.productId)
        ) {
          bestValueCandidate = {
            productId: product.productId,
            unitPrice: product.unitPrice,
          };
        }
      }

      groupStats.set(groupId, {
        cheaper: cheaperCandidate,
        bestValue: bestValueCandidate,
      });
    }

    const allGroups = await db.select({ id: groups.id }).from(groups);

    for (const group of allGroups) {
      const stats = groupStats.get(group.id);
      await db
        .update(groups)
        .set({
          cheaperProductId: stats?.cheaper?.productId ?? null,
          bestValueProductId: stats?.bestValue?.productId ?? null,
        })
        .where(eq(groups.id, group.id));
    }

    return NextResponse.json({
      updatedGroups: allGroups.length,
      groupsWithProducts: groupStats.size,
    });
  } catch (error) {
    console.error(
      "[api/admin/groups/calculate-stats] Failed to update group stats",
      error
    );
    return NextResponse.json(
      { message: "Unable to calculate group stats at the moment." },
      { status: 500 }
    );
  }
}

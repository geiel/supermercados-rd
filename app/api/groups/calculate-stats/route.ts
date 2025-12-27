import { NextResponse } from "next/server";
import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  groups,
  products,
  productsGroups,
  productsShopsPrices,
} from "@/db/schema";
import { parseUnit } from "@/lib/unit-utils";

type GroupCandidate = {
  groupId: number;
  productId: number;
  unit: string;
  minPrice: number | string | null;
};

type GroupStat = {
  cheaper: { productId: number; price: number } | null;
  bestValue: { productId: number; unitPrice: number } | null;
};

const PRICE_EPSILON = 1e-6;

export async function POST() {
  try {
    const minCurrentPrice = sql<number>`min(${productsShopsPrices.currentPrice})`;
    const groupCandidates = await db
      .select({
        groupId: groups.id,
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
      .groupBy(groups.id, products.id, products.unit);

    const groupStats = new Map<number, GroupStat>();

    for (const row of groupCandidates as GroupCandidate[]) {
      const price = Number(row.minPrice);
      if (!Number.isFinite(price) || price <= 0) {
        continue;
      }

      const current = groupStats.get(row.groupId) ?? {
        cheaper: null,
        bestValue: null,
      };

      if (
        !current.cheaper ||
        price < current.cheaper.price ||
        (Math.abs(price - current.cheaper.price) < PRICE_EPSILON &&
          row.productId < current.cheaper.productId)
      ) {
        current.cheaper = { productId: row.productId, price };
      }

      const parsed = parseUnit(row.unit);
      if (parsed) {
        const unitPrice = price / parsed.base;
        if (Number.isFinite(unitPrice) && unitPrice > 0) {
          if (
            !current.bestValue ||
            unitPrice < current.bestValue.unitPrice ||
            (Math.abs(unitPrice - current.bestValue.unitPrice) <
              PRICE_EPSILON &&
              row.productId < current.bestValue.productId)
          ) {
            current.bestValue = { productId: row.productId, unitPrice };
          }
        }
      }

      groupStats.set(row.groupId, current);
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
      "[api/groups/calculate-stats] Failed to update group stats",
      error
    );
    return NextResponse.json(
      { message: "Unable to calculate group stats at the moment." },
      { status: 500 }
    );
  }
}

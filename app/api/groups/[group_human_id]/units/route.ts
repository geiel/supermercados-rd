import { NextResponse } from "next/server";
import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  groups,
  products,
  productsGroups,
  productsShopsPrices,
} from "@/db/schema";
import type { UnitOption } from "@/types/group-explorer";

type RouteParams = {
  params: Promise<{
    group_human_id: string;
  }>;
};

function parseCommaSeparatedInts(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => parseInt(v.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parsePriceParam(value: string | null, { allowZero = false } = {}) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (allowZero) return parsed >= 0 ? parsed : null;
  return parsed > 0 ? parsed : null;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { group_human_id } = await params;
  const { searchParams } = new URL(request.url);
  const shopIdsParam = searchParams.get("shop_ids");
  const minPriceParam = searchParams.get("min_price");
  const maxPriceParam = searchParams.get("max_price");

  const shopIds = parseCommaSeparatedInts(shopIdsParam);
  const minPrice = parsePriceParam(minPriceParam, { allowZero: true });
  const maxPrice = parsePriceParam(maxPriceParam);

  try {
    // Find the group
    const group = await db.query.groups.findFirst({
      columns: { id: true },
      where: (groups, { eq }) => eq(groups.humanNameId, group_human_id),
    });

    if (!group) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 }
      );
    }

    // Price filters to only count products with valid prices
    const basePriceFilters = and(
      isNotNull(productsShopsPrices.currentPrice),
      or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false))
    );

    // Get unique units with counts for products in this group
    const unitRows = await db
      .select({
        unit: products.unit,
        count: sql<number>`count(distinct ${products.id})`,
      })
      .from(productsGroups)
      .innerJoin(products, eq(products.id, productsGroups.productId))
      .innerJoin(
        productsShopsPrices,
        and(eq(productsShopsPrices.productId, products.id), basePriceFilters)
      )
      .where(eq(productsGroups.groupId, group.id))
      .groupBy(products.unit)
      .orderBy(sql`count(distinct ${products.id}) desc`);

    const hasFilters =
      shopIds.length > 0 || minPrice !== null || maxPrice !== null;

    if (!hasFilters) {
      const units: UnitOption[] = unitRows.map((row) => ({
        value: row.unit,
        label: row.unit,
        count: Number(row.count),
      }));

      return NextResponse.json(units);
    }

    const filteredPriceConditions = [
      isNotNull(productsShopsPrices.currentPrice),
      or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false)),
    ];

    if (shopIds.length > 0) {
      filteredPriceConditions.push(
        inArray(productsShopsPrices.shopId, shopIds)
      );
    }

    const filteredPriceFilters = and(...filteredPriceConditions);
    const productFilterConditions = [eq(productsGroups.groupId, group.id)];

    const minCurrentPrice = sql<string>`min(${productsShopsPrices.currentPrice})`;
    const havingConditions: ReturnType<typeof sql>[] = [];

    if (minPrice !== null) {
      havingConditions.push(sql`${minCurrentPrice} >= ${minPrice}`);
    }
    if (maxPrice !== null) {
      havingConditions.push(sql`${minCurrentPrice} <= ${maxPrice}`);
    }

    const havingClause =
      havingConditions.length > 0
        ? sql.join(havingConditions, sql` AND `)
        : undefined;

    const baseFilteredProductsQuery = db
      .select({
        productId: products.id,
        unit: products.unit,
      })
      .from(productsGroups)
      .innerJoin(products, eq(products.id, productsGroups.productId))
      .innerJoin(
        productsShopsPrices,
        and(eq(productsShopsPrices.productId, products.id), filteredPriceFilters)
      )
      .where(and(...productFilterConditions))
      .groupBy(products.id, products.unit);

    const filteredProductsQuery = havingClause
      ? baseFilteredProductsQuery.having(havingClause)
      : baseFilteredProductsQuery;

    const filteredProducts = filteredProductsQuery.as("filtered_products");

    const filteredUnitRows = await db
      .select({
        unit: filteredProducts.unit,
        count: sql<number>`count(*)`,
      })
      .from(filteredProducts)
      .groupBy(filteredProducts.unit);

    const countsByUnit = new Map<string, number>(
      filteredUnitRows.map((row) => [row.unit, Number(row.count)])
    );

    const units: UnitOption[] = unitRows.map((row) => ({
      value: row.unit,
      label: row.unit,
      count: countsByUnit.get(row.unit) ?? 0,
    }));

    return NextResponse.json(units);
  } catch (error) {
    console.error("[api/groups/units] Failed to load units", error);
    return NextResponse.json(
      { message: "Unable to load units at the moment." },
      { status: 500 }
    );
  }
}

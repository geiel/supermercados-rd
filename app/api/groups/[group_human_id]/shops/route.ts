import { NextResponse } from "next/server";
import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  products,
  productsGroups,
  productsShopsPrices,
  shops,
} from "@/db/schema";
import type { ShopOption } from "@/types/group-explorer";

type RouteParams = {
  params: Promise<{
    group_human_id: string;
  }>;
};

function parseCommaSeparatedStrings(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => decodeURIComponent(v.trim()))
    .filter((s) => s.length > 0);
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
  const unitsParam = searchParams.get("units");
  const minPriceParam = searchParams.get("min_price");
  const maxPriceParam = searchParams.get("max_price");

  const units = parseCommaSeparatedStrings(unitsParam);
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

    // Get shops with product counts for this group
    const shopRows = await db
      .select({
        shopId: shops.id,
        shopName: shops.name,
        count: sql<number>`count(distinct ${products.id})`,
      })
      .from(productsGroups)
      .innerJoin(products, eq(products.id, productsGroups.productId))
      .innerJoin(
        productsShopsPrices,
        and(eq(productsShopsPrices.productId, products.id), basePriceFilters)
      )
      .innerJoin(shops, eq(shops.id, productsShopsPrices.shopId))
      .where(eq(productsGroups.groupId, group.id))
      .groupBy(shops.id, shops.name)
      .orderBy(sql`count(distinct ${products.id}) desc`);

    const hasFilters =
      units.length > 0 || minPrice !== null || maxPrice !== null;

    if (!hasFilters) {
      const shopOptions: ShopOption[] = shopRows.map((row) => ({
        id: row.shopId,
        name: row.shopName,
        count: Number(row.count),
      }));

      return NextResponse.json(shopOptions);
    }

    const filteredPriceConditions = [
      isNotNull(productsShopsPrices.currentPrice),
      or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false)),
    ];

    if (minPrice !== null) {
      filteredPriceConditions.push(
        sql`${productsShopsPrices.currentPrice} >= ${minPrice}`
      );
    }

    if (maxPrice !== null) {
      filteredPriceConditions.push(
        sql`${productsShopsPrices.currentPrice} <= ${maxPrice}`
      );
    }

    const filteredPriceFilters = and(...filteredPriceConditions);
    const productFilterConditions = [eq(productsGroups.groupId, group.id)];

    if (units.length > 0) {
      productFilterConditions.push(inArray(products.unit, units));
    }

    const filteredShopRows = await db
      .select({
        shopId: shops.id,
        count: sql<number>`count(distinct ${products.id})`,
      })
      .from(productsGroups)
      .innerJoin(products, eq(products.id, productsGroups.productId))
      .innerJoin(
        productsShopsPrices,
        and(eq(productsShopsPrices.productId, products.id), filteredPriceFilters)
      )
      .innerJoin(shops, eq(shops.id, productsShopsPrices.shopId))
      .where(and(...productFilterConditions))
      .groupBy(shops.id);

    const countsByShopId = new Map<number, number>(
      filteredShopRows.map((row) => [row.shopId, Number(row.count)])
    );

    const shopOptions: ShopOption[] = shopRows.map((row) => ({
      id: row.shopId,
      name: row.shopName,
      count: countsByShopId.get(row.shopId) ?? 0,
    }));

    return NextResponse.json(shopOptions);
  } catch (error) {
    console.error("[api/groups/shops] Failed to load shops", error);
    return NextResponse.json(
      { message: "Unable to load shops at the moment." },
      { status: 500 }
    );
  }
}

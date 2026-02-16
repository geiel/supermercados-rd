import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { and, eq, gte, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  groups,
  products,
  productsGroups,
  productsShopsPrices,
  todaysDeals,
} from "@/db/schema";
import { getVisibleBrandById } from "@/lib/brand-products";
import type { DealsGroupOption } from "@/types/deals";

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

function parseMinDropParam(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 0 ? parsed : null;
}

type RouteParams = {
  params: Promise<{
    brand_id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { brand_id } = await params;
  const brandId = Number(brand_id);

  if (!Number.isFinite(brandId) || brandId <= 0) {
    return NextResponse.json({ message: "Invalid brand id." }, { status: 400 });
  }

  const brand = await getVisibleBrandById(brandId);
  if (!brand) {
    return NextResponse.json({ message: "Brand not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const shopIdsParam = searchParams.get("shop_ids");
  const minPriceParam = searchParams.get("min_price");
  const maxPriceParam = searchParams.get("max_price");
  const minDropParam = searchParams.get("min_drop");

  const shopIds = parseCommaSeparatedInts(shopIdsParam);
  const minPrice = parsePriceParam(minPriceParam, { allowZero: true });
  const maxPrice = parsePriceParam(maxPriceParam);
  const minDrop = parseMinDropParam(minDropParam);

  try {
    const basePriceConditions = [
      isNotNull(productsShopsPrices.currentPrice),
      or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false)),
    ];
    const basePriceFilters = and(...basePriceConditions);

    const baseProductConditions = [
      eq(products.brandId, brandId),
      or(isNull(products.deleted), eq(products.deleted, false)),
      isNull(groups.parentGroupId),
    ];

    const groupRows = await db
      .select({
        groupId: groups.id,
        groupName: groups.name,
        count: sql<number>`count(distinct ${products.id})`,
      })
      .from(groups)
      .innerJoin(productsGroups, eq(productsGroups.groupId, groups.id))
      .innerJoin(products, eq(products.id, productsGroups.productId))
      .innerJoin(
        productsShopsPrices,
        and(eq(productsShopsPrices.productId, products.id), basePriceFilters)
      )
      .where(and(...baseProductConditions))
      .groupBy(groups.id, groups.name)
      .orderBy(sql`count(distinct ${products.id}) desc`);

    const hasFilters =
      shopIds.length > 0 ||
      minPrice !== null ||
      maxPrice !== null ||
      minDrop !== null;

    if (!hasFilters) {
      const options: DealsGroupOption[] = groupRows.map((row) => ({
        id: row.groupId,
        name: row.groupName,
        count: Number(row.count),
      }));

      return NextResponse.json(options);
    }

    const filteredPriceConditions = [
      isNotNull(productsShopsPrices.currentPrice),
      or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false)),
    ];

    if (shopIds.length > 0) {
      filteredPriceConditions.push(inArray(productsShopsPrices.shopId, shopIds));
    }

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
    const filteredProductConditions = [...baseProductConditions];

    if (minDrop !== null) {
      const discountConditions = [gte(todaysDeals.dropPercentage, String(minDrop))];
      if (shopIds.length > 0) {
        discountConditions.push(inArray(todaysDeals.shopId, shopIds));
      }
      const discountedProducts = db
        .select({ productId: todaysDeals.productId })
        .from(todaysDeals)
        .where(and(...discountConditions));
      filteredProductConditions.push(inArray(products.id, discountedProducts));
    }

    const filteredGroupRows = await db
      .select({
        groupId: groups.id,
        count: sql<number>`count(distinct ${products.id})`,
      })
      .from(groups)
      .innerJoin(productsGroups, eq(productsGroups.groupId, groups.id))
      .innerJoin(products, eq(products.id, productsGroups.productId))
      .innerJoin(
        productsShopsPrices,
        and(eq(productsShopsPrices.productId, products.id), filteredPriceFilters)
      )
      .where(and(...filteredProductConditions))
      .groupBy(groups.id);

    const countsByGroupId = new Map<number, number>(
      filteredGroupRows.map((row) => [row.groupId, Number(row.count)])
    );

    const options: DealsGroupOption[] = groupRows.map((row) => ({
      id: row.groupId,
      name: row.groupName,
      count: countsByGroupId.get(row.groupId) ?? 0,
    }));

    return NextResponse.json(options);
  } catch (error) {
    Sentry.logger.error("[api/brands/categories] Failed to load categories", {
      error,
    });

    return NextResponse.json(
      { message: "Unable to load categories at the moment." },
      { status: 500 }
    );
  }
}

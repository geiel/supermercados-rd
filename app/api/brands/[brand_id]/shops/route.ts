import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { and, eq, gte, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  products,
  productsGroups,
  productsShopsPrices,
  shops,
  todaysDeals,
} from "@/db/schema";
import { getVisibleBrandById } from "@/lib/brand-products";
import type { DealsShopOption } from "@/types/deals";

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
  const groupIdsParam = searchParams.get("group_ids");
  const minPriceParam = searchParams.get("min_price");
  const maxPriceParam = searchParams.get("max_price");
  const minDropParam = searchParams.get("min_drop");

  const groupIds = parseCommaSeparatedInts(groupIdsParam);
  const minPrice = parsePriceParam(minPriceParam, { allowZero: true });
  const maxPrice = parsePriceParam(maxPriceParam);
  const minDrop = parseMinDropParam(minDropParam);

  try {
    const basePriceFilters = and(
      isNotNull(productsShopsPrices.currentPrice),
      or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false))
    );

    const productFilterConditions = [
      eq(products.brandId, brandId),
      or(isNull(products.deleted), eq(products.deleted, false)),
    ];

    const shopRows = await db
      .select({
        shopId: shops.id,
        shopName: shops.name,
        count: sql<number>`count(distinct ${products.id})`,
      })
      .from(products)
      .innerJoin(
        productsShopsPrices,
        and(eq(productsShopsPrices.productId, products.id), basePriceFilters)
      )
      .innerJoin(shops, eq(shops.id, productsShopsPrices.shopId))
      .where(and(...productFilterConditions))
      .groupBy(shops.id, shops.name)
      .orderBy(sql`count(distinct ${products.id}) desc`);

    const hasFilters =
      groupIds.length > 0 ||
      minPrice !== null ||
      maxPrice !== null ||
      minDrop !== null;

    if (!hasFilters) {
      const options: DealsShopOption[] = shopRows.map((row) => ({
        id: row.shopId,
        name: row.shopName,
        count: Number(row.count),
      }));

      return NextResponse.json(options);
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

    const filteredProductConditions = [
      eq(products.brandId, brandId),
      or(isNull(products.deleted), eq(products.deleted, false)),
    ];

    if (groupIds.length > 0) {
      const groupProducts = db
        .select({ productId: productsGroups.productId })
        .from(productsGroups)
        .where(inArray(productsGroups.groupId, groupIds));

      filteredProductConditions.push(inArray(products.id, groupProducts));
    }

    if (minDrop !== null) {
      const discountedProducts = db
        .select({ productId: todaysDeals.productId })
        .from(todaysDeals)
        .where(gte(todaysDeals.dropPercentage, String(minDrop)));
      filteredProductConditions.push(inArray(products.id, discountedProducts));
    }

    const filteredShopRows = await db
      .select({
        shopId: shops.id,
        count: sql<number>`count(distinct ${products.id})`,
      })
      .from(products)
      .innerJoin(
        productsShopsPrices,
        and(eq(productsShopsPrices.productId, products.id), filteredPriceFilters)
      )
      .innerJoin(shops, eq(shops.id, productsShopsPrices.shopId))
      .where(and(...filteredProductConditions))
      .groupBy(shops.id);

    const countsByShopId = new Map<number, number>(
      filteredShopRows.map((row) => [row.shopId, Number(row.count)])
    );

    const options: DealsShopOption[] = shopRows.map((row) => ({
      id: row.shopId,
      name: row.shopName,
      count: countsByShopId.get(row.shopId) ?? 0,
    }));

    return NextResponse.json(options);
  } catch (error) {
    Sentry.logger.error("[api/brands/shops] Failed to load shops", { error });

    return NextResponse.json(
      { message: "Unable to load shops at the moment." },
      { status: 500 }
    );
  }
}

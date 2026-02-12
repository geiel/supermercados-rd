import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { and, eq, gt, gte, inArray, lte, SQL, sql } from "drizzle-orm";

import { db } from "@/db";
import { productsGroups, shops, todaysDeals } from "@/db/schema";
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

export async function GET(request: Request) {
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
    const baseConditions: SQL<unknown>[] = [];

    const shopRows = await db
      .select({
        shopId: shops.id,
        shopName: shops.name,
        count: sql<number>`count(*)`,
      })
      .from(todaysDeals)
      .innerJoin(shops, eq(shops.id, todaysDeals.shopId))
      .where(and(...baseConditions))
      .groupBy(shops.id, shops.name)
      .orderBy(sql`count(*) desc`);

    const hasFilters =
      groupIds.length > 0 ||
      minPrice !== null ||
      maxPrice !== null ||
      minDrop !== null;

    if (!hasFilters) {
      const shopOptions: DealsShopOption[] = shopRows.map((row) => ({
        id: row.shopId,
        name: row.shopName,
        count: Number(row.count),
      }));

      return NextResponse.json(shopOptions);
    }

    const filteredConditions = [gt(todaysDeals.dropPercentage, "0")];

    if (groupIds.length > 0) {
      const groupProducts = db
        .select({ productId: productsGroups.productId })
        .from(productsGroups)
        .where(inArray(productsGroups.groupId, groupIds));
      filteredConditions.push(inArray(todaysDeals.productId, groupProducts));
    }

    if (minDrop !== null) {
      filteredConditions.push(gte(todaysDeals.dropPercentage, String(minDrop)));
    }

    if (minPrice !== null) {
      filteredConditions.push(gte(todaysDeals.priceToday, String(minPrice)));
    }

    if (maxPrice !== null) {
      filteredConditions.push(lte(todaysDeals.priceToday, String(maxPrice)));
    }

    const filteredShopRows = await db
      .select({
        shopId: shops.id,
        count: sql<number>`count(*)`,
      })
      .from(todaysDeals)
      .innerJoin(shops, eq(shops.id, todaysDeals.shopId))
      .where(and(...filteredConditions))
      .groupBy(shops.id);

    const countsByShopId = new Map<number, number>(
      filteredShopRows.map((row) => [row.shopId, Number(row.count)])
    );

    const shopOptions: DealsShopOption[] = shopRows.map((row) => ({
      id: row.shopId,
      name: row.shopName,
      count: countsByShopId.get(row.shopId) ?? 0,
    }));

    return NextResponse.json(shopOptions);
  } catch (error) {
    Sentry.logger.error("[api/deals/shops] Failed to load shops", { error });
    return NextResponse.json(
      { message: "Unable to load shops at the moment." },
      { status: 500 }
    );
  }
}

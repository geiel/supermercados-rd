import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { and, eq, gt, gte, inArray, isNull, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { groups, productsGroups, todaysDeals } from "@/db/schema";
import type { DealsGroupOption } from "@/types/deals";

function parseCommaSeparatedInts(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => parseInt(v.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parseSingleInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 0 ? parsed : null;
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
  const shopIdsParam = searchParams.get("shop_ids");
  const shopIdParam = searchParams.get("shop_id");
  const minPriceParam = searchParams.get("min_price");
  const maxPriceParam = searchParams.get("max_price");
  const minDropParam = searchParams.get("min_drop");

  const shopIds = parseCommaSeparatedInts(shopIdsParam);
  const singleShopId = parseSingleInt(shopIdParam);
  if (typeof singleShopId === "number") {
    shopIds.push(singleShopId);
  }

  const uniqueShopIds = Array.from(new Set(shopIds));
  const minPrice = parsePriceParam(minPriceParam, { allowZero: true });
  const maxPrice = parsePriceParam(maxPriceParam);
  const minDrop = parseMinDropParam(minDropParam);

  try {
    const baseConditions = [isNull(groups.parentGroupId)];

    const groupRows = await db
      .select({
        groupId: groups.id,
        groupName: groups.name,
        count: sql<number>`count(distinct ${todaysDeals.productId})`,
      })
      .from(groups)
      .innerJoin(productsGroups, eq(productsGroups.groupId, groups.id))
      .innerJoin(todaysDeals, eq(todaysDeals.productId, productsGroups.productId))
      .where(and(...baseConditions))
      .groupBy(groups.id, groups.name)
      .orderBy(sql`count(distinct ${todaysDeals.productId}) desc`);

    const hasFilters =
      uniqueShopIds.length > 0 ||
      minPrice !== null ||
      maxPrice !== null ||
      minDrop !== null;

    if (!hasFilters) {
      const groupOptions: DealsGroupOption[] = groupRows.map((row) => ({
        id: row.groupId,
        name: row.groupName,
        count: Number(row.count),
      }));

      return NextResponse.json(groupOptions);
    }

    const filteredConditions = [
      gt(todaysDeals.dropPercentage, "0"),
      isNull(groups.parentGroupId),
    ];

    if (uniqueShopIds.length > 0) {
      filteredConditions.push(inArray(todaysDeals.shopId, uniqueShopIds));
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

    const filteredGroupRows = await db
      .select({
        groupId: groups.id,
        count: sql<number>`count(distinct ${todaysDeals.productId})`,
      })
      .from(groups)
      .innerJoin(productsGroups, eq(productsGroups.groupId, groups.id))
      .innerJoin(todaysDeals, eq(todaysDeals.productId, productsGroups.productId))
      .where(and(...filteredConditions))
      .groupBy(groups.id);

    const countsByGroupId = new Map<number, number>(
      filteredGroupRows.map((row) => [row.groupId, Number(row.count)])
    );

    const groupOptions: DealsGroupOption[] = groupRows.map((row) => ({
      id: row.groupId,
      name: row.groupName,
      count: countsByGroupId.get(row.groupId) ?? 0,
    }));

    return NextResponse.json(groupOptions);
  } catch (error) {
    Sentry.logger.error("[api/deals/categories] Failed to load categories", { error });
    return NextResponse.json(
      { message: "Unable to load categories at the moment." },
      { status: 500 }
    );
  }
}

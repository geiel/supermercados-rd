import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { and, gt, inArray, lte, gte, sql, SQL } from "drizzle-orm";

import { db } from "@/db";
import { productsGroups, todaysDeals } from "@/db/schema";
import {
  DEALS_DISCOUNT_OPTIONS,
  type DealsDiscountOption,
} from "@/types/deals";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopIdsParam = searchParams.get("shop_ids");
  const shopIdParam = searchParams.get("shop_id");
  const groupIdsParam = searchParams.get("group_ids");
  const minPriceParam = searchParams.get("min_price");
  const maxPriceParam = searchParams.get("max_price");

  const shopIds = parseCommaSeparatedInts(shopIdsParam);
  const singleShopId = parseSingleInt(shopIdParam);
  if (typeof singleShopId === "number") {
    shopIds.push(singleShopId);
  }

  const uniqueShopIds = Array.from(new Set(shopIds));
  const groupIds = parseCommaSeparatedInts(groupIdsParam);
  const minPrice = parsePriceParam(minPriceParam, { allowZero: true });
  const maxPrice = parsePriceParam(maxPriceParam);

  try {
    const filterConditions: SQL<unknown>[] = [];

    if (uniqueShopIds.length > 0) {
      filterConditions.push(inArray(todaysDeals.shopId, uniqueShopIds));
    }

    if (groupIds.length > 0) {
      const groupProducts = db
        .select({ productId: productsGroups.productId })
        .from(productsGroups)
        .where(inArray(productsGroups.groupId, groupIds));
      filterConditions.push(inArray(todaysDeals.productId, groupProducts));
    }

    if (minPrice !== null) {
      filterConditions.push(gte(todaysDeals.priceToday, String(minPrice)));
    }

    if (maxPrice !== null) {
      filterConditions.push(lte(todaysDeals.priceToday, String(maxPrice)));
    }

    const rows = await db
      .select({
        count50: sql<number>`sum(case when ${todaysDeals.dropPercentage} >= 50 then 1 else 0 end)`,
        count25: sql<number>`sum(case when ${todaysDeals.dropPercentage} >= 25 then 1 else 0 end)`,
        count10: sql<number>`sum(case when ${todaysDeals.dropPercentage} >= 10 then 1 else 0 end)`,
        count5: sql<number>`sum(case when ${todaysDeals.dropPercentage} >= 5 then 1 else 0 end)`,
      })
      .from(todaysDeals)
      .where(and(...filterConditions));

    const row = rows[0] ?? {
      count50: 0,
      count25: 0,
      count10: 0,
      count5: 0,
    };

    const countsByValue = new Map<number, number>([
      [50, Number(row.count50) || 0],
      [25, Number(row.count25) || 0],
      [10, Number(row.count10) || 0],
      [5, Number(row.count5) || 0],
    ]);

    const options: DealsDiscountOption[] = DEALS_DISCOUNT_OPTIONS.map(
      (option) => ({
        value: option.value,
        label: option.label,
        count: countsByValue.get(option.value) ?? 0,
      })
    );

    return NextResponse.json(options);
  } catch (error) {
    Sentry.logger.error("[api/deals/discounts] Failed to load discounts", { error });
    return NextResponse.json(
      { message: "Unable to load discounts at the moment." },
      { status: 500 }
    );
  }
}

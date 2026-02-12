import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { getDeals, parseShopId } from "@/lib/deals";
import {
  DEALS_DEFAULT_SORT,
  DEALS_DESKTOP_PAGE_SIZE,
  DEALS_MAX_LIMIT,
  isDealsSort,
} from "@/types/deals";

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
  const offsetParam = searchParams.get("offset");
  const limitParam = searchParams.get("limit");
  const shopIdParam = searchParams.get("shop_id");
  const shopIdsParam = searchParams.get("shop_ids");
  const sortParam = searchParams.get("sort");
  const groupIdsParam = searchParams.get("group_ids");
  const minPriceParam = searchParams.get("min_price");
  const maxPriceParam = searchParams.get("max_price");
  const minDropParam = searchParams.get("min_drop");

  const shopIdValue = parseShopId(shopIdParam ?? undefined);
  const shopIds = parseCommaSeparatedInts(shopIdsParam);

  if (shopIdParam && shopIdValue === null && shopIds.length === 0) {
    return NextResponse.json(
      { message: "Invalid shop id." },
      { status: 400 }
    );
  }

  const offsetRaw = offsetParam ? Number(offsetParam) : 0;
  const limitRaw = limitParam ? Number(limitParam) : DEALS_DESKTOP_PAGE_SIZE;

  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, limitRaw), DEALS_MAX_LIMIT)
    : DEALS_DESKTOP_PAGE_SIZE;
  const sort = isDealsSort(sortParam) ? sortParam : DEALS_DEFAULT_SORT;
  const groupIds = parseCommaSeparatedInts(groupIdsParam);
  const minPrice = parsePriceParam(minPriceParam, { allowZero: true });
  const maxPrice = parsePriceParam(maxPriceParam);
  const minDrop = parseMinDropParam(minDropParam);

  const filters = {
    shopIds:
      shopIds.length > 0 || typeof shopIdValue === "number"
        ? Array.from(
            new Set([
              ...shopIds,
              ...(typeof shopIdValue === "number" ? [shopIdValue] : []),
            ])
          )
        : undefined,
    groupIds: groupIds.length > 0 ? groupIds : undefined,
    minPrice: minPrice !== null ? minPrice : undefined,
    maxPrice: maxPrice !== null ? maxPrice : undefined,
    minDrop: minDrop !== null ? minDrop : undefined,
  };

  try {
    const result = await getDeals({
      offset,
      limit,
      sort,
      filters,
    });

    return NextResponse.json(result);
  } catch (error) {
    Sentry.logger.error("[api/deals] Failed to load deals", { error });
    return NextResponse.json(
      { message: "Unable to load deals at the moment." },
      { status: 500 }
    );
  }
}

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { getGroupProducts } from "@/lib/group-products";
import {
  GROUP_EXPLORER_DEFAULT_SORT,
  GROUP_EXPLORER_DESKTOP_PAGE_SIZE,
  GROUP_EXPLORER_MAX_LIMIT,
  isGroupExplorerSort,
  type GroupExplorerFilters,
} from "@/types/group-explorer";

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

function parseCommaSeparatedStrings(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => decodeURIComponent(v.trim()))
    .filter((s) => s.length > 0);
}

export async function GET(request: Request, { params }: RouteParams) {
  const { searchParams } = new URL(request.url);
  const offsetParam = searchParams.get("offset");
  const limitParam = searchParams.get("limit");
  const sortParam = searchParams.get("sort");
  const { group_human_id } = await params;

  // Parse filter params
  const shopIdsParam = searchParams.get("shop_ids");
  const unitsParam = searchParams.get("units");
  const minPriceParam = searchParams.get("min_price");
  const maxPriceParam = searchParams.get("max_price");

  const offsetRaw = offsetParam ? Number(offsetParam) : 0;
  const limitRaw = limitParam ? Number(limitParam) : GROUP_EXPLORER_DESKTOP_PAGE_SIZE;

  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, limitRaw), GROUP_EXPLORER_MAX_LIMIT)
    : GROUP_EXPLORER_DESKTOP_PAGE_SIZE;
  const sort = isGroupExplorerSort(sortParam)
    ? sortParam
    : GROUP_EXPLORER_DEFAULT_SORT;

  // Build filters object
  const filters: GroupExplorerFilters = {};

  const shopIds = parseCommaSeparatedInts(shopIdsParam);
  if (shopIds.length > 0) {
    filters.shopIds = shopIds;
  }

  const units = parseCommaSeparatedStrings(unitsParam);
  if (units.length > 0) {
    filters.units = units;
  }

  const minPrice = minPriceParam ? Number(minPriceParam) : undefined;
  if (minPrice !== undefined && Number.isFinite(minPrice) && minPrice >= 0) {
    filters.minPrice = minPrice;
  }

  const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined;
  if (maxPrice !== undefined && Number.isFinite(maxPrice) && maxPrice > 0) {
    filters.maxPrice = maxPrice;
  }

  try {
    const result = await getGroupProducts({
      humanId: group_human_id,
      offset,
      limit,
      sort,
      filters,
    });

    if (!result) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    Sentry.logger.error("[api/groups/products] Failed to load products", { error });
    return NextResponse.json(
      { message: "Unable to load products at the moment." },
      { status: 500 }
    );
  }
}

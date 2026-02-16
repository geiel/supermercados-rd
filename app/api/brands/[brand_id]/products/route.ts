import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { getBrandProducts, getVisibleBrandById } from "@/lib/brand-products";
import {
  BRAND_EXPLORER_DEFAULT_SORT,
  BRAND_EXPLORER_DESKTOP_PAGE_SIZE,
  BRAND_EXPLORER_MAX_LIMIT,
  isBrandExplorerSort,
  type BrandExplorerFilters,
} from "@/types/brand-explorer";

type RouteParams = {
  params: Promise<{
    brand_id: string;
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

function parseMinDropParam(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 0 ? parsed : null;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { searchParams } = new URL(request.url);
  const { brand_id } = await params;

  const brandId = Number(brand_id);
  if (!Number.isFinite(brandId) || brandId <= 0) {
    return NextResponse.json({ message: "Invalid brand id." }, { status: 400 });
  }

  const brand = await getVisibleBrandById(brandId);
  if (!brand) {
    return NextResponse.json({ message: "Brand not found." }, { status: 404 });
  }

  const offsetParam = searchParams.get("offset");
  const limitParam = searchParams.get("limit");
  const sortParam = searchParams.get("sort");

  const shopIdsParam = searchParams.get("shop_ids");
  const groupIdsParam = searchParams.get("group_ids");
  const minPriceParam = searchParams.get("min_price");
  const maxPriceParam = searchParams.get("max_price");
  const minDropParam = searchParams.get("min_drop");

  const offsetRaw = offsetParam ? Number(offsetParam) : 0;
  const limitRaw = limitParam ? Number(limitParam) : BRAND_EXPLORER_DESKTOP_PAGE_SIZE;

  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, limitRaw), BRAND_EXPLORER_MAX_LIMIT)
    : BRAND_EXPLORER_DESKTOP_PAGE_SIZE;

  const sort = isBrandExplorerSort(sortParam)
    ? sortParam
    : BRAND_EXPLORER_DEFAULT_SORT;

  const filters: BrandExplorerFilters = {};

  const shopIds = parseCommaSeparatedInts(shopIdsParam);
  if (shopIds.length > 0) {
    filters.shopIds = shopIds;
  }

  const groupIds = parseCommaSeparatedInts(groupIdsParam);
  if (groupIds.length > 0) {
    filters.groupIds = groupIds;
  }

  const minPrice = parsePriceParam(minPriceParam, { allowZero: true });
  if (minPrice !== null) {
    filters.minPrice = minPrice;
  }

  const maxPrice = parsePriceParam(maxPriceParam);
  if (maxPrice !== null) {
    filters.maxPrice = maxPrice;
  }

  const minDrop = parseMinDropParam(minDropParam);
  if (minDrop !== null) {
    filters.minDrop = minDrop;
  }

  try {
    const result = await getBrandProducts({
      brandId,
      offset,
      limit,
      sort,
      filters,
    });

    return NextResponse.json(result);
  } catch (error) {
    Sentry.logger.error("[api/brands/products] Failed to load brand products", {
      error,
    });

    return NextResponse.json(
      { message: "Unable to load products at the moment." },
      { status: 500 }
    );
  }
}

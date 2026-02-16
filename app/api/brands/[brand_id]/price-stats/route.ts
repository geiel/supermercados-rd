import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { and, eq, gte, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  products,
  productsGroups,
  productsShopsPrices,
  todaysDeals,
} from "@/db/schema";
import { getVisibleBrandById } from "@/lib/brand-products";
import { formatPriceValue } from "@/lib/price-format";
import type {
  DealsPriceStatsBucket,
  DealsPriceStatsResponse,
} from "@/types/deals";

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

function parseMinDropParam(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 0 ? parsed : null;
}

const NUM_BUCKETS = 15;
const LOG_RATIO_THRESHOLD = 25;
const OUTLIER_MULTIPLIER = 1.5;

function shouldUseLogBuckets(prices: number[], minPrice: number, maxPrice: number) {
  if (prices.length < NUM_BUCKETS) return false;
  if (minPrice <= 0 || maxPrice <= 0) return false;
  if (maxPrice / minPrice < LOG_RATIO_THRESHOLD) return false;
  const p95Index = Math.floor(prices.length * 0.95);
  const p95 = prices[p95Index] ?? maxPrice;
  return maxPrice > p95 * OUTLIER_MULTIPLIER;
}

function buildBuckets(
  prices: number[],
  minPrice: number,
  maxPrice: number
): { buckets: DealsPriceStatsBucket[]; scale: "linear" | "log" } {
  const buckets: DealsPriceStatsBucket[] = [];
  const range = maxPrice - minPrice;

  if (range === 0) {
    buckets.push({
      rangeStart: minPrice,
      rangeEnd: maxPrice,
      count: prices.length,
    });

    return { buckets, scale: "linear" };
  }

  const useLogBuckets = shouldUseLogBuckets(prices, minPrice, maxPrice);

  if (useLogBuckets) {
    const logMin = Math.log(minPrice);
    const logMax = Math.log(maxPrice);
    const logBucketSize = (logMax - logMin) / NUM_BUCKETS;

    for (let i = 0; i < NUM_BUCKETS; i++) {
      const rangeStart = Math.exp(logMin + i * logBucketSize);
      const rangeEnd =
        i === NUM_BUCKETS - 1
          ? maxPrice
          : Math.exp(logMin + (i + 1) * logBucketSize);

      const count = prices.filter((price) => {
        if (i === NUM_BUCKETS - 1) {
          return price >= rangeStart && price <= rangeEnd;
        }

        return price >= rangeStart && price < rangeEnd;
      }).length;

      const roundedStart = Math.round(rangeStart);
      const roundedEnd = Math.round(rangeEnd);
      const safeStart = Math.min(roundedStart, roundedEnd);
      const safeEnd = Math.max(roundedStart, roundedEnd);

      buckets.push({
        rangeStart: safeStart,
        rangeEnd: safeEnd,
        count,
      });
    }

    return { buckets, scale: "log" };
  }

  const bucketSize = range / NUM_BUCKETS;

  for (let i = 0; i < NUM_BUCKETS; i++) {
    const rangeStart = minPrice + i * bucketSize;
    const rangeEnd =
      i === NUM_BUCKETS - 1 ? maxPrice : minPrice + (i + 1) * bucketSize;

    const count = prices.filter((price) => {
      if (i === NUM_BUCKETS - 1) {
        return price >= rangeStart && price <= rangeEnd;
      }

      return price >= rangeStart && price < rangeEnd;
    }).length;

    buckets.push({
      rangeStart: Math.round(rangeStart),
      rangeEnd: Math.round(rangeEnd),
      count,
    });
  }

  return { buckets, scale: "linear" };
}

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
  const groupIdsParam = searchParams.get("group_ids");
  const minDropParam = searchParams.get("min_drop");

  const shopIds = parseCommaSeparatedInts(shopIdsParam);
  const groupIds = parseCommaSeparatedInts(groupIdsParam);
  const minDrop = parseMinDropParam(minDropParam);

  try {
    const priceFilterConditions = [
      isNotNull(productsShopsPrices.currentPrice),
      or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false)),
    ];

    if (shopIds.length > 0) {
      priceFilterConditions.push(inArray(productsShopsPrices.shopId, shopIds));
    }
    const priceFilters = and(...priceFilterConditions);

    const productConditions = [
      eq(products.brandId, brandId),
      or(isNull(products.deleted), eq(products.deleted, false)),
    ];

    if (groupIds.length > 0) {
      const groupProducts = db
        .select({ productId: productsGroups.productId })
        .from(productsGroups)
        .where(inArray(productsGroups.groupId, groupIds));

      productConditions.push(inArray(products.id, groupProducts));
    }

    if (minDrop !== null) {
      const discountConditions = [gte(todaysDeals.dropPercentage, String(minDrop))];
      if (shopIds.length > 0) {
        discountConditions.push(inArray(todaysDeals.shopId, shopIds));
      }
      const discountedProducts = db
        .select({ productId: todaysDeals.productId })
        .from(todaysDeals)
        .where(and(...discountConditions));
      productConditions.push(inArray(products.id, discountedProducts));
    }

    const priceRows = await db
      .select({
        productId: products.id,
        minPrice: sql<string>`min(${productsShopsPrices.currentPrice})`.as("minPrice"),
      })
      .from(products)
      .innerJoin(
        productsShopsPrices,
        and(eq(productsShopsPrices.productId, products.id), priceFilters)
      )
      .where(and(...productConditions))
      .groupBy(products.id);

    if (priceRows.length === 0) {
      return NextResponse.json({
        min: 0,
        max: 0,
        buckets: [],
        quickFilters: [],
        scale: "linear",
      } satisfies DealsPriceStatsResponse);
    }

    const prices = priceRows
      .map((row) => Number(row.minPrice))
      .filter((price) => Number.isFinite(price) && price > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) {
      return NextResponse.json({
        min: 0,
        max: 0,
        buckets: [],
        quickFilters: [],
        scale: "linear",
      } satisfies DealsPriceStatsResponse);
    }

    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];
    const { buckets, scale } = buildBuckets(prices, minPrice, maxPrice);

    const quickFilters = calculateQuickFilters(prices, minPrice, maxPrice);

    return NextResponse.json({
      min: Math.round(minPrice),
      max: Math.round(maxPrice),
      buckets,
      quickFilters,
      scale,
    } satisfies DealsPriceStatsResponse);
  } catch (error) {
    Sentry.logger.error("[api/brands/price-stats] Failed to load price stats", {
      error,
    });

    return NextResponse.json(
      { message: "Unable to load price stats at the moment." },
      { status: 500 }
    );
  }
}

function calculateQuickFilters(prices: number[], min: number, max: number) {
  const total = prices.length;
  const p33Index = Math.floor(total * 0.33);
  const p66Index = Math.floor(total * 0.66);

  const lowThreshold = prices[p33Index] || min;
  const highThreshold = prices[p66Index] || max;

  const roundedLow = roundToNiceNumber(lowThreshold);
  const roundedHigh = roundToNiceNumber(highThreshold);

  const lowCount = prices.filter((price) => price <= roundedLow).length;
  const midCount = prices.filter(
    (price) => price > roundedLow && price <= roundedHigh
  ).length;
  const highCount = prices.filter((price) => price > roundedHigh).length;

  return [
    {
      label: `Hasta RD$${formatPrice(roundedLow)}`,
      minPrice: null,
      maxPrice: roundedLow,
      count: lowCount,
    },
    {
      label: `RD$${formatPrice(roundedLow)} - RD$${formatPrice(roundedHigh)}`,
      minPrice: roundedLow,
      maxPrice: roundedHigh,
      count: midCount,
    },
    {
      label: `RD$${formatPrice(roundedHigh)} o mas`,
      minPrice: roundedHigh,
      maxPrice: null,
      count: highCount,
    },
  ];
}

function roundToNiceNumber(value: number): number {
  if (value <= 50) return Math.round(value / 5) * 5;
  if (value <= 100) return Math.round(value / 10) * 10;
  if (value <= 500) return Math.round(value / 25) * 25;
  if (value <= 1000) return Math.round(value / 50) * 50;
  return Math.round(value / 100) * 100;
}

function formatPrice(value: number): string {
  return formatPriceValue(value);
}

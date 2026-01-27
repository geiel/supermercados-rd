import { NextResponse } from "next/server";
import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  products,
  productsGroups,
  productsShopsPrices,
} from "@/db/schema";
import type { PriceStatsResponse, PriceStatsBucket } from "@/types/group-explorer";

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

const NUM_BUCKETS = 15;

export async function GET(request: Request, { params }: RouteParams) {
  const { group_human_id } = await params;
  const { searchParams } = new URL(request.url);
  const shopIdsParam = searchParams.get("shop_ids");
  const unitsParam = searchParams.get("units");

  const shopIds = parseCommaSeparatedInts(shopIdsParam);
  const units = parseCommaSeparatedStrings(unitsParam);

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
    const priceFilterConditions = [
      isNotNull(productsShopsPrices.currentPrice),
      or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false)),
    ];

    if (shopIds.length > 0) {
      priceFilterConditions.push(
        inArray(productsShopsPrices.shopId, shopIds)
      );
    }

    const priceFilters = and(...priceFilterConditions);
    const productFilterConditions = [eq(productsGroups.groupId, group.id)];

    if (units.length > 0) {
      productFilterConditions.push(inArray(products.unit, units));
    }

    // Get min price for each product in the group
    const priceRows = await db
      .select({
        productId: products.id,
        minPrice: sql<string>`min(${productsShopsPrices.currentPrice})`.as("minPrice"),
      })
      .from(productsGroups)
      .innerJoin(products, eq(products.id, productsGroups.productId))
      .innerJoin(
        productsShopsPrices,
        and(eq(productsShopsPrices.productId, products.id), priceFilters)
      )
      .where(and(...productFilterConditions))
      .groupBy(products.id);

    if (priceRows.length === 0) {
      return NextResponse.json({
        min: 0,
        max: 0,
        buckets: [],
        quickFilters: [],
      } satisfies PriceStatsResponse);
    }

    // Extract prices as numbers
    const prices = priceRows
      .map((row) => Number(row.minPrice))
      .filter((p) => Number.isFinite(p) && p > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) {
      return NextResponse.json({
        min: 0,
        max: 0,
        buckets: [],
        quickFilters: [],
      } satisfies PriceStatsResponse);
    }

    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];
    const range = maxPrice - minPrice;

    // Create buckets for histogram
    const buckets: PriceStatsBucket[] = [];
    
    if (range === 0) {
      // All products have the same price
      buckets.push({
        rangeStart: minPrice,
        rangeEnd: maxPrice,
        count: prices.length,
      });
    } else {
      const bucketSize = range / NUM_BUCKETS;
      
      for (let i = 0; i < NUM_BUCKETS; i++) {
        const rangeStart = minPrice + i * bucketSize;
        const rangeEnd = i === NUM_BUCKETS - 1 ? maxPrice : minPrice + (i + 1) * bucketSize;
        
        const count = prices.filter((p) => {
          if (i === NUM_BUCKETS - 1) {
            return p >= rangeStart && p <= rangeEnd;
          }
          return p >= rangeStart && p < rangeEnd;
        }).length;

        buckets.push({
          rangeStart: Math.round(rangeStart),
          rangeEnd: Math.round(rangeEnd),
          count,
        });
      }
    }

    // Calculate quick filter ranges based on price distribution
    const quickFilters = calculateQuickFilters(prices, minPrice, maxPrice);

    const response: PriceStatsResponse = {
      min: Math.round(minPrice),
      max: Math.round(maxPrice),
      buckets,
      quickFilters,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/groups/price-stats] Failed to load price stats", error);
    return NextResponse.json(
      { message: "Unable to load price stats at the moment." },
      { status: 500 }
    );
  }
}

function calculateQuickFilters(prices: number[], min: number, max: number) {
  const total = prices.length;
  
  // Calculate percentile-based thresholds
  const p33Index = Math.floor(total * 0.33);
  const p66Index = Math.floor(total * 0.66);
  
  const lowThreshold = prices[p33Index] || min;
  const highThreshold = prices[p66Index] || max;
  
  // Round to nice numbers
  const roundedLow = roundToNiceNumber(lowThreshold);
  const roundedHigh = roundToNiceNumber(highThreshold);

  // Count products in each range
  const lowCount = prices.filter((p) => p <= roundedLow).length;
  const midCount = prices.filter((p) => p > roundedLow && p <= roundedHigh).length;
  const highCount = prices.filter((p) => p > roundedHigh).length;

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
      label: `RD$${formatPrice(roundedHigh)} o más`,
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
  return value.toLocaleString("es-DO");
}

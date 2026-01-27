import "server-only";

import { and, asc, desc, eq, gt, gte, inArray, lte, SQL, sql } from "drizzle-orm";

import { db } from "@/db";
import { products, productsGroups, todaysDeals } from "@/db/schema";
import {
  DEALS_DEFAULT_SORT,
  type DealsFilters,
  type DealsResponse,
  type DealsSort,
} from "@/types/deals";

type GetDealsOptions = {
  offset?: number;
  limit: number;
  sort?: DealsSort;
  filters?: DealsFilters;
};

export async function getDeals({
  offset = 0,
  limit,
  sort = DEALS_DEFAULT_SORT,
  filters = {},
}: GetDealsOptions): Promise<DealsResponse> {
  "use cache";

  const { shopIds, groupIds, minPrice, maxPrice, minDrop } = filters;
  const filterConditions: SQL<unknown>[] = [];

  if (shopIds && shopIds.length > 0) {
    filterConditions.push(inArray(todaysDeals.shopId, shopIds));
  }

  if (groupIds && groupIds.length > 0) {
    const groupProducts = db
      .select({ productId: productsGroups.productId })
      .from(productsGroups)
      .where(inArray(productsGroups.groupId, groupIds));
    filterConditions.push(inArray(todaysDeals.productId, groupProducts));
  }

  if (minPrice !== undefined && minPrice !== null) {
    filterConditions.push(gte(todaysDeals.priceToday, String(minPrice)));
  }

  if (maxPrice !== undefined && maxPrice !== null) {
    filterConditions.push(lte(todaysDeals.priceToday, String(maxPrice)));
  }

  if (minDrop !== undefined && minDrop !== null) {
    filterConditions.push(gte(todaysDeals.dropPercentage, String(minDrop)));
  }

  const where = and(...filterConditions);

  const totalRows = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(todaysDeals)
    .innerJoin(products, eq(products.id, todaysDeals.productId))
    .where(where);

  const total = Number(totalRows[0]?.count ?? 0);

  const orderBy = (() => {
    switch (sort) {
      case "lowest_price":
        return [
          asc(todaysDeals.priceToday),
          desc(todaysDeals.dropPercentage),
          desc(todaysDeals.rank),
        ];
      case "highest_price":
        return [
          desc(todaysDeals.priceToday),
          desc(todaysDeals.dropPercentage),
          desc(todaysDeals.rank),
        ];
      case "most_recent":
        return [
          desc(todaysDeals.dateWasSet),
          desc(todaysDeals.dropPercentage),
          desc(todaysDeals.rank),
        ];
      case "relevance":
        return [desc(todaysDeals.rank), desc(todaysDeals.dropPercentage)];
      case "highest_discount":
      default:
        return [desc(todaysDeals.dropPercentage), desc(todaysDeals.rank)];
    }
  })();

  const dealRows = await db
    .select({
      productId: todaysDeals.productId,
      name: todaysDeals.name,
      unit: todaysDeals.unit,
      image: todaysDeals.image,
      rank: todaysDeals.rank,
      brandName: todaysDeals.brandName,
      possibleBrandName: todaysDeals.possibleBrandName,
      priceBeforeToday: todaysDeals.priceBeforeToday,
      priceToday: todaysDeals.priceToday,
      dropAmount: todaysDeals.dropAmount,
      dropPercentage: todaysDeals.dropPercentage,
      shopId: todaysDeals.shopId,
      amountOfShops: todaysDeals.amountOfShops,
      categoryId: products.categoryId,
    })
    .from(todaysDeals)
    .innerJoin(products, eq(products.id, todaysDeals.productId))
    .where(where)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  const deals = dealRows.map((row) => ({
    productId: row.productId,
    name: row.name,
    unit: row.unit,
    image: row.image,
    rank: row.rank,
    brandName: row.brandName,
    possibleBrandName: row.possibleBrandName,
    priceBeforeToday: row.priceBeforeToday,
    priceToday: row.priceToday,
    dropAmount: row.dropAmount,
    dropPercentage: row.dropPercentage,
    shopId: row.shopId,
    amountOfShops: row.amountOfShops,
    product: row.categoryId ? { categoryId: row.categoryId } : null,
  }));

  return {
    deals,
    total,
    nextOffset: offset + deals.length,
  };
}

export function parseShopId(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

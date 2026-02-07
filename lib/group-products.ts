import "server-only";

import { and, asc, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  groups,
  products,
  productsBrands,
  productsGroups,
  productsShopsPrices,
  todaysDeals,
} from "@/db/schema";
import type {
  GroupExplorerChildGroup,
  GroupExplorerFilters,
  GroupExplorerProduct,
  GroupExplorerResponse,
  GroupExplorerSort,
} from "@/types/group-explorer";
import { GROUP_EXPLORER_DEFAULT_SORT } from "@/types/group-explorer";
import { parseUnitWithGroupConversion, type Measurement } from "@/lib/unit-utils";
import { inArray } from "drizzle-orm";

type GetGroupProductsOptions = {
  humanId: string;
  offset?: number;
  limit: number;
  sort?: GroupExplorerSort;
  filters?: GroupExplorerFilters;
};

type GroupRow = {
  id: number;
  name: string;
  humanNameId: string;
  cheaperProductId: number | null;
  compareBy: string | null;
  isComparable: boolean;
  imageUrl: string | null;
};

export async function getGroupProducts({
  humanId,
  offset = 0,
  limit,
  sort = GROUP_EXPLORER_DEFAULT_SORT,
  filters = {},
}: GetGroupProductsOptions): Promise<GroupExplorerResponse | null> {
  const { shopIds, units, minPrice, maxPrice } = filters;

  const group = (await db.query.groups.findFirst({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
      cheaperProductId: true,
      compareBy: true,
      isComparable: true,
      imageUrl: true,
    },
    where: (groups, { eq }) => eq(groups.humanNameId, humanId),
  })) as GroupRow | undefined;

  if (!group) {
    return null;
  }

  // Fetch child groups that have at least one visible product.
  const childGroupsRows = await db
    .select({
      id: groups.id,
      name: groups.name,
      humanNameId: groups.humanNameId,
      isComparable: groups.isComparable,
      imageUrl: groups.imageUrl,
    })
    .from(groups)
    .innerJoin(productsGroups, eq(productsGroups.groupId, groups.id))
    .innerJoin(
      products,
      and(
        eq(products.id, productsGroups.productId),
        or(isNull(products.deleted), eq(products.deleted, false))
      )
    )
    .innerJoin(
      productsShopsPrices,
      and(
        eq(productsShopsPrices.productId, products.id),
        isNotNull(productsShopsPrices.currentPrice),
        or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false))
      )
    )
    .where(eq(groups.parentGroupId, group.id))
    .groupBy(
      groups.id,
      groups.name,
      groups.humanNameId,
      groups.isComparable,
      groups.imageUrl
    )
    .orderBy(asc(groups.name));

  const childGroups: GroupExplorerChildGroup[] = childGroupsRows.map((row) => ({
    id: row.id,
    name: row.name,
    humanNameId: row.humanNameId,
    isComparable: row.isComparable,
    imageUrl: row.imageUrl,
  }));

  // Build price filters with optional shop filtering
  const priceFilterConditions = [
    isNotNull(productsShopsPrices.currentPrice),
    or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false)),
  ];

  // Add shop filter if provided
  if (shopIds && shopIds.length > 0) {
    priceFilterConditions.push(inArray(productsShopsPrices.shopId, shopIds));
  }

  const priceFilters = and(...priceFilterConditions);

  // Build product filters
  const productFilterConditions = [
    eq(productsGroups.groupId, group.id),
    or(isNull(products.deleted), eq(products.deleted, false)),
  ];

  // Add unit filter if provided
  if (units && units.length > 0) {
    productFilterConditions.push(inArray(products.unit, units));
  }

  const productFilters = and(...productFilterConditions);

  // Build HAVING clause for price range
  const minCurrentPrice = sql<string>`min(${productsShopsPrices.currentPrice})`;
  const havingConditions: ReturnType<typeof sql>[] = [];

  if (minPrice !== undefined && minPrice !== null) {
    havingConditions.push(sql`${minCurrentPrice} >= ${minPrice}`);
  }
  if (maxPrice !== undefined && maxPrice !== null) {
    havingConditions.push(sql`${minCurrentPrice} <= ${maxPrice}`);
  }

  const havingClause = havingConditions.length > 0 
    ? sql.join(havingConditions, sql` AND `)
    : undefined;

  // Apply HAVING clause for price range in count
  let totalRows: { count: number }[];
  if (havingClause) {
    totalRows = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(
        db
          .select({ productId: products.id })
          .from(productsGroups)
          .innerJoin(products, eq(products.id, productsGroups.productId))
          .innerJoin(
            productsShopsPrices,
            and(eq(productsShopsPrices.productId, products.id), priceFilters)
          )
          .where(productFilters)
          .groupBy(products.id)
          .having(havingClause)
          .as("filtered_products")
      );
  } else {
    totalRows = await db
      .select({
        count: sql<number>`count(distinct ${products.id})`,
      })
      .from(productsGroups)
      .innerJoin(products, eq(products.id, productsGroups.productId))
      .innerJoin(
        productsShopsPrices,
        and(eq(productsShopsPrices.productId, products.id), priceFilters)
      )
      .where(productFilters);
  }

  const total = Number(totalRows[0]?.count ?? 0);

  const pBrand = alias(productsBrands, "possible_brand");
  const relevanceRank = sql<number>`coalesce(${products.rank}, 0)`;

  // For best_value sorting, we need to handle it differently based on measurement type
  // We'll use SQL for non-best_value sorts, and JS sorting for best_value
  const isBestValueSort = sort === "best_value";

  const orderBy = (() => {
    switch (sort) {
      case "highest_price":
        return [desc(minCurrentPrice), asc(products.id)];
      case "best_value":
        // For best_value, we'll fetch more rows and sort in JS to properly handle measurement types
        // Default to lowest_price order in SQL, then re-sort in JS
        return [asc(minCurrentPrice), asc(products.id)];
      case "relevance":
        return [desc(relevanceRank), asc(minCurrentPrice), asc(products.id)];
      case "lowest_price":
      default:
        return [asc(minCurrentPrice), asc(products.id)];
    }
  })();

  // For best_value sort, we need to fetch all products to properly compare by measurement type
  const fetchLimit = isBestValueSort ? 1000 : limit;
  const fetchOffset = isBestValueSort ? 0 : offset;

  // Build the main query with filters
  const baseQuery = db
    .select({
      productId: products.id,
      productName: products.name,
      productImage: products.image,
      productUnit: products.unit,
      productCategory: products.categoryId,
      productBrand: {
        id: productsBrands.id,
        name: productsBrands.name,
      },
      possibleBrand: {
        id: pBrand.id,
        name: pBrand.name,
      },
      currentPrice: minCurrentPrice.as("currentPrice"),
      dealDropPercentage: todaysDeals.dropPercentage,
    })
    .from(productsGroups)
    .innerJoin(products, eq(products.id, productsGroups.productId))
    .innerJoin(
      productsShopsPrices,
      and(eq(productsShopsPrices.productId, products.id), priceFilters)
    )
    .innerJoin(productsBrands, eq(products.brandId, productsBrands.id))
    .leftJoin(pBrand, eq(products.possibleBrandId, pBrand.id))
    .leftJoin(todaysDeals, eq(todaysDeals.productId, products.id))
    .where(productFilters)
    .groupBy(
      products.id,
      products.name,
      products.image,
      products.unit,
      products.categoryId,
      products.rank,
      products.baseUnitAmount,
      productsBrands.id,
      productsBrands.name,
      pBrand.id,
      pBrand.name,
      todaysDeals.dropPercentage
    );

  // Add HAVING clause if price range filters are set
  const queryWithHaving = havingClause 
    ? baseQuery.having(havingClause)
    : baseQuery;

  const rows = await queryWithHaving
    .orderBy(...orderBy)
    .limit(fetchLimit)
    .offset(fetchOffset);

  let processedRows = rows;

  // For best_value sort, we need to sort by unit price within compatible measurement types
  if (isBestValueSort) {
    type ParsedProduct = {
      row: (typeof rows)[0];
      parsed: ReturnType<typeof parseUnitWithGroupConversion>;
      measurement: Measurement | null;
      unitPrice: number | null;
    };

    // Parse all products and calculate unit prices (with group-specific conversions)
    const parsedProducts: ParsedProduct[] = rows.map((row) => {
      const parsed = parseUnitWithGroupConversion(row.productUnit, humanId);
      const price = Number(row.currentPrice);
      const unitPrice =
        parsed && Number.isFinite(price) && parsed.base > 0
          ? price / parsed.base
          : null;

      return {
        row,
        parsed,
        measurement: parsed?.measurement ?? null,
        unitPrice,
      };
    });

    // Determine the target measurement type
    // If group has compareBy set, use that preference
    // Otherwise, pick the measurement type with the most products that have valid unit prices
    type ComparableType = "measure" | "count";

    const getComparableType = (m: Measurement | null): ComparableType | null => {
      if (!m) return null;
      return m === "count" ? "count" : "measure";
    };

    const wantsCount =
      typeof group.compareBy === "string" &&
      group.compareBy.toLowerCase() === "count";

    // Count products by comparable type
    const countByType: Record<ComparableType, number> = { measure: 0, count: 0 };
    for (const p of parsedProducts) {
      if (p.unitPrice !== null && p.measurement) {
        const type = getComparableType(p.measurement);
        if (type) countByType[type]++;
      }
    }

    // Select the target type
    let targetType: ComparableType;
    if (wantsCount && countByType.count > 0) {
      targetType = "count";
    } else if (countByType.measure > countByType.count) {
      targetType = "measure";
    } else if (countByType.count > 0) {
      targetType = "count";
    } else {
      targetType = "measure";
    }

    // Sort products:
    // 1. Products with matching measurement type and valid unit price first
    // 2. Then products without valid unit price
    // 3. Sort by unit price within each group
    parsedProducts.sort((a, b) => {
      const aMatchesType = getComparableType(a.measurement) === targetType;
      const bMatchesType = getComparableType(b.measurement) === targetType;
      const aHasUnitPrice = a.unitPrice !== null;
      const bHasUnitPrice = b.unitPrice !== null;

      // Products matching target type with valid unit price come first
      const aValid = aMatchesType && aHasUnitPrice;
      const bValid = bMatchesType && bHasUnitPrice;

      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;

      // Both have valid unit prices for target type - sort by unit price
      if (aValid && bValid) {
        const diff = (a.unitPrice ?? 0) - (b.unitPrice ?? 0);
        if (Math.abs(diff) > 1e-9) return diff;
        // Tie-breaker: lower price
        return Number(a.row.currentPrice) - Number(b.row.currentPrice);
      }

      // Neither has valid unit price - sort by price
      return Number(a.row.currentPrice) - Number(b.row.currentPrice);
    });

    // Apply pagination after sorting
    processedRows = parsedProducts
      .slice(offset, offset + limit)
      .map((p) => p.row);
  }

  const productsList: GroupExplorerProduct[] = processedRows.map((row) => ({
    id: row.productId,
    name: row.productName,
    image: row.productImage,
    unit: row.productUnit,
    categoryId: row.productCategory,
    brand: row.productBrand,
    possibleBrand: row.possibleBrand?.id ? row.possibleBrand : null,
    currentPrice: row.currentPrice,
    isCheaper: row.productId === group.cheaperProductId,
    productDeal:
      row.dealDropPercentage === null || row.dealDropPercentage === undefined
        ? null
        : { dropPercentage: row.dealDropPercentage },
  }));

  return {
    group: {
      id: group.id,
      name: group.name,
      humanId: group.humanNameId,
      cheaperProductId: group.cheaperProductId,
      isComparable: group.isComparable,
      imageUrl: group.imageUrl,
    },
    products: productsList,
    childGroups,
    total,
    nextOffset: offset + productsList.length,
  };
}

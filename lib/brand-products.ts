import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  products,
  productsBrands,
  productsGroups,
  productsShopsPrices,
  todaysDeals,
} from "@/db/schema";
import {
  BRAND_EXPLORER_DEFAULT_SORT,
  type BrandExplorerFilters,
  type BrandExplorerResponse,
  type BrandExplorerSort,
} from "@/types/brand-explorer";

type GetBrandProductsOptions = {
  brandId: number;
  offset?: number;
  limit: number;
  sort?: BrandExplorerSort;
  filters?: BrandExplorerFilters;
};

export async function getBrandProducts({
  brandId,
  offset = 0,
  limit,
  sort = BRAND_EXPLORER_DEFAULT_SORT,
  filters = {},
}: GetBrandProductsOptions): Promise<BrandExplorerResponse> {
  const { shopIds, groupIds, minPrice, maxPrice, minDrop } = filters;

  const priceFilterConditions = [
    isNotNull(productsShopsPrices.currentPrice),
    or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false)),
  ];

  if (shopIds && shopIds.length > 0) {
    priceFilterConditions.push(inArray(productsShopsPrices.shopId, shopIds));
  }

  const priceFilters = and(...priceFilterConditions);

  const productFilterConditions = [
    eq(products.brandId, brandId),
    or(isNull(products.deleted), eq(products.deleted, false)),
  ];

  if (groupIds && groupIds.length > 0) {
    const groupProducts = db
      .select({ productId: productsGroups.productId })
      .from(productsGroups)
      .where(inArray(productsGroups.groupId, groupIds));

    productFilterConditions.push(inArray(products.id, groupProducts));
  }

  if (minDrop !== undefined && minDrop !== null) {
    const discountConditions = [gte(todaysDeals.dropPercentage, String(minDrop))];

    if (shopIds && shopIds.length > 0) {
      discountConditions.push(inArray(todaysDeals.shopId, shopIds));
    }

    const discountedProducts = db
      .select({ productId: todaysDeals.productId })
      .from(todaysDeals)
      .where(and(...discountConditions));

    productFilterConditions.push(inArray(products.id, discountedProducts));
  }

  const productFilters = and(...productFilterConditions);

  const minCurrentPrice = sql<string>`min(${productsShopsPrices.currentPrice})`;
  const havingConditions: ReturnType<typeof sql>[] = [];

  if (minPrice !== undefined && minPrice !== null) {
    havingConditions.push(sql`${minCurrentPrice} >= ${minPrice}`);
  }

  if (maxPrice !== undefined && maxPrice !== null) {
    havingConditions.push(sql`${minCurrentPrice} <= ${maxPrice}`);
  }

  const havingClause =
    havingConditions.length > 0
      ? sql.join(havingConditions, sql` AND `)
      : undefined;

  let totalRows: { count: number }[];

  if (havingClause) {
    totalRows = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(
        db
          .select({ productId: products.id })
          .from(products)
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
      .from(products)
      .innerJoin(
        productsShopsPrices,
        and(eq(productsShopsPrices.productId, products.id), priceFilters)
      )
      .where(productFilters);
  }

  const total = Number(totalRows[0]?.count ?? 0);

  const pBrand = alias(productsBrands, "possible_brand");
  const relevanceRank = sql<number>`coalesce(${products.rank}, 0)`;
  const discountRank = sql<number>`coalesce(${todaysDeals.dropPercentage}, 0)`;

  const orderBy = (() => {
    switch (sort) {
      case "lowest_price":
        return [asc(minCurrentPrice), desc(relevanceRank), asc(products.id)];
      case "highest_price":
        return [desc(minCurrentPrice), desc(relevanceRank), asc(products.id)];
      case "highest_discount":
        return [desc(discountRank), desc(relevanceRank), asc(minCurrentPrice)];
      case "relevance":
      default:
        return [desc(relevanceRank), asc(minCurrentPrice), asc(products.id)];
    }
  })();

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
    .from(products)
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
      productsBrands.id,
      productsBrands.name,
      pBrand.id,
      pBrand.name,
      todaysDeals.dropPercentage
    );

  const queryWithHaving = havingClause ? baseQuery.having(havingClause) : baseQuery;

  const rows = await queryWithHaving
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  const productsList = rows.map((row) => ({
    id: row.productId,
    name: row.productName,
    image: row.productImage,
    unit: row.productUnit,
    categoryId: row.productCategory,
    brand: row.productBrand,
    possibleBrand: row.possibleBrand?.id ? row.possibleBrand : null,
    currentPrice: row.currentPrice,
    productDeal:
      row.dealDropPercentage === null || row.dealDropPercentage === undefined
        ? null
        : { dropPercentage: row.dealDropPercentage },
  }));

  return {
    products: productsList,
    total,
    nextOffset: offset + productsList.length,
  };
}

export async function getVisibleBrandById(brandId: number) {
  "use cache";

  return await db.query.productsBrands.findFirst({
    columns: {
      id: true,
      name: true,
      brandImage: true,
    },
    where: (brands, { and, eq }) =>
      and(eq(brands.id, brandId), eq(brands.pageVisible, true)),
  });
}

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
} from "@/db/schema";
import type {
  GroupExplorerProduct,
  GroupExplorerResponse,
  GroupExplorerSort,
} from "@/types/group-explorer";
import { GROUP_EXPLORER_DEFAULT_SORT } from "@/types/group-explorer";

type GetGroupProductsOptions = {
  humanId: string;
  offset?: number;
  limit: number;
  sort?: GroupExplorerSort;
};

type GroupRow = {
  id: number;
  name: string;
  humanNameId: string;
  cheaperProductId: number | null;
};

export async function getGroupProducts({
  humanId,
  offset = 0,
  limit,
  sort = GROUP_EXPLORER_DEFAULT_SORT,
}: GetGroupProductsOptions): Promise<GroupExplorerResponse | null> {
  const group = (await db.query.groups.findFirst({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
      cheaperProductId: true,
    },
    where: (groups, { eq }) => eq(groups.humanNameId, humanId),
  })) as GroupRow | undefined;

  if (!group) {
    return null;
  }

  const priceFilters = and(
    isNotNull(productsShopsPrices.currentPrice),
    or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false))
  );

  const totalRows = await db
    .select({
      count: sql<number>`count(distinct ${products.id})`,
    })
    .from(productsGroups)
    .innerJoin(products, eq(products.id, productsGroups.productId))
    .innerJoin(
      productsShopsPrices,
      and(eq(productsShopsPrices.productId, products.id), priceFilters)
    )
    .where(eq(productsGroups.groupId, group.id));

  const total = Number(totalRows[0]?.count ?? 0);

  const pBrand = alias(productsBrands, "possible_brand");
  const minCurrentPrice = sql<string>`min(${productsShopsPrices.currentPrice})`;
  const relevanceRank = sql<number>`coalesce(${products.rank}, 0)`;
  const bestValuePrice = sql<number>`
    ${minCurrentPrice} / nullif(${products.baseUnitAmount}, 0)
  `;

  const orderBy = (() => {
    switch (sort) {
      case "highest_price":
        return [desc(minCurrentPrice), asc(products.id)];
      case "best_value":
        return [
          asc(sql<number>`case when ${bestValuePrice} is null then 1 else 0 end`),
          asc(bestValuePrice),
          asc(minCurrentPrice),
          asc(products.id),
        ];
      case "relevance":
        return [desc(relevanceRank), asc(minCurrentPrice), asc(products.id)];
      case "lowest_price":
      default:
        return [asc(minCurrentPrice), asc(products.id)];
    }
  })();

  const rows = await db
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
    })
    .from(productsGroups)
    .innerJoin(products, eq(products.id, productsGroups.productId))
    .innerJoin(
      productsShopsPrices,
      and(eq(productsShopsPrices.productId, products.id), priceFilters)
    )
    .innerJoin(productsBrands, eq(products.brandId, productsBrands.id))
    .leftJoin(pBrand, eq(products.possibleBrandId, pBrand.id))
    .where(eq(productsGroups.groupId, group.id))
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
      pBrand.name
    )
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  const productsList: GroupExplorerProduct[] = rows.map((row) => ({
    id: row.productId,
    name: row.productName,
    image: row.productImage,
    unit: row.productUnit,
    categoryId: row.productCategory,
    brand: row.productBrand,
    possibleBrand: row.possibleBrand?.id ? row.possibleBrand : null,
    currentPrice: row.currentPrice,
    isCheaper: row.productId === group.cheaperProductId,
  }));

  return {
    group: {
      id: group.id,
      name: group.name,
      humanId: group.humanNameId,
      cheaperProductId: group.cheaperProductId,
    },
    products: productsList,
    total,
    nextOffset: offset + productsList.length,
  };
}

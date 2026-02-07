import "server-only";

import { and, asc, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  categoriesGroups,
  products,
  productsGroups,
  productsShopsPrices,
} from "@/db/schema";

const MAX_PRODUCTS = 20;

export async function getCategoryTopProducts(categoryId: number) {
  const rankOrder = sql<number>`coalesce(${products.rank}, 0)`;

  const productIdsRows = await db
    .select({ id: products.id })
    .from(products)
    .innerJoin(productsGroups, eq(productsGroups.productId, products.id))
    .innerJoin(
      productsShopsPrices,
      and(
        eq(productsShopsPrices.productId, products.id),
        isNotNull(productsShopsPrices.currentPrice),
        or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false))
      )
    )
    .innerJoin(categoriesGroups, eq(categoriesGroups.groupId, productsGroups.groupId))
    .where(
      and(
        eq(categoriesGroups.categoryId, categoryId),
        or(isNull(products.deleted), eq(products.deleted, false))
      )
    )
    .groupBy(products.id, products.rank)
    .orderBy(desc(rankOrder), desc(products.id))
    .limit(MAX_PRODUCTS);

  const productIds = productIdsRows.map((row) => row.id);

  if (productIds.length === 0) {
    return [];
  }

  const productsRows = await db.query.products.findMany({
    where: (products, { inArray }) => inArray(products.id, productIds),
    with: {
      brand: true,
      possibleBrand: true,
      shopCurrentPrices: {
        where: (scp, { isNull, eq, or }) =>
          or(isNull(scp.hidden), eq(scp.hidden, false)),
        orderBy: (prices, { asc }) => [asc(prices.currentPrice)],
      },
      productDeal: true,
    },
  });

  const productById = new Map(productsRows.map((product) => [product.id, product]));
  return productIds.map((id) => productById.get(id)).filter(Boolean);
}

"use server";

import { db } from "@/db";
import { products, productsShopsPrices, shops } from "@/db/schema";
import { SQL, and, desc, eq, inArray, isNull, or } from "drizzle-orm";

export type UrlVisibilityFilter = "hidden" | "visible" | "all";

export type ProductShopUrlRow = {
  productId: number;
  shopId: number;
  shopName: string;
  shopLogo: string;
  productName: string;
  productImage: string | null;
  productUnit: string;
  url: string;
  hidden: boolean | null;
};

export async function fetchProductShopUrls({
  visibility = "hidden",
  shopId,
  productIds,
  limit = 50,
  offset = 0,
}: {
  visibility?: UrlVisibilityFilter;
  shopId?: number;
  productIds?: number[];
  limit?: number;
  offset?: number;
}): Promise<ProductShopUrlRow[]> {
  const conditions: (SQL<unknown> | undefined)[] = [];

  if (visibility === "hidden") {
    conditions.push(eq(productsShopsPrices.hidden, true));
  } else if (visibility === "visible") {
    conditions.push(
      or(eq(productsShopsPrices.hidden, false), isNull(productsShopsPrices.hidden))
    );
  }

  if (shopId) {
    conditions.push(eq(productsShopsPrices.shopId, shopId));
  }

  if (productIds && productIds.length > 0) {
    conditions.push(inArray(productsShopsPrices.productId, productIds));
  }

  const whereClause =
    conditions.length > 0
      ? and(...(conditions.filter(Boolean) as SQL<unknown>[]))
      : undefined;

  const baseQuery = db
    .select({
      productId: productsShopsPrices.productId,
      shopId: productsShopsPrices.shopId,
      url: productsShopsPrices.url,
      hidden: productsShopsPrices.hidden,
      productName: products.name,
      productImage: products.image,
      productUnit: products.unit,
      shopName: shops.name,
      shopLogo: shops.logo,
    })
    .from(productsShopsPrices)
    .innerJoin(products, eq(products.id, productsShopsPrices.productId))
    .innerJoin(shops, eq(shops.id, productsShopsPrices.shopId))
    .orderBy(desc(productsShopsPrices.updateAt), desc(productsShopsPrices.productId))
    .limit(limit)
    .offset(offset);

  const query = whereClause ? baseQuery.where(whereClause) : baseQuery;

  return query;
}

export async function updateProductShopUrl({
  productId,
  shopId,
  url,
}: {
  productId: number;
  shopId: number;
  url: string;
}) {
  const sanitizedUrl = url.trim();

  if (!sanitizedUrl) {
    throw new Error("La URL no puede estar vacía.");
  }

  const result = await db
    .update(productsShopsPrices)
    .set({
      url: sanitizedUrl,
      hidden: false,
      updateAt: new Date(),
    })
    .where(
      and(
        eq(productsShopsPrices.productId, productId),
        eq(productsShopsPrices.shopId, shopId)
      )
    )
    .returning({
      url: productsShopsPrices.url,
      hidden: productsShopsPrices.hidden,
    });

  if (result.length === 0) {
    throw new Error("No se encontró el producto con ese supermercado.");
  }

  return result[0];
}

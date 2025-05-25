"use server";

import { db } from "@/db";
import {
  products,
  productsBrands,
  productsPricesHistory,
  productsShopsPrices,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function adminMergeProduct(
  parentProductId: number,
  childProductId: number
) {
  await db
    .update(productsPricesHistory)
    .set({ productId: parentProductId })
    .where(eq(productsPricesHistory.productId, childProductId));
  await db
    .update(productsShopsPrices)
    .set({
      productId: parentProductId,
    })
    .where(eq(productsShopsPrices.productId, childProductId));

  await db.delete(products).where(eq(products.id, childProductId));
}

export async function getSimilarProducts(categoryId: number) {
  const threshold = 0.4;

  const duplicates = await db
    .select({
      id1: products.id,
      name1: products.name,
      image1: products.image,
      unit1: products.unit,
      brand1Name: sql<string>`b1.name`,
      id2: sql<number>`p2.id`,
      name2: sql<string>`p2.name`,
      image2: sql<string>`p2.image`,
      unit2: sql<string>`p2.unit`,
      brand2Name: sql<string>`b2.name`,
      sml: sql<number>`
      similarity(
        unaccent(lower(${products.name})),
        unaccent(lower(p2.name))
      )
    `.as("sml"),
    })
    .from(products)
    .innerJoin(
      sql`${products} as p2`,
      sql`
        ${products.categoryId} = p2."categoryId"
        AND ${products.brandId} <> p2."brandId"
        AND p2."brandId" = 30
        AND (
            unaccent(lower(${products.name})) = unaccent(lower(p2.name))
          OR similarity(
                unaccent(lower(${products.name})),
                unaccent(lower(p2.name))
            ) > ${threshold}
        )
      `
    )
    .innerJoin(sql`${productsBrands} as b1`, sql`${products.brandId} = b1.id`)
    .innerJoin(sql`${productsBrands} as b2`, sql`p2."brandId" = b2.id`)
    .where(eq(products.categoryId, categoryId))
    .orderBy(sql`sml DESC`)
    .limit(150);

  return duplicates;
}

export async function deleteProductById(productId: number) {
  await db
    .delete(productsPricesHistory)
    .where(eq(productsPricesHistory.productId, productId));
  await db
    .delete(productsShopsPrices)
    .where(eq(productsShopsPrices.productId, productId));
  await db.delete(products).where(eq(products.id, productId));
}

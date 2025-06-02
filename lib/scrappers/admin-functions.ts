"use server";

import { db } from "@/db";
import {
  products,
  productsBrands,
  productsPricesHistory,
  productsShopsPrices,
} from "@/db/schema";
import { eq, sql, and, notInArray } from "drizzle-orm";

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

export async function getSimilarProducts(
  categoryId: number,
  ignoredProducts: number[],
  threshold = 0.4
) {
  const duplicates = await db
    .select({
      id1: products.id,
      name1: products.name,
      image1: products.image,
      unit1: products.unit,
      brand1Name: sql`b1.name`.as<string>(),
      id2: sql`p2.id`.as<number>(),
      name2: sql`p2.name`.as<string>(),
      image2: sql`p2.image`.as<string>(),
      unit2: sql`p2.unit`.as<string>(),
      brand2Name: sql`b2.name`.as<string>(),
      sml: sql<number>`
        similarity(
          unaccent(lower(${products.name})),
          unaccent(lower(p2.name))
        )
      `.as("sml"),
    })
    .from(products)
    .innerJoin(
      sql`${products} AS p2`,
      sql`
        ${products.categoryId} = p2."categoryId"
        AND ${products.id} <> p2.id
        AND ${products.brandId} <> p2."brandId"
        AND similarity(
              unaccent(lower(${products.name})),
              unaccent(lower(p2.name))
            ) > ${threshold}
      `
    )
    .innerJoin(sql`${productsBrands} AS b1`, sql`${products}."brandId" = b1.id`)
    .innerJoin(sql`${productsBrands} AS b2`, sql`p2."brandId" = b2.id`)
    .where(
      and(
        eq(products.categoryId, categoryId),
        // eq(products.unit, sql`p2.unit`),
        eq(sql`p2."brandId"`, 80),
        notInArray(sql`p2.id`, ignoredProducts)
        // not(eq(products.categoryId, 1))
      )
    )
    .orderBy(sql`"sml" DESC`);

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

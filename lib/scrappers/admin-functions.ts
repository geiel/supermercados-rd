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
  ignoredBaseProducts: number[],
  threshold = 0.1
) {
  const duplicates = await db
    .select({
      id1: products.id,
      name1: products.name,
      image1: products.image,
      unit1: products.unit,
      deleted1: products.deleted,
      brand1Name: sql`b1.name`.as<string>(),
      id2: sql`p2.id`.as<number>(),
      name2: sql`p2.name`.as<string>(),
      image2: sql`p2.image`.as<string>(),
      unit2: sql`p2.unit`.as<string>(),
      brand2Name: sql`b2.name`.as<string>(),
      deleted2: sql`p2.deleted`.as<boolean>(),
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
        ${products.categoryId} IN (3)
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
    // .innerJoin(
    //   sql`${productsShopsPrices} AS ps2`,
    //   eq(sql`p2.id`, sql`ps2."productId"`)
    // )
    .where(
      and(
        // eq(products.categoryId, categoryId),

        eq(sql`p2."categoryId"`, categoryId),
        // eq(products.unit, sql`p2.unit`),
        eq(sql`p2."brandId"`, 30),
        notInArray(sql`p2.id`, ignoredProducts),
        notInArray(products.id, ignoredBaseProducts)
        // eq(sql`ps1."shopId"`, 2),
        // not(eq(shopPrice1.shopId, 3)),

        // sql`p2.name LIKE '%Vaquita%'`,
        // sql`unaccent(lower(p2.name)) NOT LIKE '%leche%'`,
        // sql`unaccent(lower(${products.name})) LIKE '%leche%'`
      )
    )
    .limit(15)
    .orderBy(sql`"sml" DESC`);

  return duplicates;
}

export async function deleteProductById(productId: number) {
  await db
    .update(products)
    .set({ deleted: true })
    .where(eq(products.id, productId));
  await db
    .update(productsShopsPrices)
    .set({ hidden: true })
    .where(eq(productsShopsPrices.productId, productId));
}

"use server";

import { db } from "@/db";
import { products, productsShopsPrices } from "@/db/schema";
import { and, eq, lt, notExists, notInArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function getGlobalSimilarProducts(ingoredProducts1: number[]) {
  const product1 = alias(products, "product1");
  const product2 = alias(products, "product2");
  const pShopPrices1 = alias(productsShopsPrices, "pShopPrices1");
  const pShopPrices2 = alias(productsShopsPrices, "pShopPrices2");

  const select = db
    .select()
    .from(pShopPrices1)
    .innerJoin(pShopPrices2, eq(pShopPrices1.shopId, pShopPrices2.shopId))
    .where(
      and(
        eq(pShopPrices1.productId, product1.id),
        eq(pShopPrices2.productId, product2.id)
      )
    );

  const duplicates = await db
    .select({
      id1: product1.id,
      name1: product1.name,
      image1: product1.image,
      unit1: product1.unit,
      id2: product2.id,
      name2: product2.name,
      image2: product2.image,
      unit2: product2.unit,
    })
    .from(product1)
    .innerJoin(
      product2,
      and(
        lt(product1.id, product2.id),
        sql`similarity(unaccent(lower(${product1.name})), unaccent(lower(${product2.name}))) > 0.8`
      )
    )
    .where(and(notExists(select), notInArray(product2.id, ingoredProducts1)))
    .limit(30);

  return duplicates;
}

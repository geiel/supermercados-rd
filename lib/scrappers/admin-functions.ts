"use server";

import { db } from "@/db";
import {
  products,
  productsPricesHistory,
  productsShopsPrices,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function adminMergeProduct(
  parentProductId: number,
  childProductId: number
) {
  await db
    .delete(productsPricesHistory)
    .where(eq(productsPricesHistory.productId, childProductId));
  await db
    .update(productsShopsPrices)
    .set({
      productId: parentProductId,
    })
    .where(eq(productsShopsPrices.productId, childProductId));

  await db.delete(products).where(eq(products.id, childProductId));
}

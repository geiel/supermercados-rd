"use server";

import { db } from "@/db";
import { productsShopsPrices } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function hideProductPrice(productShopPrice: productsShopsPrices) {
  if (productShopPrice.hidden) {
    return;
  }

  console.log(
    `[INFO] Hide product url=${productShopPrice.url} product=${productShopPrice.productId} shopId=${productShopPrice.shopId}`
  );
  await db
    .update(productsShopsPrices)
    .set({
      hidden: true,
    })
    .where(
      and(
        eq(productsShopsPrices.productId, productShopPrice.productId),
        eq(productsShopsPrices.shopId, productShopPrice.shopId)
      )
    );
}

export async function showProductPrice(productShopPrice: productsShopsPrices) {
  if (!productShopPrice.hidden) {
    return;
  }

  console.log(
    `[INFO] Show product url=${productShopPrice.url} product=${productShopPrice.productId} shopId=${productShopPrice.shopId}`
  );
  await db
    .update(productsShopsPrices)
    .set({
      hidden: false,
    })
    .where(
      and(
        eq(productsShopsPrices.productId, productShopPrice.productId),
        eq(productsShopsPrices.shopId, productShopPrice.shopId)
      )
    );
}

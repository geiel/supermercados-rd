"use server";

import { db } from "@/db";
import { productsPricesHistory, productsShopsPrices } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidateProduct } from "./revalidate-product";

export async function hideProductPrice(productShopPrice: productsShopsPrices) {
  console.log(
    `[INFO] Hide product url=${productShopPrice.url} product=${productShopPrice.productId} shopId=${productShopPrice.shopId}`
  );
  await db
    .update(productsShopsPrices)
    .set({
      hidden: true,
      updateAt: new Date(),
    })
    .where(
      and(
        eq(productsShopsPrices.productId, productShopPrice.productId),
        eq(productsShopsPrices.shopId, productShopPrice.shopId)
      )
    );
  await revalidateProduct(productShopPrice.productId);
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
  await revalidateProduct(productShopPrice.productId);
}

export async function validateHistory(
  productId: number,
  shopId: number,
  price: string
) {
  const history = await db.query.productsPricesHistory.findFirst({
    columns: {
      id: true,
    },
    where: (priceHistory, { eq, and }) =>
      and(
        eq(priceHistory.productId, productId),
        eq(priceHistory.shopId, shopId)
      ),
  });

  if (!history) {
    console.log(
      `[INFO] Product Shop history don't exist, creted it, productId: ${productId} shopId: ${shopId}`
    );
    await db.insert(productsPricesHistory).values({
      shopId,
      productId,
      price,
      createdAt: new Date(),
    });
  }
}

import {
  productsPricesHistory,
  productsShopsPrices,
} from "@/db/schema/products";
import { z } from "zod";
import {
  doneDuplicatedLog,
  doneProcessLog,
  ignoreLog,
  initProcessLog,
  processErrorLog,
} from "./logs";
import { db } from "@/db";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import { isLessThan12HoursAgo } from "./utils";
import { hideProductPrice, showProductPrice } from "../db-utils";
import { getSirenaHeaders, fetchWithRetry } from "./http-client";

const scrapper = "La Sirena";

async function getProductInfo(productShopPrice: productsShopsPrices) {
  if (!productShopPrice.api) {
    return null;
  }

  const headers = getSirenaHeaders();

  let jsonResponse: unknown;

  try {
    const response = await fetchWithRetry(productShopPrice.api, { headers });
    if (!response) return null;
    jsonResponse = await response.json();
  } catch (err) {
    console.log(err);
    return null;
  }

  const productInfo = z
    .object({
      product: z.object({
        thumbs: z.string(),
        category: z.string(),
        price: z.string(),
        regular_price: z.string(),
      }),
    })
    .safeParse(jsonResponse);

  if (productInfo.error) {
    console.log(productInfo.error);
    console.log(jsonResponse);
    await hideProductPrice(productShopPrice);
    return null;
  }

  return productInfo.data;
}

async function processByProductShopPrice(
  productShopPrice: productsShopsPrices,
  ignoreTimeValidation = false
) {
  if (
    !ignoreTimeValidation &&
    productShopPrice.updateAt &&
    isLessThan12HoursAgo(productShopPrice.updateAt)
  ) {
    return;
  }

  initProcessLog(scrapper, productShopPrice);
  const productInfo = await getProductInfo(productShopPrice);

  if (!productInfo) {
    processErrorLog(scrapper, productShopPrice);
    return;
  }

  await showProductPrice(productShopPrice);
  if (
    productShopPrice.currentPrice &&
    Number(productShopPrice.currentPrice) === Number(productInfo.product.price)
  ) {
    ignoreLog(scrapper, productShopPrice);
    await db
      .update(productsShopsPrices)
      .set({ updateAt: new Date() })
      .where(
        and(
          eq(productsShopsPrices.productId, productShopPrice.productId),
          eq(productsShopsPrices.shopId, productShopPrice.shopId)
        )
      );
    return;
  }

  const result = await db
    .update(productsShopsPrices)
    .set({
      currentPrice: productInfo.product.price,
      regularPrice: productInfo.product.regular_price,
      updateAt: new Date(),
    })
    .where(
      and(
        eq(productsShopsPrices.productId, productShopPrice.productId),
        eq(productsShopsPrices.shopId, productShopPrice.shopId),
        or(
          isNull(productsShopsPrices.currentPrice),
          ne(productsShopsPrices.currentPrice, productInfo.product.price)
        )
      )
    )
    .returning({
      productId: productsShopsPrices.productId,
      currentPrice: productsShopsPrices.currentPrice,
    });

  if (result.length === 0) {
    doneDuplicatedLog(scrapper, productShopPrice);
    return;
  }

  await db.insert(productsPricesHistory).values({
    ...productShopPrice,
    price: productInfo.product.price,
    createdAt: new Date(),
  });

  doneProcessLog(scrapper, productShopPrice);
}

export const sirena = { processByProductShopPrice };

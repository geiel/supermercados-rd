import {
  productsPricesHistory,
  productsShopsPrices,
} from "@/db/schema/products";
import { z } from "zod";
import {
  doneProcessLog,
  ignoreLog,
  initProcessLog,
  processErrorLog,
} from "./logs";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { isLessThan12HoursAgo } from "./utils";
import { hideProductPrice, showProductPrice } from "../db-utils";

const scrapper = "La Sirena";

async function getProductInfo(productShopPrice: productsShopsPrices) {
  if (!productShopPrice.api) {
    return null;
  }

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const scrapperHeaders = await db.query.scrapperHeaders.findMany({
    where: (scrapperHeaders, { eq }) =>
      eq(scrapperHeaders.shopId, productShopPrice.shopId),
  });

  scrapperHeaders.forEach((h) => {
    headers[h.name] = h.value;
  });

  let jsonResponse: unknown;

  try {
    const response = await fetch(productShopPrice.api, { headers });
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
  productShopPrice: productsShopsPrices
) {
  if (
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

  await db
    .update(productsShopsPrices)
    .set({
      currentPrice: productInfo.product.price,
      regularPrice: productInfo.product.regular_price,
      updateAt: new Date(),
    })
    .where(
      and(
        eq(productsShopsPrices.productId, productShopPrice.productId),
        eq(productsShopsPrices.shopId, productShopPrice.shopId)
      )
    );

  await db.insert(productsPricesHistory).values({
    ...productShopPrice,
    price: productInfo.product.price,
    createdAt: new Date(),
  });

  doneProcessLog(scrapper, productShopPrice);
}

export const sirena = { processByProductShopPrice };

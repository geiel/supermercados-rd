import { db } from "@/db";
import { productsShopsPrices } from "@/db/schema/products";
import * as cheerio from "cheerio";
import { and, eq } from "drizzle-orm";
import {
  doneProcessLog,
  ignoreLog,
  initProcessLog,
  processErrorLog,
} from "./logs";
import { isLessThan12HoursAgo } from "./utils";
import { hideProductPrice, validateHistory } from "../db-utils";

async function getHtml(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    return await response.text();
  } catch (err) {
    console.log(err);
  }
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

  initProcessLog("Jumbo", productShopPrice);
  const html = await getHtml(productShopPrice.url);

  if (!html) {
    processErrorLog("Jumbo", productShopPrice);
    return;
  }

  const $ = cheerio.load(html);
  const finalPrice = $('span[data-price-type="finalPrice"]').attr(
    "data-price-amount"
  );
  const oldPrice = $('span[data-price-type="oldPrice"]').attr(
    "data-price-amount"
  );

  if (!finalPrice) {
    processErrorLog("Jumbo", productShopPrice);
    await hideProductPrice(productShopPrice);
    return;
  }

  await validateHistory(
    productShopPrice.productId,
    productShopPrice.shopId,
    finalPrice
  );

  if (Number(productShopPrice.currentPrice) === Number(finalPrice)) {
    ignoreLog("Jumbo", productShopPrice);
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
      currentPrice: finalPrice,
      regularPrice: oldPrice,
      updateAt: new Date(),
    })
    .where(
      and(
        eq(productsShopsPrices.productId, productShopPrice.productId),
        eq(productsShopsPrices.shopId, productShopPrice.shopId)
      )
    );

  await validateHistory(
    productShopPrice.productId,
    productShopPrice.shopId,
    finalPrice
  );

  doneProcessLog("Jumbo", productShopPrice);
}

export const jumbo = { processByProductShopPrice };

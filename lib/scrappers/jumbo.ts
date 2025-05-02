import { db } from "@/db";
import {
  productsPricesHistory,
  productsShopsPrices,
} from "@/db/schema/products";
import * as cheerio from "cheerio";
import { and, eq } from "drizzle-orm";
import {
  doneProcessLog,
  ignoreLog,
  initProcessLog,
  processErrorLog,
} from "./logs";
import { isLessThan12HoursAgo } from "./utils";

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
  const prices = $(".price-final_price").text().trim().split(/\s+/);

  if (!prices || prices.length === 0) {
    processErrorLog("Jumbo", productShopPrice);
    return;
  }

  let currentPrice = "";
  let regularPrice: string | null = null;
  if (prices.length > 1) {
    currentPrice = prices[1].replace("RD$", "");
    regularPrice = prices[0].replace("RD$", "");
  } else {
    currentPrice = prices[0].replace("RD$", "");
  }

  if (!currentPrice) {
    processErrorLog("Jumbo", productShopPrice);
    return;
  }

  if (Number(productShopPrice.currentPrice) === Number(currentPrice)) {
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
    .set({ currentPrice, regularPrice, updateAt: new Date() })
    .where(
      and(
        eq(productsShopsPrices.productId, productShopPrice.productId),
        eq(productsShopsPrices.shopId, productShopPrice.shopId)
      )
    );

  await db.insert(productsPricesHistory).values({
    ...productShopPrice,
    price: currentPrice,
    createdAt: new Date(),
  });

  doneProcessLog("Jumbo", productShopPrice);
}

export const jumbo = { processByProductShopPrice };

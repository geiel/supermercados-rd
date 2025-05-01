import { db } from "@/db";
import {
  productsPricesHistory,
  productsShopsPrices,
} from "@/db/schema/products";
import * as cheerio from "cheerio";
import { and, eq } from "drizzle-orm";
import { ignoreLog, initProcessLog, processErrorLog } from "./logs";
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

  const prices = $("div.price-box.price-final_price")
    .text()
    .trim()
    .match(/RD\$\d+(\.\d+)?/g);

  if (!prices || prices.length === 0) {
    processErrorLog("Jumbo", productShopPrice);
    return;
  }

  let productPrice = "";
  if (prices.length > 1) {
    productPrice = prices[1].replace("RD$", "");
  } else {
    productPrice = prices[0].replace("RD$", "");
  }

  if (productShopPrice.currentPrice === productPrice) {
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
    .set({ currentPrice: productPrice, updateAt: new Date() })
    .where(
      and(
        eq(productsShopsPrices.productId, productShopPrice.productId),
        eq(productsShopsPrices.shopId, productShopPrice.shopId)
      )
    );

  await db.insert(productsPricesHistory).values({
    ...productShopPrice,
    price: productPrice,
    createdAt: new Date(),
  });
}

export const jumbo = { processByProductShopPrice };

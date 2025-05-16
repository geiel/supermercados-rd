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
import { hideProductPrice } from "../db-utils";

const scrapper = "Nacional";

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

  initProcessLog(scrapper, productShopPrice);
  const html = await getHtml(productShopPrice.url);

  if (!html) {
    processErrorLog(scrapper, productShopPrice);
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
    processErrorLog(scrapper, productShopPrice);
    await hideProductPrice(productShopPrice);
    return;
  }

  if (Number(productShopPrice.currentPrice) === Number(finalPrice)) {
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

  await db.insert(productsPricesHistory).values({
    ...productShopPrice,
    price: finalPrice,
    createdAt: new Date(),
  });

  doneProcessLog(scrapper, productShopPrice);
}

export const nacional = { processByProductShopPrice };

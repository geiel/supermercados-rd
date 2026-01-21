import { db } from "@/db";
import {
  productsPricesHistory,
  productsShopsPrices,
} from "@/db/schema/products";
import * as cheerio from "cheerio";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import {
  doneDuplicatedLog,
  doneProcessLog,
  ignoreLog,
  initProcessLog,
  processErrorLog,
} from "./logs";
import { isLessThan12HoursAgo } from "./utils";
import { hideProductPrice, showProductPrice } from "../db-utils";
import { getNacionalHeaders, fetchWithRetry } from "./http-client";

const scrapper = "Nacional";

async function getHtml(url: string) {
  try {
    const headers = getNacionalHeaders(url);
    const response = await fetchWithRetry(url, { headers });

    if (!response) return undefined;
    return await response.text();
  } catch (err) {
    console.log(err);
  }
}

async function processByProductShopPrice(
  productShopPrice: productsShopsPrices,
  ignoreTimeValidation = false,
  dontLog = false
) {
  if (
    !ignoreTimeValidation &&
    productShopPrice.updateAt &&
    isLessThan12HoursAgo(productShopPrice.updateAt)
  ) {
    return;
  }

  initProcessLog(scrapper, productShopPrice, dontLog);
  const html = await getHtml(productShopPrice.url);

  if (!html) {
    processErrorLog(scrapper, productShopPrice);
    return;
  }

  const $ = cheerio.load(html);

  const title = 
    $('meta[property="og:title"]').attr("content")?.trim() ??
    $("title").first().text().trim();
  
  if (title.includes("404 Página no encontrada")) {
    processErrorLog(scrapper, productShopPrice, "Producto no encontrado");
    await hideProductPrice(productShopPrice);
    return;
  }

  const finalPrice = $('span[data-price-type="finalPrice"]').attr(
    "data-price-amount"
  );
  const oldPrice = $('span[data-price-type="oldPrice"]').attr(
    "data-price-amount"
  );

  if (!finalPrice) {
    processErrorLog(scrapper, productShopPrice, `titulo: ${title}`);

    if (title.includes("503 backend read error")) {
      process.exit(1);
    }
    
    return;
  }

  await showProductPrice(productShopPrice);
  if (Number(productShopPrice.currentPrice) === Number(finalPrice)) {
    ignoreLog(scrapper, productShopPrice, dontLog);
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
      currentPrice: finalPrice,
      regularPrice: oldPrice,
      updateAt: new Date(),
    })
    .where(
      and(
        eq(productsShopsPrices.productId, productShopPrice.productId),
        eq(productsShopsPrices.shopId, productShopPrice.shopId),
        or(
          isNull(productsShopsPrices.currentPrice),
          ne(productsShopsPrices.currentPrice, finalPrice)
        )
      )
    )
    .returning({
      productId: productsShopsPrices.productId,
      currentPrice: productsShopsPrices.currentPrice,
    });

  if (result.length === 0) {
    doneDuplicatedLog(scrapper, productShopPrice, dontLog);
    return;
  }

  await db.insert(productsPricesHistory).values({
    ...productShopPrice,
    price: finalPrice,
    createdAt: new Date(),
  });

  doneProcessLog(scrapper, productShopPrice, dontLog);
}

export const nacional = { processByProductShopPrice };

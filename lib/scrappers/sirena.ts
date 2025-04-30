import {
  productsPricesHistory,
  productsShopsPrices,
} from "@/db/schema/products";
import { z } from "zod";
import { initProcessLog, processErrorLog } from "./logs";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";

async function getProductInfo(api: string | null, shopId: number) {
  if (!api) {
    return null;
  }

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const scrapperHeaders = await db.query.scrapperHeaders.findMany({
    where: (scrapperHeaders, { eq }) => eq(scrapperHeaders.shopId, shopId),
  });

  scrapperHeaders.forEach((h) => {
    headers[h.name] = h.value;
  });

  let jsonResponse: unknown;

  try {
    const response = await fetch(api, { headers });
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
      }),
    })
    .safeParse(jsonResponse);

  if (productInfo.error) {
    console.log(productInfo.error);
    return null;
  }

  return productInfo.data;
}

async function processByProductShopPrice(
  productShopPrice: productsShopsPrices
) {
  initProcessLog("La Sirena", productShopPrice);
  const productInfo = await getProductInfo(
    productShopPrice.api,
    productShopPrice.shopId
  );

  if (!productInfo) {
    processErrorLog("La Sirena", productShopPrice);
    return;
  }

  if (productShopPrice.currentPrice === productInfo.product.price) {
    return;
  }

  await db
    .update(productsShopsPrices)
    .set({ currentPrice: productInfo.product.price, updateAt: new Date() })
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
}

export const sirena = { processByProductShopPrice };

import { db } from "@/db";
import { productsPricesHistory, productsShopsPrices } from "@/db/schema";
import { z } from "zod";
import { isLessThan12HoursAgo } from "./utils";
import {
  doneProcessLog,
  ignoreLog,
  initProcessLog,
  processErrorLog,
} from "./logs";
import { and, eq } from "drizzle-orm";
import { validateHistory } from "../db-utils";

const scrapper = "Bravo";

async function getProductInfo(api: string | null, shopId: number) {
  if (!api) {
    return null;
  }

  const headers: Record<string, string> = {
    "User-Agent": "Domicilio/118090 CFNetwork/3826.400.120 Darwin/24.3.0",
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
      data: z.object({
        associatedTienda: z.array(
          z.object({
            idTiendaArticuloTienda: z.number(),
            pvpArticuloTienda: z.number(),
          })
        ),
      }),
    })
    .safeParse(jsonResponse);

  if (productInfo.error) {
    console.log(productInfo.error);
    return null;
  }

  const productHeadShop = productInfo.data.data.associatedTienda.find(
    (p) => p.idTiendaArticuloTienda === 1000
  );

  return productHeadShop
    ? productHeadShop
    : productInfo.data.data.associatedTienda[0];
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
  const productInfo = await getProductInfo(
    productShopPrice.api,
    productShopPrice.shopId
  );

  if (!productInfo) {
    processErrorLog(scrapper, productShopPrice);
    return;
  }

  await validateHistory(
    productShopPrice.productId,
    productShopPrice.shopId,
    productInfo.pvpArticuloTienda + ""
  );

  if (
    productShopPrice.currentPrice &&
    Number(productShopPrice.currentPrice) ===
      Number(productInfo.pvpArticuloTienda)
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
      currentPrice: productInfo.pvpArticuloTienda + "",
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
    price: productInfo.pvpArticuloTienda + "",
    createdAt: new Date(),
  });

  doneProcessLog(scrapper, productShopPrice);
}

export const bravo = { processByProductShopPrice };

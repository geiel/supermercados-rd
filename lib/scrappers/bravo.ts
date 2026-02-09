import { db } from "@/db";
import { productsPricesHistory, productsShopsPrices } from "@/db/schema";
import { z } from "zod";
import { isLessThan12HoursAgo } from "./utils";
import {
  doneDuplicatedLog,
  doneProcessLog,
  ignoreLog,
  initProcessLog,
  processErrorLog,
} from "./logs";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import { hideProductPrice, showProductPrice } from "../db-utils";
import {
  getBravoHeaders,
  fetchWithRetry,
  type FetchWithRetryConfig,
} from "./http-client";
import { revalidateProduct } from "../revalidate-product";

const scrapper = "Bravo";

async function getProductInfo(
  api: string | null,
  requestConfig?: FetchWithRetryConfig
) {
  if (!api) {
    return null;
  }

  const headers = getBravoHeaders();

  let jsonResponse: unknown;

  try {
    const response = await fetchWithRetry(api, { headers }, requestConfig);
    if (!response) return null;
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
            associatedOferta: z.array(
              z.object({
                precioReferenciaArticuloTiendaOferta: z.number(),
              })
            ),
          })
        ),
      }),
    })
    .or(z.object({
      errors: z.array(z.object({
        code: z.string(),
      }))
    }))
    .safeParse(jsonResponse);

  if (productInfo.error) {
    console.log(productInfo.error);
    return null;
  }

  if ("errors" in productInfo.data) {
    console.log(productInfo.data.errors);
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
  productShopPrice: productsShopsPrices,
  ignoreTimeValidation = false,
  dontLog = false,
  requestConfig?: FetchWithRetryConfig
) {
  if (
    !ignoreTimeValidation &&
    productShopPrice.updateAt &&
    isLessThan12HoursAgo(productShopPrice.updateAt)
  ) {
    return;
  }

  initProcessLog(scrapper, productShopPrice, dontLog);
  const productInfo = await getProductInfo(
    productShopPrice.api,
    requestConfig
  );

  if (!productInfo) {
    processErrorLog(scrapper, productShopPrice);
    await hideProductPrice(productShopPrice);
    return;
  }

  await showProductPrice(productShopPrice);
  if (
    productShopPrice.currentPrice &&
    Number(productShopPrice.currentPrice) ===
      Number(productInfo.pvpArticuloTienda)
  ) {
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
      currentPrice: productInfo.pvpArticuloTienda + "",
      regularPrice:
        productInfo.associatedOferta.length > 0
          ? productInfo.associatedOferta[0]
              .precioReferenciaArticuloTiendaOferta + ""
          : null,
      updateAt: new Date(),
    })
    .where(
      and(
        eq(productsShopsPrices.productId, productShopPrice.productId),
        eq(productsShopsPrices.shopId, productShopPrice.shopId),
        or(
          isNull(productsShopsPrices.currentPrice),
          ne(
            productsShopsPrices.currentPrice,
            productInfo.pvpArticuloTienda + ""
          )
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
    price: productInfo.pvpArticuloTienda + "",
    createdAt: new Date(),
  });

  await revalidateProduct(productShopPrice.productId);
  doneProcessLog(scrapper, productShopPrice, dontLog);
}

export const bravo = { processByProductShopPrice };

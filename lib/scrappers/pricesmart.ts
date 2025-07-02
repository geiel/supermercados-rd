import { productsPricesHistory, productsShopsPrices } from "@/db/schema";
import { z } from "zod";
import {
  doneProcessLog,
  ignoreLog,
  initProcessLog,
  processErrorLog,
} from "./logs";
import { isLessThan12HoursAgo } from "./utils";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { hideProductPrice, showProductPrice } from "../db-utils";

const scrapper = "Pricesmart";
type Price = {
  currentPrice: string;
  regularPrice?: string;
};

async function getProductInfo(
  productShopPrice: productsShopsPrices
): Promise<Price | null> {
  const price: Price = {
    currentPrice: "",
    regularPrice: "",
  };
  if (!productShopPrice.api) {
    return price;
  }

  let jsonResponse: unknown;

  try {
    const response = await fetch(
      "https://www.pricesmart.com/api/ct/getProduct",
      {
        method: "POST",
        body: JSON.stringify([
          {
            skus: [productShopPrice.api],
          },
          {
            products: "getProductBySKU",
          },
        ]),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept-Language": "en-US,en;q=0.9",
          "Content-Type": "application/json",
        },
      }
    );

    jsonResponse = await response.json();
  } catch (err) {
    console.log(err);
    return price;
  }

  const productInfo = z
    .object({
      data: z.object({
        products: z.object({
          results: z.array(
            z.object({
              masterData: z.object({
                current: z.object({
                  allVariants: z.array(
                    z.object({
                      attributesRaw: z.array(
                        z.object({
                          name: z.string(),
                          value: z.unknown(),
                        })
                      ),
                    })
                  ),
                }),
              }),
            })
          ),
        }),
      }),
    })
    .safeParse(jsonResponse);

  if (productInfo.error) {
    console.log(productInfo.error);
    return price;
  }

  if (productInfo.data.data.products.results.length === 0) {
    console.log("[ERROR] The result in pricesmart not found", productInfo);
    await hideProductPrice(productShopPrice);
    return price;
  }

  await showProductPrice(productShopPrice);
  const priceString =
    productInfo.data.data.products.results[0].masterData.current.allVariants[0].attributesRaw.find(
      (d) => d.name === "unit_price"
    );

  const originalPriceString =
    productInfo.data.data.products.results[0].masterData.current.allVariants[0].attributesRaw.find(
      (d) => d.name === "original_price_without_saving"
    );

  if (!priceString || !priceString.value) {
    console.log(
      "[ERROR] unit_price not found for this api=" + productShopPrice.api
    );
    return price;
  }

  const priceSchema = z.array(
    z.object({
      country: z.string(),
      value: z.string(),
    })
  );

  const productPrice = priceSchema.safeParse(
    JSON.parse(priceString.value + "")
  );

  if (productPrice.error) {
    console.log(productInfo.error);
    return price;
  }

  const currentPrice = productPrice.data.find((p) => p.country === "DO");
  if (!currentPrice) {
    console.log("[ERROR] DO price was not found in the unit_price");
    return price;
  }

  if (originalPriceString) {
    const originalPrice = priceSchema.safeParse(
      JSON.parse(originalPriceString.value + "")
    );
    if (
      !originalPrice.error &&
      Number(originalPrice.data.find((p) => p.country === "DO")?.value)
    ) {
      price.regularPrice = originalPrice.data.find(
        (p) => p.country === "DO"
      )?.value;
    }
  }

  price.currentPrice = currentPrice.value;
  return price;
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
  const price = await getProductInfo(productShopPrice);

  if (!price || !price.currentPrice) {
    processErrorLog(scrapper, productShopPrice);
    await hideProductPrice(productShopPrice);
    return;
  }

  // await validateHistory(
  //   productShopPrice.productId,
  //   productShopPrice.shopId,
  //   price.currentPrice
  // );

  if (
    productShopPrice.currentPrice &&
    Number(productShopPrice.currentPrice) === Number(price.currentPrice)
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
      currentPrice: price.currentPrice,
      regularPrice: price.regularPrice ? price.regularPrice : null,
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
    price: price.currentPrice,
    createdAt: new Date(),
  });

  doneProcessLog(scrapper, productShopPrice);
}

export const pricesmart = { processByProductShopPrice };

"use server";

import { db } from "@/db";
import {
  productsInsert,
  productsShopsPricesInsert,
  unitTracker,
  unitTrackerInsert,
  productsShopsPrices,
} from "@/db/schema/products";
import { z } from "zod";
import { formatUnit } from "./utils";
import {
  findExistingProductAcrossTables,
  findSourceReferenceAcrossTables,
  insertProductIntoUnverified,
} from "./unverified-products";

export async function getProductListSirena(categoryId: number, url: string) {
  const unitTrackers: unitTrackerInsert[] = [];

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept-Language": "en-US,en;q=0.9",
      Source: "c3RvcmVmcm9udA==",
    },
    signal: AbortSignal.timeout(10000),
  });

  const jsonResponse = await response.json();

  const productsSirena = z
    .object({
      base_img: z.string(),
      data: z.array(
        z.object({
          thumbs: z.string(),
          friendlyurl: z.string(),
          name: z.string(),
        })
      ),
    })
    .parse(jsonResponse);

  console.log("[Sirena Processor[ Start getting products");
  const dbProducts = productsSirena.data.map(
    (p): productsInsert & { price: productsShopsPricesInsert } => {
      let unitSlice = -1;

      const words = p.name.trim().split(/\s+/);
      let nameWords = words.slice(0, -1);

      if (
        nameWords.find((word) => word.toLowerCase() === "lb") ||
        nameWords.find((word) => !isNaN(Number(word)))
      ) {
        nameWords = words.slice(0, -2);
        unitSlice = -2;
      }

      const productName = nameWords
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");

      const unit = formatUnit(words.slice(unitSlice).join(" ").toUpperCase());

      unitTrackers.push({
        unit,
        productName,
      });

      return {
        name: productName,
        unit: unit,
        image: `https://assets-sirenago.s3-us-west-1.amazonaws.com/product/original/${p.thumbs}`,
        categoryId,
        brandId: 30, //Sirena
        price: {
          shopId: 1,
          productId: 0,
          url: `https://sirena.do/products/index/${p.friendlyurl}`,
          api: `https://st.sirena.do/product/detail/${btoa(
            p.friendlyurl
          )}==/Yzg4NDRhYWRjMTE5ZTE4NjU5N2Y1ZGVhZjlhNDViMDk=`,
        },
      };
    }
  );

  console.log(
    "[Sirena Processor] Products obtained length=" + dbProducts.length
  );
  for (const product of dbProducts) {
    console.log(
      `[INFO] start process product=${product.name} ${product.unit} url=${product.price.url}`
    );
    const existingProduct = await findExistingProductAcrossTables({
      name: product.name,
      unit: product.unit,
      brandId: product.brandId,
    });

    if (existingProduct?.source === "products") {
      product.price.productId = existingProduct.product.id;
      await db
        .insert(productsShopsPrices)
        .values(product.price)
        .onConflictDoNothing();
      console.log(`[INFO] product exists in products updated`);
      continue;
    }

    if (existingProduct?.source === "unverified_products") {
      console.log(
        `[INFO] product already exists in unverified_products, skipping`
      );
      continue;
    }

    const sourceReferenceExist = await findSourceReferenceAcrossTables({
      shopId: product.price.shopId,
      url: product.price.url,
      api: product.price.api,
    });

    if (sourceReferenceExist) {
      console.log(
        `[INFO] product source reference exists in ${sourceReferenceExist.source}, skipping`
      );
      continue;
    }

    try {
      await insertProductIntoUnverified(product, {
        shopId: product.price.shopId,
        url: product.price.url,
        api: product.price.api,
      });
      console.log(`[INFO] product inserted into unverified_products`);
    } catch (err) {
      console.log(
        "[ERROR] Error when trying insert a new unverified product",
        err
      );
    }
  }

  await db.insert(unitTracker).values(unitTrackers).onConflictDoNothing();
}

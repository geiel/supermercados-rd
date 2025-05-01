"use server";

import { db } from "@/db";
import {
  productsInsert,
  productsShopsPricesInsert,
  unitTracker,
  unitTrackerInsert,
  products,
  productsShopsPrices,
} from "@/db/schema/products";
import { z } from "zod";

export async function getProductList(categoryId: number, url: string) {
  const unitTrackers: unitTrackerInsert[] = [];

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept-Language": "en-US,en;q=0.9",
      Source: "c3RvcmVmcm9udA==",
    },
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

      const unit = words.slice(unitSlice).join(" ").toUpperCase();

      unitTrackers.push({
        unit,
        productName,
      });

      return {
        name: productName,
        unit: unit,
        image: `https://assets-sirenago.s3-us-west-1.amazonaws.com/product/original/${p.thumbs}`,
        categoryId,
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

  await db.insert(unitTracker).values(unitTrackers).onConflictDoNothing();
  for (const product of dbProducts) {
    const insertedProduct = await db
      .insert(products)
      .values(product)
      .returning({ id: products.id });
    product.price.productId = insertedProduct[0].id;
    await db.insert(productsShopsPrices).values(product.price);
  }
}

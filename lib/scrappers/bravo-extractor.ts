"use server";

import { db } from "@/db";
import {
  productsInsert,
  productsShopsPrices,
  productsShopsPricesInsert,
  unitTracker,
  unitTrackerInsert,
} from "@/db/schema";
import { z } from "zod";
import { formatUnit } from "./utils";
import {
  findExistingProductAcrossTables,
  findSourceReferenceAcrossTables,
  insertProductIntoUnverified,
} from "./unverified-products";

export async function getProductListBravo(categoryId: number, url: string) {
  const unitTrackers: unitTrackerInsert[] = [];

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Domicilio/118090 CFNetwork/3826.400.120 Darwin/24.3.0",
      "Accept-Language": "en-US,en;q=0.9",
      "X-Auth-Token":
        "dDfy25KA4AbcAIbTGrWHimB1eaiJnCAHqBO1cQlb113QtVsKOHlobtCzUh0FTdOPkLTSEl7Wn17TW0K2jIvoMybcp4zp7beQqdX1zxKqKb6yfZnKlF3hTDaIVZbi1OIB",
      "Host": "bravova-api.superbravo.com.do"
    },
  });

  const jsonResponse = await response.json();

  const productsBravo = z
    .object({
      data: z.object({
        list: z.array(
          z.object({
            nombreArticulo: z.string(),
            idArticulo: z.number(),
            idexternoArticulo: z.string(),
            imageCatalogVersion: z.string(),
          })
        ),
      }),
    })
    .parse(jsonResponse);

  console.log("[Bravo Processor[ Start getting products");
  const dbProducts = productsBravo.data.list.map(
    (p): productsInsert & { price: productsShopsPricesInsert } => {
      let unitSlice = -1;

      const words = p.nombreArticulo.trim().split(/\s+/);
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
        image: `https://bravova-resources.superbravo.com.do/images/catalogo/big/${p.idexternoArticulo}_1.png?v=${p.imageCatalogVersion}`,
        categoryId,
        brandId: 80, //Bravo
        price: {
          shopId: 6,
          productId: 0,
          url: `https://bravova.superbravo.com.do`,
          api: `https://bravova-api.superbravo.com.do/public/articulo/get?idArticulo=${p.idArticulo}`,
        },
      };
    }
  );

  console.log(
    "[Bravo Processor] Products obtained length=" + dbProducts.length
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

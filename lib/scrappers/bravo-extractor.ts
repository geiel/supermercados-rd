"use server";

import { db } from "@/db";
import {
  products,
  productsInsert,
  productsShopsPrices,
  productsShopsPricesInsert,
  unitTracker,
  unitTrackerInsert,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export async function getProductListBravo(categoryId: number, url: string) {
  const unitTrackers: unitTrackerInsert[] = [];

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Domicilio/118090 CFNetwork/3826.400.120 Darwin/24.3.0",
      "Accept-Language": "en-US,en;q=0.9",
      "X-Auth-Token":
        "dDfy25KA4AbcAIbTGrWHimB1eaiJnCAHqBO1cQlb113QtVsKOHlobtCzUh0FTdOPkLTSEl7Wn17TW0K2jIvoMybcp4zp7beQqdX1zxKqKb6yfZnKlF3hTDaIVZbi1OIB",
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

      const unit = words.slice(unitSlice).join(" ").toUpperCase();

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
    "[Sirena Processor] Products obtained length=" + dbProducts.length
  );
  for (const product of dbProducts) {
    console.log(
      `[INFO] start process product=${product.name} ${product.unit} url=${product.price.url}`
    );
    const exist = await db.query.products.findFirst({
      where: and(
        eq(products.name, product.name),
        eq(products.unit, product.unit),
        eq(products.brandId, product.brandId)
      ),
      with: {
        shopCurrentPrices: true,
      },
    });

    if (!exist) {
      const insertedProduct = await db
        .insert(products)
        .values(product)
        .returning({ id: products.id });
      product.price.productId = insertedProduct[0].id;
      await db.insert(productsShopsPrices).values(product.price);
      console.log(`[INFO] product don't exist inserted`);
      continue;
    }

    product.price.productId = exist.id;
    await db
      .insert(productsShopsPrices)
      .values(product.price)
      .onConflictDoNothing();
    console.log(`[INFO] product 'exist' updated`);
  }

  await db.insert(unitTracker).values(unitTrackers).onConflictDoNothing();
}

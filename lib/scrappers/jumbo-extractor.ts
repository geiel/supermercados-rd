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
import * as cheerio from "cheerio";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

async function getHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  return await response.text();
}

export async function getProductListJumbo(categoryId: number, url: string) {
  const unitTrackers: unitTrackerInsert[] = [];

  const html = await getHtml(url);

  const $ = cheerio.load(html);

  const dbProducts: Array<
    productsInsert & { price: productsShopsPricesInsert }
  > = [];

  $(".product-item-tile__details").each((_, element) => {
    const name = $(element).find(".product-item-tile__name").text().trim();
    const url = $(element).find(".product-item-tile__link").attr("href");

    let unitSlice = -1;
    const words = name.split(/\s+/);
    let nameWords = words.slice(0, -1);

    if (
      nameWords.find((word) => word.toLowerCase() === "lb") ||
      nameWords.find((word) => !isNaN(Number(word)))
    ) {
      nameWords = words.slice(0, -2);
      unitSlice = -2;
    }

    const productName = nameWords
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    const unit = words.slice(unitSlice).join(" ").toUpperCase();

    if (url) {
      unitTrackers.push({
        unit,
        productName,
      });

      dbProducts.push({
        name: productName,
        unit,
        categoryId,
        brandId: 19, //Jumbo
        price: {
          shopId: 3,
          productId: 0,
          url,
        },
      });
    }
  });

  console.log(
    "[Jumbo Processor] Products obtained length=" + dbProducts.length
  );
  for (const product of dbProducts) {
    console.log(
      `[INFO] start process product=${product.name} ${product.unit} url=${product.price.url}`
    );
    const exist = await db.query.products.findFirst({
      where: and(
        eq(products.name, product.name),
        eq(products.unit, product.unit)
      ),
      with: {
        shopCurrentPrices: true,
      },
    });

    if (!exist) {
      product.image = await getImageUrl(product.price.url);

      try {
        await db.transaction(async (tx) => {
          const insertedProduct = await tx
            .insert(products)
            .values(product)
            .returning();
          product.price.productId = insertedProduct[0].id;
          await tx.insert(productsShopsPrices).values(product.price);
          console.log(`[INFO] product don't exist inserted`);
        });
      } catch (err) {
        console.log("[ERROR] Error when trying insert a new product", err);
      }
      continue;
    }

    product.price.productId = exist.id;
    await db
      .insert(productsShopsPrices)
      .values(product.price)
      .onConflictDoNothing();

    if (exist.brandId === 53) {
      console.log(
        `[INFO] product is from nacional update to Centro Cuesta Nacional`
      );
      await db
        .update(products)
        .set({
          brandId: 81,
        })
        .where(eq(products.id, exist.id));
    }
    console.log(`[INFO] product 'exist' updated`);
  }

  await db.insert(unitTracker).values(unitTrackers).onConflictDoNothing();
}

async function getImageUrl(url: string) {
  const html = await getHtml(url);
  const $ = cheerio.load(html);
  const scriptContent = $('script[type="text/x-magento-init"]').html();
  const parsed = JSON.parse(scriptContent!);
  const dataArray = parsed["*"]?.magepalGtmDatalayer?.data;

  if (dataArray.length < 2) {
    console.log("ERROR [Jumbo] dataArray is less than 2");
    return;
  }

  const img = z
    .object({
      product: z.object({
        image_url: z.string(),
      }),
    })
    .safeParse(dataArray[1]);

  if (img.error) {
    console.log("ERROR [Jumbo] error in zod parsing " + img.error);
    return;
  }

  return img.data.product.image_url;
}

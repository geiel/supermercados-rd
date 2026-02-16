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
import { eq } from "drizzle-orm";
import { z } from "zod";
import { formatUnit } from "./utils";
import { fetchWithBrowser } from "./http-client";
import {
  findExistingProductAcrossTables,
  findSourceReferenceAcrossTables,
  insertProductIntoUnverified,
} from "./unverified-products";

async function getHtml(url: string) {
  // Use browser-based fetch to bypass Cloudflare
  const html = await fetchWithBrowser(url);
  return html ?? "";
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

    const unit = formatUnit(words.slice(unitSlice).join(" ").toUpperCase());

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
    const existingProduct = await findExistingProductAcrossTables(
      {
        name: product.name,
        unit: product.unit,
        brandId: product.brandId,
      },
      { matchBrand: false }
    );

    if (existingProduct?.source === "products") {
      product.price.productId = existingProduct.product.id;
      await db
        .insert(productsShopsPrices)
        .values(product.price)
        .onConflictDoNothing();

      if (existingProduct.product.brandId === 53) {
        console.log(
          `[INFO] product is from nacional update to Centro Cuesta Nacional`
        );
        await db
          .update(products)
          .set({
            brandId: 81,
          })
          .where(eq(products.id, existingProduct.product.id));
      }
      console.log(`[INFO] product exists in products updated`);
      continue;
    }

    if (existingProduct?.source === "unverified_products") {
      console.log(
        `[INFO] product already exists in unverified_products, skipping`
      );
      continue;
    }

    product.image = await getImageUrl(product.price.url);

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

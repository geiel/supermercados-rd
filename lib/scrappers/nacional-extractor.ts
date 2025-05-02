"use server";

import { db } from "@/db";
import {
  products,
  productsBrands,
  productsInsert,
  productsShopsPrices,
  productsShopsPricesInsert,
  unitTracker,
  unitTrackerInsert,
} from "@/db/schema";
import * as cheerio from "cheerio";
import { and, eq } from "drizzle-orm";

async function getHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  return await response.text();
}

export async function getProductListSirena(categoryId: number, url: string) {
  const html = await getHtml(url);

  const $ = cheerio.load(html);

  const unitTrackers: unitTrackerInsert[] = [];
  const dbProducts: Array<
    productsInsert & { price: productsShopsPricesInsert } & {
      brandName: string;
    }
  > = [];

  $(".item.product.product-item").each((_, element) => {
    let image = $(element).find("img.product-image-photo").attr("src");

    if (image) {
      image = image.replace(/\/cache\/[^/]+/, "");
    }

    const url = $(element).find(".product-item-link").attr("href");
    const brandName = toTitleCase(
      $(element).find(".product-brand").text().trim()
    );
    const name = $(element)
      .find(".product.name.product-item-name")
      .text()
      .trim();

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
        brandId: 0,
        image,
        brandName,
        price: {
          shopId: 2,
          productId: 0,
          url,
        },
      });
    }
  });

  console.log(
    "[Nacional Processor] Products obtained length=" + dbProducts.length
  );

  for (const product of dbProducts) {
    console.log(
      `[INFO] start process product=${product.name} ${product.unit} url=${product.price.url}`
    );

    const brandExist = await db.query.productsBrands.findFirst({
      where: (productsBrands, { eq }) =>
        eq(productsBrands.name, product.brandName),
    });

    const productExist = await db.query.products.findFirst({
      where: and(
        eq(products.name, product.name),
        eq(products.unit, product.unit)
      ),
      with: {
        shopCurrentPrices: true,
      },
    });

    if (!productExist) {
      if (!brandExist) {
        const brand = await db
          .insert(productsBrands)
          .values({ name: product.brandName })
          .returning();
        product.brandId = brand[0].id;
      } else {
        product.brandId = brandExist.id;
      }

      const insertedProduct = await db
        .insert(products)
        .values(product)
        .returning();
      product.price.productId = insertedProduct[0].id;
      await db.insert(productsShopsPrices).values(product.price);
      console.log(`[INFO] product don't exist inserted`);
      continue;
    }

    product.price.productId = productExist.id;

    if (!brandExist) {
      console.log(
        `[INFO] product exist but brand don't exist create a new product`
      );
      const brand = await db
        .insert(productsBrands)
        .values({ name: product.brandName })
        .returning();
      product.brandId = brand[0].id;
      const insertedProduct = await db
        .insert(products)
        .values(product)
        .returning();
      product.price.productId = insertedProduct[0].id;
      continue;
    }

    if (productExist.brandId === 19 || productExist.brandId === 30) {
      console.log(
        `[INFO] product exist but brand is a shop specific create a new product`
      );
      if (!brandExist) {
        const brand = await db
          .insert(productsBrands)
          .values({ name: product.brandName })
          .returning();
        product.brandId = brand[0].id;
      } else {
        product.brandId = brandExist.id;
      }
      const insertedProduct = await db
        .insert(products)
        .values(product)
        .returning();

      product.price.productId = insertedProduct[0].id;
    }

    await db
      .insert(productsShopsPrices)
      .values(product.price)
      .onConflictDoNothing();
    console.log(`[INFO] product 'exist' updated`);
  }

  await db.insert(unitTracker).values(unitTrackers).onConflictDoNothing();
}

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

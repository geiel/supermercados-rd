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
import { formatUnit } from "./utils";

export type NacionalExistingProduct = {
  existing: {
    id: number;
    name: string;
    unit: string;
    image: string | null;
    brandName: string;
  };
  incoming: {
    name: string;
    unit: string;
    image: string | null;
    brandName: string;
  };
};

export type NacionalExtractorResult = {
  existingProducts: NacionalExistingProduct[];
};

async function getHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  return await response.text();
}

export async function getProductListNacional(
  categoryId: number,
  url: string
): Promise<NacionalExtractorResult> {
  const html = await getHtml(url);

  const $ = cheerio.load(html);

  const unitTrackers: unitTrackerInsert[] = [];
  const dbProducts: Array<
    productsInsert & { price: productsShopsPricesInsert } & {
      brandName: string;
    }
  > = [];
  const existingProducts: NacionalExistingProduct[] = [];

  $(".item.product.product-item").each((_, element) => {
    let image = $(element).find("img.product-image-photo").attr("src");

    if (image) {
      image = image.replace(/\?.*$/, "");
    }

    const url = $(element).find(".product-item-link").attr("href");
    const brandName = toTitleCase(
      $(element).find(".product-item-brand").text().trim()
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
        brandId: 0,
        image,
        brandName,
        price: {
          shopId: 2,
          productId: 0,
          url: url,
        },
      });
    }
  });

  console.log(
    "[Nacional Processor] Products obtained length=" + dbProducts.length
  );

  for (const product of dbProducts) {
    console.log(
      `[INFO] start process product=${product.name} ${product.unit} url=${product.price.url} brand=${product.brandName}`
    );

    const brand = await getCreatedBrand(product.brandName);

    const productExist = await db.query.products.findFirst({
      where: and(
        eq(products.name, product.name),
        eq(products.unit, product.unit),
        eq(products.brandId, brand!.id)
      ),
      with: {
        shopCurrentPrices: true,
        brand: true,
      },
    });

    if (productExist) {
      existingProducts.push({
        existing: {
          id: productExist.id,
          name: productExist.name,
          unit: productExist.unit,
          image: productExist.image ?? null,
          brandName: productExist.brand?.name ?? brand!.name,
        },
        incoming: {
          name: product.name,
          unit: product.unit,
          image: product.image ?? null,
          brandName: brand!.name,
        },
      });
      console.log(`[INFO] product exist continue with next product`);
      continue;
    }

    product.brandId = brand!.id;

    const priceExist = await db.query.productsShopsPrices.findFirst({
      where: (prices, { eq }) => eq(prices.url, product.price.url),
    });

    if (priceExist) {
      console.log(`[INFO] product price exist continue with next product`);
      continue;
    }

    try {
      const insertedProduct = await db
        .insert(products)
        .values(product)
        .returning();
      product.price.productId = insertedProduct[0].id;

      await db.insert(productsShopsPrices).values(product.price);
      console.log(`[INFO] product don't exist inserted`);
    } catch (err) {
      console.log("[ERROR] Error when trying insert a new product", err);
    }
  }

  await db.insert(unitTracker).values(unitTrackers).onConflictDoNothing();

  return { existingProducts };
}

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function getCreatedBrand(brandName: string) {
  if (!brandName) {
    return await db.query.productsBrands.findFirst({
      where: eq(productsBrands.id, 53),
    });
  }

  const brandExist = await db.query.productsBrands.findFirst({
    where: (productsBrands, { eq }) => eq(productsBrands.name, brandName),
  });

  if (brandExist) {
    return brandExist;
  }

  return (
    await db.insert(productsBrands).values({ name: brandName }).returning()
  )[0];
}

export async function updateNacionalProductName(
  productId: number,
  name: string
) {
  const sanitizedName = name.trim();

  if (!sanitizedName) {
    throw new Error("El nombre no puede estar vacío.");
  }

  const updated = await db
    .update(products)
    .set({ name: sanitizedName })
    .where(eq(products.id, productId))
    .returning({
      id: products.id,
      name: products.name,
      unit: products.unit,
      image: products.image,
      brandId: products.brandId,
    });

  if (!updated[0]) {
    throw new Error("Producto no encontrado.");
  }

  const brand = await db.query.productsBrands.findFirst({
    where: eq(productsBrands.id, updated[0].brandId),
  });

  return {
    id: updated[0].id,
    name: updated[0].name,
    unit: updated[0].unit,
    image: updated[0].image,
    brandName: brand?.name ?? "",
  } satisfies NacionalExistingProduct["existing"];
}

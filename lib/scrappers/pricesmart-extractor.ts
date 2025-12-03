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
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { formatUnit } from "./utils";

const raw = JSON.stringify([
  {
    url: "https://www.pricesmart.com/es-do/categoria/Alimentos-G10D03/Granos-y-pasta-G10D35013/G10D35013",
    start: 24,
    q: "G10D35013",
    fq: [],
    search_type: "category",
    rows: 12,
    account_id: "7024",
    auth_key: "ev7libhybjg5h1d1",
    _br_uid_2: "uid=8784892088507:v=15.0:ts=1748828472969:hc=588",
    request_id: 1760361684690,
    domain_key: "pricesmart_bloomreach_io_es",
    fl: "pid,title,price,thumb_image,brand,slug,skuid,currency,fractionDigits,master_sku,sold_by_weight_DO,weight_DO,weight_uom_description_DO,sign_price_DO,price_per_uom_DO,uom_description_DO,availability_DO,price_DO,inventory_DO,inventory_DO,promoid_DO",
    view_id: "DO",
  },
]);

async function getProductList() {
  const response = await fetch(
    "https://www.pricesmart.com/api/br_discovery/getProductsByKeyword",
    {
      method: "POST",
      body: raw,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        Cookie:
          'ajs_anonymous_id=03c090a3-27b1-41fb-8973-4b9717ceec1e; _ga=GA1.1.392731082.1732413232; vsf-store=DO; vsf-channel=0e25b290-3d13-4806-927c-e3a218478565; _gcl_au=1.1.1062010446.1740428635; site_version=1; userPreferences=country=us; blue_ss="2c9788006afd6616"; vsf-currency=DOP; vsf-locale=es-do; __cf_bm=voannoRIjlSjOSUNaHkqJ05XR1pW55XL_KcyY9_Pln0-1746478469-1.0.1.1-RjDfFEFckSG8bwlslaKvd3kNa1_BYQOntwJaYKjqPgeTQtIT5JIj5lwhmM.kzCM3uhmxzV0hqoBOKO6WA5pP0qoeQCVtg8QYspZwTpRuMZE; _br_uid_2=uid%3D7086154559720%3Av%3D15.0%3Ats%3D1732413232358%3Ahc%3D333; _ga_W77R5TY7EF=GS2.1.s1746478473$o34$g1$t1746478530$j3$l0$h0; _ga_08PB3G3QJX=GS1.1.1746478473.33.1.1746478530.0.0.0; _ga_8YN502VNYX=GS1.1.1746478473.33.1.1746478530.0.0.0; vsf-country=do; __cf_bm=vEIm3BwoersSnDUZa.6KV_l9WmkUs2u7wiPFmalKf_M-1746478475-1.0.1.1-3d4SAlQf5aeh4uKUAAO2ZuHLb4ymHNOAAA7GQQrlMv8my0LZYGbqR8KD0IU6fLABRDf9zcC7GSU4P.6l_.b.ZwljjMIWllxyWhfM3fL2iG0',
      },
    }
  );

  const jsonResponse = await response.json();

  return z
    .object({
      response: z.object({
        docs: z.array(
          z.object({
            brand: z.string(),
            title: z.string(),
            thumb_image: z.string().optional(),
            slug: z.string(),
            pid: z.string(),
            master_sku: z.string(),
            variants: z.array(
              z.object({
                skuid: z.string(),
              })
            ),
          })
        ),
      }),
    })
    .parse(jsonResponse);
}

export async function getProductListPricesmart(categoryId: number) {
  const productsPriceSmart = (await getProductList()).response.docs;

  const unitTrackers: unitTrackerInsert[] = [];
  const dbProducts: Array<
    productsInsert & { price: productsShopsPricesInsert } & {
      brandName: string;
    }
  > = [];
  console.log("[Pricesmart Processor[ Start getting products");

  productsPriceSmart.forEach((p) => {
    const match = p.title.match(
      /(.+?)(?:\s+[\d.,]+\s*\w+(?:\s*\w+)?\s*\/\s*)?([\d.,]+\s*\w+(?:\s*\w+)?)$/
    );

    let productName = p.title;
    let unit = "Revisar";

    if (match) {
      productName = match[1].trim();
      unit = match[2].trim();
    }

    unitTrackers.push({
      unit: formatUnit(unit.toUpperCase()),
      productName,
    });

    dbProducts.push({
      name: productName,
      unit: unit.toUpperCase(),
      image: p.thumb_image,
      categoryId,
      brandId: 0,
      brandName: p.brand,
      price: {
        shopId: 5,
        productId: 0,
        url: `https://www.pricesmart.com/es-do/producto/${p.slug}/${p.master_sku}`,
        api: p.master_sku,
      },
    });
  });

  console.log(
    "[Pricesmart Processor] Products obtained length=" + dbProducts.length
  );

  for (const product of dbProducts) {
    console.log(
      `[INFO] start process product=${product.name} ${product.unit} url=${product.price.url}`
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
      },
    });

    if (productExist) {
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
  }

  await db.insert(unitTracker).values(unitTrackers).onConflictDoNothing();
}

async function getCreatedBrand(brandName: string) {
  if (!brandName) {
    return await db.query.productsBrands.findFirst({
      where: eq(productsBrands.id, 78),
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

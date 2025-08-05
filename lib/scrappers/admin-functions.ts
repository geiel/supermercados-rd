"use server";

import { db } from "@/db";
import {
  products,
  productsBrands,
  productsPricesHistory,
  productsShopsPrices,
  searchPhases,
} from "@/db/schema";
import { eq, sql, and, notInArray } from "drizzle-orm";
import { PERMITED_STOP_WORDS, STOP_WORDS, UNIT } from "../stopwords";
import { isNumeric } from "../utils";

export async function adminMergeProduct(
  parentProductId: number,
  childProductId: number
) {
  await db
    .update(productsPricesHistory)
    .set({ productId: parentProductId })
    .where(eq(productsPricesHistory.productId, childProductId));
  await db
    .update(productsShopsPrices)
    .set({
      productId: parentProductId,
    })
    .where(eq(productsShopsPrices.productId, childProductId));

  await db.delete(products).where(eq(products.id, childProductId));
}

export async function getSimilarProducts(
  categoryId: number,
  ignoredProducts: number[],
  ignoredBaseProducts: number[],
  threshold = 0.1
) {
  const duplicates = await db
    .select({
      id1: products.id,
      name1: products.name,
      image1: products.image,
      unit1: products.unit,
      brand1Name: sql`b1.name`.as<string>(),
      id2: sql`p2.id`.as<number>(),
      name2: sql`p2.name`.as<string>(),
      image2: sql`p2.image`.as<string>(),
      unit2: sql`p2.unit`.as<string>(),
      brand2Name: sql`b2.name`.as<string>(),
      sml: sql<number>`
        similarity(
          unaccent(lower(${products.name})),
          unaccent(lower(p2.name))
        )
      `.as("sml"),
    })
    .from(products)
    .innerJoin(
      sql`${products} AS p2`,
      sql`
        ${products.categoryId} IN (24, 12, 17)
        AND ${products.id} <> p2.id
        AND ${products.brandId} <> p2."brandId"
        AND similarity(
              unaccent(lower(${products.name})),
              unaccent(lower(p2.name))
            ) > ${threshold}
      `
    )
    .innerJoin(sql`${productsBrands} AS b1`, sql`${products}."brandId" = b1.id`)
    .innerJoin(sql`${productsBrands} AS b2`, sql`p2."brandId" = b2.id`)
    // .innerJoin(
    //   sql`${productsShopsPrices} AS ps2`,
    //   eq(sql`p2.id`, sql`ps2."productId"`)
    // )
    .where(
      and(
        // eq(products.categoryId, categoryId),

        eq(sql`p2."categoryId"`, categoryId),
        // eq(products.unit, sql`p2.unit`),
        eq(sql`p2."brandId"`, 30),
        notInArray(sql`p2.id`, ignoredProducts),
        notInArray(products.id, ignoredBaseProducts)
        // eq(sql`ps1."shopId"`, 2),
        // not(eq(shopPrice1.shopId, 3)),

        // sql`p2.name LIKE '%Vaquita%'`,
        // sql`unaccent(lower(p2.name)) NOT LIKE '%leche%'`,
        // sql`unaccent(lower(${products.name})) LIKE '%leche%'`
      )
    )
    .limit(200)
    .orderBy(sql`"sml" DESC`);

  return duplicates;
}

export async function deleteProductById(productId: number) {
  await db
    .update(products)
    .set({ deleted: true })
    .where(eq(products.id, productId));
  await db
    .update(productsShopsPrices)
    .set({ hidden: true })
    .where(eq(productsShopsPrices.productId, productId));
}

function tokenizeAndFilter(title: string): string[] {
  const noAccents = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const protectedFractions = noAccents.replace(/(\d+\/\d+)/g, "::$1::");
  const clean = protectedFractions.replace(/[^a-z0-9%/áéíóúñü\s:]/g, " ");
  const unwrapped = clean.replace(/::/g, "");

  const tokens = unwrapped.split(/\s+/).filter((tok) => tok.trim() !== "");

  return tokens.filter((tok) => !new Set(STOP_WORDS).has(tok));
}

function generateNgrams(tokens: string[]): Set<string> {
  const out = new Set<string>();

  // 1) Unigrams
  for (const t of tokens) {
    if (PERMITED_STOP_WORDS.includes(t)) {
      continue;
    }

    if (isNumeric(t)) {
      continue;
    }

    if (t.includes("/")) {
      continue;
    }

    out.add(t);
  }

  // 2) Adjacent bigrams
  for (let i = 0; i < tokens.length - 1; i++) {
    if (
      tokens[i] === tokens[i + 1] ||
      PERMITED_STOP_WORDS.includes(tokens[i + 1]) ||
      (isNumeric(tokens[1]) && isNumeric(tokens[i + 1])) ||
      isNumeric(tokens[i + 1])
    ) {
      continue;
    }

    if (!isNumeric(tokens[i]) && UNIT.includes(tokens[i + 1])) {
      continue;
    }

    out.add(tokens[i] + " " + tokens[i + 1]);
  }

  // 3) Adjacent trigrams
  for (let i = 0; i < tokens.length - 2; i++) {
    if (
      tokens[i] === tokens[i + 1] ||
      tokens[i] === tokens[i + 2] ||
      tokens[i + 1] === tokens[i + 2] ||
      PERMITED_STOP_WORDS.includes(tokens[i + 2]) ||
      (isNumeric(tokens[1]) && isNumeric(tokens[i + 1])) ||
      (isNumeric(tokens[i + 1]) && isNumeric(tokens[i + 2]))
    ) {
      continue;
    }

    if (!isNumeric(tokens[i + 1]) && UNIT.includes(tokens[i + 2])) {
      continue;
    }

    out.add(tokens[i] + " " + tokens[i + 1] + " " + tokens[i + 2]);
  }

  // 4) Adjacent 4-grams
  for (let i = 0; i < tokens.length - 3; i++) {
    const t1 = tokens[i];
    const t2 = tokens[i + 1];
    const t3 = tokens[i + 2];
    const t4 = tokens[i + 3];

    if (isNumeric(t4)) {
      continue;
    }
    if (PERMITED_STOP_WORDS.includes(t4)) {
      continue;
    }
    const quartet = [t1, t2, t3, t4];
    const uniqueCount = new Set(quartet).size;
    if (uniqueCount < 4) {
      continue;
    }

    if (!isNumeric(t3) && UNIT.includes(t4)) {
      continue;
    }

    out.add(`${t1} ${t2} ${t3} ${t4}`);
  }

  return out;
}

function extractSearchPhrases(productName: string): string[] {
  const contentTokens = tokenizeAndFilter(productName);
  const phraseSet = generateNgrams(contentTokens);
  return Array.from(phraseSet);
}

export async function refreshPhrases() {
  console.log("[INFO] Start inserting");

  const products = await db.query.products.findMany({
    columns: { name: true },
  });
  const total = products.length;
  console.log(`[INFO] Found ${total} products to process.`);

  const BATCH_SIZE = 300;

  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const batch = products.slice(offset, offset + BATCH_SIZE);

    await Promise.all(
      batch.map(async (product) => {
        const phrases = extractSearchPhrases(product.name);
        for (const phrase of phrases) {
          await db
            .insert(searchPhases)
            .values({ phrase })
            .onConflictDoNothing();
        }
      })
    );

    const done = Math.min(offset + BATCH_SIZE, total);
    const pct = (done / total) * 100;
    console.log(
      `[INFO] ${done}/${total} products processed (${pct.toFixed(1)}%)`
    );
  }
}

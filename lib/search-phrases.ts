"use server";

import { db } from "@/db";
import { products, productsBrands, searchPhases } from "@/db/schema";
import { STOP_WORDS } from "./stopwords";
import { sanitizeForTsQuery } from "./utils";
import { sql } from "drizzle-orm";

const SPECIAL_BRAND_IDS = new Set([80, 19, 69, 30]);
const SIMILARITY_THRESHOLD = 0.4;
const BATCH_SIZE = 100;

type ProductWithBrand = Awaited<ReturnType<typeof fetchProductBatch>>[number];

const STOP_WORDS_SOURCE = STOP_WORDS as string | string[];
const rawStopWords =
  typeof STOP_WORDS_SOURCE === "string"
    ? STOP_WORDS_SOURCE.split(/\s+/)
    : STOP_WORDS_SOURCE;

const STOP_WORD_SET = new Set(
  rawStopWords.map((word) => normalizeToken(word)).filter(Boolean)
);

export async function refreshPhrases() {
  console.log("[INFO] Start refreshing search phrases");

  const total = await countProducts();
  console.log(`[INFO] Found ${total} products to process.`);

  let processed = 0;

  while (true) {
    const batch = await fetchProductBatch(processed, BATCH_SIZE);
    if (batch.length === 0) {
      break;
    }

    for (const product of batch) {
      const phrases = await buildPhrasesForProduct(product);
      if (phrases.length === 0) {
        continue;
      }

      await db
        .insert(searchPhases)
        .values(phrases.map((phrase) => ({ phrase })))
        .onConflictDoNothing();
    }

    processed += batch.length;
    const pct = total === 0 ? 100 : (processed / total) * 100;
    console.log(
      `[INFO] ${processed}/${total} products processed (${pct.toFixed(1)}%)`
    );
  }

  console.log("[INFO] Search phrases refresh complete");
}

async function buildPhrasesForProduct(product: ProductWithBrand) {
  const brand = await resolveBrand(product);
  const description = buildDescriptionWithoutBrand(product.name, brand);
  if (!description) {
    return [];
  }

  const truncated = truncateAtStopword(description);
  return buildPhraseVariants(description, truncated, brand);
}

function buildPhraseVariants(
  description: string,
  truncated: string,
  brand: string | null
) {
  const phrases = new Set<string>();
  const normalizedDescription = normalizeWhitespace(description);

  if (normalizedDescription) {
    phrases.add(normalizedDescription);
  }

  if (brand && normalizedDescription) {
    const normalizedBrand = normalizeWhitespace(brand);
    phrases.add(`${normalizedDescription} ${normalizedBrand}`.trim());
    phrases.add(`${normalizedBrand} ${normalizedDescription}`.trim());
  }

  if (truncated) {
    phrases.add(normalizeWhitespace(truncated));
  }

  return Array.from(phrases).filter(Boolean);
}

async function resolveBrand(product: ProductWithBrand) {
  if (!product.brand) {
    return null;
  }

  if (!SPECIAL_BRAND_IDS.has(product.brandId)) {
    return normalizePhrase(product.brand.name);
  }

  const inferred = await findBestBrandMatch(product.name);
  if (!inferred || inferred.similarity < SIMILARITY_THRESHOLD) {
    return null;
  }

  return normalizePhrase(inferred.name);
}

async function findBestBrandMatch(productName: string) {
  const searchTerm = sanitizeForTsQuery(productName);
  if (!searchTerm) {
    return null;
  }

  const query = sql`
    SELECT
      id,
      name,
      similarity(unaccent(lower(name)), unaccent(lower(${productName}))) AS sim
    FROM ${productsBrands}
    WHERE to_tsvector('simple', unaccent(lower(name))) @@ plainto_tsquery('simple', unaccent(lower(${searchTerm})))
    ORDER BY sim DESC
    LIMIT 1
  `;

  const response: { rows: { id: number; name: string; sim: number }[] } =
    await db.execute(query);

  const match = response.rows[0];
  if (!match) {
    return null;
  }

  return {
    id: match.id,
    name: match.name,
    similarity: Number(match.sim),
  };
}

function buildDescriptionWithoutBrand(productName: string, brand: string | null) {
  const normalizedName = normalizePhrase(productName);
  if (!brand) {
    return normalizedName;
  }

  let description = normalizedName;
  const escapedBrand = escapeRegExp(brand);
  if (escapedBrand) {
    description = description.replace(new RegExp(`\\b${escapedBrand}\\b`, "g"), " ");
  }

  for (const token of brand.split(" ")) {
    if (!token) continue;
    const escapedToken = escapeRegExp(token);
    description = description.replace(new RegExp(`\\b${escapedToken}\\b`, "g"), " ");
  }

  return normalizeWhitespace(description);
}

function truncateAtStopword(description: string) {
  if (!description) return "";

  const tokens = description.split(/\s+/);
  const kept: string[] = [];

  for (const token of tokens) {
    const normalized = normalizeToken(token);
    if (!normalized) {
      continue;
    }

    if (STOP_WORD_SET.has(normalized)) {
      break;
    }

    kept.push(token);
  }

  return normalizeWhitespace(kept.join(" "));
}

async function countProducts() {
  const result: { rows: { value: number }[] } = await db.execute(
    sql`SELECT COUNT(*)::int AS value FROM ${products}`
  );

  const row = result.rows[0];
  return row ? Number(row.value) : 0;
}

async function fetchProductBatch(offset: number, limit: number) {
  return db.query.products.findMany({
    offset,
    limit,
    orderBy: (product, { asc }) => asc(product.id),
    with: { brand: true },
  });
}

function normalizePhrase(value: string) {
  return normalizeWhitespace(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
  );
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

"use server";

import { db } from "@/db";
import { products, productsBrands } from "@/db/schema";
import { and, eq, inArray, isNull, not, notInArray, or, sql } from "drizzle-orm";

const CANDIDATE_BRAND_IDS = [80, 30, 69, 19];
const AUTO_ASSIGN_IGNORED_BRAND_IDS = [
  10, 105, 149, 150, 1711, 208, 246, 351, 433, 675, 684, 818, 854, 963, 964,
  1187, 1422, 1478, 1492, 1523, 1544, 1739, 1782, 1980,
];

export type BrandAssignmentCandidate = {
  id: number;
  name: string;
  image: string | null;
  unit: string;
  brandId: number;
  brandName: string;
};

export type AutoAssignSummary = {
  candidateCount: number;
  assignedCount: number;
  unmatchedCount: number;
  multipleMatchCount: number;
};

type BrandMatcher = {
  id: number;
  name: string;
  words: string[];
  wordCount: number;
  normalizedLength: number;
};

function normalizeApostrophes(text: string): string {
  return text.replace(/[\u00b4\u2019`]/g, "'");
}

function normalizeToWords(text: string): string[] {
  return normalizeApostrophes(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u00b4\u2019`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function matchesAtIndex(
  productWords: string[],
  brandWords: string[],
  startIndex: number
): boolean {
  if (startIndex + brandWords.length > productWords.length) {
    return false;
  }

  for (let i = 0; i < brandWords.length; i += 1) {
    if (productWords[startIndex + i] !== brandWords[i]) {
      return false;
    }
  }

  return true;
}

function compareBrandMatch(a: BrandMatcher, b: BrandMatcher) {
  if (a.wordCount !== b.wordCount) {
    return a.wordCount - b.wordCount;
  }

  if (a.normalizedLength !== b.normalizedLength) {
    return a.normalizedLength - b.normalizedLength;
  }

  return b.id - a.id;
}

function pickBestMatch(candidates: BrandMatcher[]): BrandMatcher | null {
  if (candidates.length === 0) {
    return null;
  }

  let best = candidates[0];

  for (const candidate of candidates.slice(1)) {
    if (compareBrandMatch(candidate, best) > 0) {
      best = candidate;
    }
  }

  return best;
}

function buildBrandIndex(
  brands: { id: number; name: string }[]
): Map<string, BrandMatcher[]> {
  const index = new Map<string, BrandMatcher[]>();

  for (const brand of brands) {
    const words = normalizeToWords(brand.name);
    if (words.length === 0) {
      continue;
    }

    const matcher: BrandMatcher = {
      id: brand.id,
      name: brand.name,
      words,
      wordCount: words.length,
      normalizedLength: words.join(" ").length,
    };

    const firstWord = words[0];
    const list = index.get(firstWord);
    if (list) {
      list.push(matcher);
    } else {
      index.set(firstWord, [matcher]);
    }
  }

  return index;
}

function findBrandMatch(
  productName: string,
  index: Map<string, BrandMatcher[]>
) {
  const productWords = normalizeToWords(productName);
  if (productWords.length === 0) {
    return { match: null, matchCount: 0 };
  }

  const matches = new Map<number, BrandMatcher>();

  for (let i = 0; i < productWords.length; i += 1) {
    const candidates = index.get(productWords[i]);
    if (!candidates) {
      continue;
    }

    for (const candidate of candidates) {
      if (matches.has(candidate.id)) {
        continue;
      }

      if (matchesAtIndex(productWords, candidate.words, i)) {
        matches.set(candidate.id, candidate);
      }
    }
  }

  const matchesArray = Array.from(matches.values());
  const match = pickBestMatch(matchesArray);

  return {
    match,
    matchCount: matchesArray.length,
  };
}

async function applyPossibleBrandUpdates(
  updates: { productId: number; brandId: number }[]
) {
  if (updates.length === 0) {
    return;
  }

  const batchSize = 10;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    const values = sql.join(
      batch.map(
        (row) => sql`(${row.productId}::int, ${row.brandId}::int)`
      ),
      sql`, `
    );

    await db.execute(sql`
      UPDATE ${products} AS p
      SET "possibleBrandId" = v.brand_id
      FROM (VALUES ${values}) AS v(product_id, brand_id)
      WHERE p.id = v.product_id
        AND p."possibleBrandId" IS NULL
    `);
  }
}

export async function fetchBrandAssignmentCandidates(): Promise<
  BrandAssignmentCandidate[]
> {
  return db
    .select({
      id: products.id,
      name: products.name,
      image: products.image,
      unit: products.unit,
      brandId: products.brandId,
      brandName: productsBrands.name,
    })
    .from(products)
    .innerJoin(productsBrands, eq(products.brandId, productsBrands.id))
    .where(
      and(
        inArray(products.brandId, CANDIDATE_BRAND_IDS),
        isNull(products.possibleBrandId),
        not(inArray(products.categoryId, [1, 2])),
        or(eq(products.deleted, false), isNull(products.deleted))
      )
    )
    .orderBy(products.id).limit(100);
}

export async function autoAssignPossibleBrands(): Promise<AutoAssignSummary> {
  const candidates = await db
    .select({
      id: products.id,
      name: products.name,
    })
    .from(products)
    .where(
      and(
        inArray(products.brandId, CANDIDATE_BRAND_IDS),
        not(eq(products.categoryId, 1)),
        isNull(products.possibleBrandId),
        or(eq(products.deleted, false), isNull(products.deleted))
      )
    ).limit(50);


  console.log("Auto-assign candidates count:", candidates.length);

  if (candidates.length === 0) {
    return {
      candidateCount: 0,
      assignedCount: 0,
      unmatchedCount: 0,
      multipleMatchCount: 0,
    };
  }

  const brands = await db
    .select({
      id: productsBrands.id,
      name: productsBrands.name,
    })
    .from(productsBrands)
    .where(notInArray(productsBrands.id, AUTO_ASSIGN_IGNORED_BRAND_IDS));

  console.log("brands for matching count:", brands.length);

  const index = buildBrandIndex(brands);

  console.log("Brand index size:", index.size);

  const updates: { productId: number; brandId: number }[] = [];
  let unmatchedCount = 0;
  let multipleMatchCount = 0;

  for (const candidate of candidates) {
    const { match, matchCount } = findBrandMatch(candidate.name, index);

    console.log(`Candidate ID=${candidate.id} Name="${candidate.name}" => MatchCount=${matchCount} MatchedBrand=${match ? match.name : "null"}`);
    if (!match) {
      unmatchedCount += 1;
      continue;
    }

    if (matchCount > 1) {
      multipleMatchCount += 1;
    }

    updates.push({
      productId: candidate.id,
      brandId: match.id,
    });
  }

  console.log("Prepared updates count:", updates.length);

  await applyPossibleBrandUpdates(updates);

  return {
    candidateCount: candidates.length,
    assignedCount: updates.length,
    unmatchedCount,
    multipleMatchCount,
  };
}

export async function setPossibleBrandAssignment(
  productId: number,
  possibleBrandId: number
) {
  const result = await db
    .update(products)
    .set({ possibleBrandId })
    .where(eq(products.id, productId))
    .returning({ id: products.id });

  if (result.length === 0) {
    throw new Error("Product not found.");
  }

  return result[0];
}

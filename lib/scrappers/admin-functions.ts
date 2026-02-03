"use server";

import { db } from "@/db";
import {
  productBrokenImages,
  products,
  productsBrands,
  productsGroups,
  productsPricesHistory,
  productsShopsPrices,
  productsVisibilityHistory,
  todaysDeals,
} from "@/db/schema";
import { eq, sql, and, inArray, notInArray } from "drizzle-orm";
import { searchProducts } from "@/lib/search-query";
import { sanitizeForTsQuery } from "@/lib/utils";
import { validateAdminUser } from "../authentication";

const DEFAULT_BRAND_SEARCH_LIMIT = 600;
const DEFAULT_BRAND_SEARCH_PAGE_SIZE = 200;
const DEFAULT_BRAND_PAIR_LIMIT = 50;

async function getBrandCandidateIds(
  brandName: string,
  maxResults: number,
  pageSize: number
) {
  const sanitizedQuery = sanitizeForTsQuery(brandName);
  if (!sanitizedQuery) {
    return [];
  }

  const ids = new Set<number>();
  let offset = 0;

  while (ids.size < maxResults) {
    const { products } = await searchProducts(
      sanitizedQuery,
      pageSize,
      offset,
      true,
      undefined,
      true
    );

    if (products.length === 0) {
      break;
    }

    for (const product of products) {
      ids.add(product.id);
      if (ids.size >= maxResults) {
        break;
      }
    }

    if (products.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return Array.from(ids);
}

export async function adminMergeProduct(
  parentProductId: number,
  childProductId: number
) {
  await db
    .update(productsPricesHistory)
    .set({ productId: parentProductId })
    .where(eq(productsPricesHistory.productId, childProductId));
  await db
    .update(productsVisibilityHistory)
    .set({ productId: parentProductId })
    .where(eq(productsVisibilityHistory.productId, childProductId));
  await db
    .update(productsShopsPrices)
    .set({
      productId: parentProductId,
    })
    .where(eq(productsShopsPrices.productId, childProductId));

  await db.delete(todaysDeals).where(eq(todaysDeals.productId, childProductId));
  await db.delete(productsGroups).where(eq(productsGroups.productId, childProductId));
  await db.delete(productBrokenImages).where(eq(productBrokenImages.productId, childProductId));
  await db.delete(products).where(eq(products.id, childProductId));
}

export async function getSimilarProducts(
  categoryId: number,
  ignoredProducts: number[],
  ignoredBaseProducts: number[],
  ignoredWords: string[] = [],
  threshold = 0.1
) {
  const normalize = (word: string) =>
    word
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const sanitizedIgnoredWords = ignoredWords
    .map(normalize)
    .filter((word) => word.length > 0);

  const ignoredWordConditions = sanitizedIgnoredWords.map((word) =>
    and(
      sql`unaccent(lower(${products.name})) NOT LIKE ${`%${word}%`}`,
      sql`unaccent(lower(p2.name)) NOT LIKE ${`%${word}%`}`
    )
  );

  const duplicates = await db
    .select({
      id1: products.id,
      name1: products.name,
      image1: products.image,
      unit1: products.unit,
      deleted1: products.deleted,
      brand1Name: sql`b1.name`.as<string>(),
      id2: sql`p2.id`.as<number>(),
      name2: sql`p2.name`.as<string>(),
      image2: sql`p2.image`.as<string>(),
      unit2: sql`p2.unit`.as<string>(),
      brand2Name: sql`b2.name`.as<string>(),
      deleted2: sql`p2.deleted`.as<boolean>(),
      sml: sql<number>`
        similarity(
          unaccent(lower(${products.name})),
          unaccent(lower(p2.name))
        )
      `.as("sml"),
      totalSimilar: sql<number>`COUNT(*) OVER ()`.as("totalSimilar"),
    })
    .from(products)
    .innerJoin(
      sql`${products} AS p2`,
      sql`
        ${products.categoryId} IN (24)
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
        eq(sql`p2."brandId"`, 19),
        notInArray(sql`p2.id`, ignoredProducts),
        notInArray(products.id, ignoredBaseProducts),
        ...ignoredWordConditions
        // eq(sql`ps1."shopId"`, 2),
        // not(eq(shopPrice1.shopId, 3)),

        // sql`p2.name LIKE '%Vaquita%'`,
        // sql`unaccent(lower(p2.name)) NOT LIKE '%leche%'`,
        // sql`unaccent(lower(${products.name})) LIKE '%leche%'`
      )
    )
    .limit(15)
    .orderBy(sql`"sml" DESC`);

  return duplicates;
}

export async function getBrandSimilarProducts(
  brandName: string,
  ignoredProductIds: number[],
  ignoredWords: string[] = [],
  threshold = 0.1,
  maxCandidates = DEFAULT_BRAND_SEARCH_LIMIT,
  pairLimit = DEFAULT_BRAND_PAIR_LIMIT
) {
  const candidateIds = await getBrandCandidateIds(
    brandName,
    maxCandidates,
    DEFAULT_BRAND_SEARCH_PAGE_SIZE
  );

  if (candidateIds.length < 2) {
    return [];
  }

  const normalize = (word: string) =>
    word
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const sanitizedIgnoredWords = ignoredWords
    .map(normalize)
    .filter((word) => word.length > 0);

  const ignoredWordConditions = sanitizedIgnoredWords.map((word) =>
    and(
      sql`unaccent(lower(${products.name})) NOT LIKE ${`%${word}%`}`,
      sql`unaccent(lower(p2.name)) NOT LIKE ${`%${word}%`}`
    )
  );

  const conditions = [
    inArray(products.id, candidateIds),
    inArray(sql`p2.id`, candidateIds),
    sql`EXISTS (
      SELECT 1
      FROM ${productsShopsPrices} ps
      WHERE ps."productId" = ${products.id}
    )`,
    sql`EXISTS (
      SELECT 1
      FROM ${productsShopsPrices} ps
      WHERE ps."productId" = p2.id
    )`,
    sql`NOT EXISTS (
      SELECT 1
      FROM ${productsShopsPrices} ps1
      JOIN ${productsShopsPrices} ps2
        ON ps1."shopId" = ps2."shopId"
      WHERE ps1."productId" = ${products.id}
        AND ps2."productId" = p2.id
    )`,
    ...ignoredWordConditions,
  ];

  if (ignoredProductIds.length > 0) {
    conditions.push(notInArray(products.id, ignoredProductIds));
    conditions.push(notInArray(sql`p2.id`, ignoredProductIds));
  }

  const duplicates = await db
    .select({
      id1: products.id,
      name1: products.name,
      image1: products.image,
      unit1: products.unit,
      deleted1: products.deleted,
      brand1Name: sql`b1.name`.as<string>(),
      id2: sql`p2.id`.as<number>(),
      name2: sql`p2.name`.as<string>(),
      image2: sql`p2.image`.as<string>(),
      unit2: sql`p2.unit`.as<string>(),
      brand2Name: sql`b2.name`.as<string>(),
      deleted2: sql`p2.deleted`.as<boolean>(),
      unitMatch: sql<number>`CASE WHEN ${products.unit} = p2.unit THEN 1 ELSE 0 END`.as(
        "unitMatch"
      ),
      sml: sql<number>`
        similarity(
          unaccent(lower(${products.name})),
          unaccent(lower(p2.name))
        )
      `.as("sml"),
      totalSimilar: sql<number>`COUNT(*) OVER ()`.as("totalSimilar"),
    })
    .from(products)
    .innerJoin(
      sql`${products} AS p2`,
      sql`
        ${products.id} < p2.id
        AND similarity(
              unaccent(lower(${products.name})),
              unaccent(lower(p2.name))
            ) > ${threshold}
      `
    )
    .innerJoin(sql`${productsBrands} AS b1`, sql`${products}."brandId" = b1.id`)
    .innerJoin(sql`${productsBrands} AS b2`, sql`p2."brandId" = b2.id`)
    .where(and(...conditions))
    .limit(pairLimit)
    .orderBy(sql`"unitMatch" DESC`, sql`"sml" DESC`);

  return duplicates;
}

export async function deleteProductById(productId: number) {
  await validateAdminUser();

  await db
    .update(products)
    .set({ deleted: true })
    .where(eq(products.id, productId));
  await db
    .update(productsShopsPrices)
    .set({ hidden: true })
    .where(eq(productsShopsPrices.productId, productId));
}

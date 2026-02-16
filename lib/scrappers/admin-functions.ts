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
  unverfiedProducts,
} from "@/db/schema";
import { eq, sql, and, inArray, notInArray, type SQL } from "drizzle-orm";
import { searchProducts } from "@/lib/search-query";
import { sanitizeForTsQuery } from "@/lib/utils";
import { validateAdminUser } from "../authentication";

const DEFAULT_BRAND_SEARCH_LIMIT = 600;
const DEFAULT_BRAND_SEARCH_PAGE_SIZE = 200;
const DEFAULT_BRAND_PAIR_LIMIT = 50;
const DEFAULT_SIMILAR_PRODUCTS_PAIR_LIMIT = 15;
const DEFAULT_SIMILAR_PRODUCTS_QUERY_LIMIT = 40;

export type ProductSource = "products" | "unverified_products";

export type SimilarProductsIgnoredIds = {
  products: number[];
  unverifiedProducts: number[];
  baseUnverifiedProducts: number[];
};

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

async function mergeProductsInProductsTable(
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
  ignoredIds: SimilarProductsIgnoredIds,
  ignoredWords: string[] = [],
  threshold = 0.1
) {
  await validateAdminUser();

  const normalize = (word: string) =>
    word
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const sanitizedIgnoredWords = ignoredWords
    .map(normalize)
    .filter((word) => word.length > 0);

  const ignoredProducts = Array.from(new Set(ignoredIds.products));
  const ignoredUnverifiedProducts = Array.from(
    new Set(ignoredIds.unverifiedProducts)
  );
  const ignoredBaseUnverifiedProducts = Array.from(
    new Set(ignoredIds.baseUnverifiedProducts)
  );

  const ignoredWordConditionsForUnverifiedPairs = sanitizedIgnoredWords.map(
    (word) =>
      and(
        sql`unaccent(lower(${unverfiedProducts.name})) NOT LIKE ${`%${word}%`}`,
        sql`unaccent(lower(p2.name)) NOT LIKE ${`%${word}%`}`
      ) as SQL
  );

  const ignoredWordConditionsForCrossPairs = sanitizedIgnoredWords.map(
    (word) =>
      and(
        sql`unaccent(lower(${unverfiedProducts.name})) NOT LIKE ${`%${word}%`}`,
        sql`unaccent(lower(p2.name)) NOT LIKE ${`%${word}%`}`
      ) as SQL
  );

  const unverifiedPairConditions: SQL[] = [
    eq(unverfiedProducts.categoryId, categoryId),
    eq(sql`p2."categoryId"`, categoryId),
    ...ignoredWordConditionsForUnverifiedPairs,
  ];

  if (ignoredBaseUnverifiedProducts.length > 0) {
    unverifiedPairConditions.push(
      notInArray(unverfiedProducts.id, ignoredBaseUnverifiedProducts)
    );
  }

  if (ignoredUnverifiedProducts.length > 0) {
    unverifiedPairConditions.push(notInArray(sql`p2.id`, ignoredUnverifiedProducts));
  }

  const unverifiedToProductsConditions: SQL[] = [
    eq(unverfiedProducts.categoryId, categoryId),
    eq(sql`p2."categoryId"`, categoryId),
    ...ignoredWordConditionsForCrossPairs,
  ];

  if (ignoredBaseUnverifiedProducts.length > 0) {
    unverifiedToProductsConditions.push(
      notInArray(unverfiedProducts.id, ignoredBaseUnverifiedProducts)
    );
  }

  if (ignoredProducts.length > 0) {
    unverifiedToProductsConditions.push(notInArray(sql`p2.id`, ignoredProducts));
  }

  const unverifiedPairs = await db
    .select({
      id1: unverfiedProducts.id,
      name1: unverfiedProducts.name,
      image1: unverfiedProducts.image,
      unit1: unverfiedProducts.unit,
      deleted1: unverfiedProducts.deleted,
      brand1Name: sql`b1.name`.as<string>(),
      source1: sql<ProductSource>`'unverified_products'`.as("source1"),
      id2: sql`p2.id`.as<number>(),
      name2: sql`p2.name`.as<string>(),
      image2: sql`p2.image`.as<string | null>(),
      unit2: sql`p2.unit`.as<string>(),
      brand2Name: sql`b2.name`.as<string>(),
      deleted2: sql`p2.deleted`.as<boolean | null>(),
      source2: sql<ProductSource>`'unverified_products'`.as("source2"),
      sml: sql<number>`
        similarity(
          unaccent(lower(${unverfiedProducts.name})),
          unaccent(lower(p2.name))
        )
      `.as("sml"),
    })
    .from(unverfiedProducts)
    .innerJoin(
      sql`${unverfiedProducts} AS p2`,
      sql`
        ${unverfiedProducts.id} < p2.id
        AND similarity(
          unaccent(lower(${unverfiedProducts.name})),
          unaccent(lower(p2.name))
        ) > ${threshold}
      `
    )
    .innerJoin(
      sql`${productsBrands} AS b1`,
      sql`${unverfiedProducts}."brandId" = b1.id`
    )
    .innerJoin(sql`${productsBrands} AS b2`, sql`p2."brandId" = b2.id`)
    .where(and(...unverifiedPairConditions))
    .limit(DEFAULT_SIMILAR_PRODUCTS_QUERY_LIMIT)
    .orderBy(sql`"sml" DESC`);

  const unverifiedToProductsPairs = await db
    .select({
      id1: unverfiedProducts.id,
      name1: unverfiedProducts.name,
      image1: unverfiedProducts.image,
      unit1: unverfiedProducts.unit,
      deleted1: unverfiedProducts.deleted,
      brand1Name: sql`b1.name`.as<string>(),
      source1: sql<ProductSource>`'unverified_products'`.as("source1"),
      id2: sql`p2.id`.as<number>(),
      name2: sql`p2.name`.as<string>(),
      image2: sql`p2.image`.as<string | null>(),
      unit2: sql`p2.unit`.as<string>(),
      brand2Name: sql`b2.name`.as<string>(),
      deleted2: sql`p2.deleted`.as<boolean | null>(),
      source2: sql<ProductSource>`'products'`.as("source2"),
      sml: sql<number>`
        similarity(
          unaccent(lower(${unverfiedProducts.name})),
          unaccent(lower(p2.name))
        )
      `.as("sml"),
    })
    .from(unverfiedProducts)
    .innerJoin(
      sql`${products} AS p2`,
      sql`
        similarity(
          unaccent(lower(${unverfiedProducts.name})),
          unaccent(lower(p2.name))
        ) > ${threshold}
      `
    )
    .innerJoin(
      sql`${productsBrands} AS b1`,
      sql`${unverfiedProducts}."brandId" = b1.id`
    )
    .innerJoin(sql`${productsBrands} AS b2`, sql`p2."brandId" = b2.id`)
    .where(and(...unverifiedToProductsConditions))
    .limit(DEFAULT_SIMILAR_PRODUCTS_QUERY_LIMIT)
    .orderBy(sql`"sml" DESC`);

  const combined = [...unverifiedPairs, ...unverifiedToProductsPairs].sort(
    (a, b) => Number(b.sml) - Number(a.sml)
  );

  const totalSimilar = combined.length;

  return combined
    .slice(0, DEFAULT_SIMILAR_PRODUCTS_PAIR_LIMIT)
    .map((row) => ({ ...row, totalSimilar }));
}

export async function adminMergeProduct(
  parentProductId: number,
  childProductId: number
) {
  await validateAdminUser();
  await mergeProductsInProductsTable(parentProductId, childProductId);
}

export async function adminMergeProductBySource(
  parentProductId: number,
  parentSource: ProductSource,
  childProductId: number,
  childSource: ProductSource
) {
  await validateAdminUser();

  if (parentProductId === childProductId && parentSource === childSource) {
    return;
  }

  if (parentSource === "products" && childSource === "products") {
    await mergeProductsInProductsTable(parentProductId, childProductId);
    return;
  }

  if (parentSource === "products" && childSource === "unverified_products") {
    await db.delete(unverfiedProducts).where(eq(unverfiedProducts.id, childProductId));
    return;
  }

  if (
    parentSource === "unverified_products" &&
    childSource === "unverified_products"
  ) {
    await db.delete(unverfiedProducts).where(eq(unverfiedProducts.id, childProductId));
    return;
  }

  throw new Error(
    "When merging across tables, the verified product must be the parent."
  );
}

export async function getBrandSimilarProducts(
  brandName: string,
  ignoredProductIds: number[],
  ignoredWords: string[] = [],
  threshold = 0.1,
  maxCandidates = DEFAULT_BRAND_SEARCH_LIMIT,
  pairLimit = DEFAULT_BRAND_PAIR_LIMIT
) {
  await validateAdminUser();

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

export type PromoteUnverifiedProductsSummary = {
  requested: number;
  found: number;
  promoted: number;
  duplicates: number;
  removed: number;
};

async function promoteUnverifiedProductsByIds(
  productIds: number[]
): Promise<PromoteUnverifiedProductsSummary> {
  const normalizedIds = Array.from(
    new Set(
      productIds.filter((productId) => Number.isInteger(productId) && productId > 0)
    )
  );

  if (normalizedIds.length === 0) {
    return {
      requested: 0,
      found: 0,
      promoted: 0,
      duplicates: 0,
      removed: 0,
    };
  }

  return db.transaction(async (tx) => {
    const pendingProducts = await tx.query.unverfiedProducts.findMany({
      where: inArray(unverfiedProducts.id, normalizedIds),
      columns: {
        id: true,
        categoryId: true,
        name: true,
        image: true,
        unit: true,
        brandId: true,
        deleted: true,
        rank: true,
        relevance: true,
        possibleBrandId: true,
        baseUnit: true,
        baseUnitAmount: true,
      },
    });

    let promoted = 0;
    let duplicates = 0;
    let removed = 0;

    for (const pendingProduct of pendingProducts) {
      const inserted = await tx
        .insert(products)
        .values({
          categoryId: pendingProduct.categoryId,
          name: pendingProduct.name,
          image: pendingProduct.image,
          unit: pendingProduct.unit,
          brandId: pendingProduct.brandId,
          deleted: pendingProduct.deleted,
          rank: pendingProduct.rank,
          relevance: pendingProduct.relevance,
          possibleBrandId: pendingProduct.possibleBrandId,
          baseUnit: pendingProduct.baseUnit,
          baseUnitAmount: pendingProduct.baseUnitAmount,
        })
        .onConflictDoNothing()
        .returning({ id: products.id });

      if (inserted.length > 0) {
        promoted += 1;
      } else {
        duplicates += 1;
      }

      await tx
        .delete(unverfiedProducts)
        .where(eq(unverfiedProducts.id, pendingProduct.id));
      removed += 1;
    }

    return {
      requested: normalizedIds.length,
      found: pendingProducts.length,
      promoted,
      duplicates,
      removed,
    };
  });
}

export async function promoteSelectedUnverifiedProducts(productIds: number[]) {
  await validateAdminUser();
  return promoteUnverifiedProductsByIds(productIds);
}

export async function promoteAllUnverifiedProducts() {
  await validateAdminUser();

  const allUnverifiedProductIds = await db
    .select({ id: unverfiedProducts.id })
    .from(unverfiedProducts);

  return promoteUnverifiedProductsByIds(
    allUnverifiedProductIds.map((row) => row.id)
  );
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

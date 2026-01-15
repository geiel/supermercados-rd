import "server-only";

import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  homePageCategories,
  homePageCategoriesProducts,
  products,
  productsBrands,
  productsShopsPrices,
} from "@/db/schema";

export type HomePageCategoryProduct = {
  productId: number;
  name: string;
  unit: string;
  image: string | null;
  brandName: string;
  possibleBrandName: string | null;
  currentPrice: string;
  amountOfShops: number;
};

export type HomePageCategoryWithProducts = {
  id: number;
  name: string;
  description: string | null;
  products: HomePageCategoryProduct[];
  total: number;
};

export type CategoryProductsResponse = {
  products: HomePageCategoryProduct[];
  total: number;
  nextOffset: number;
};

export async function getHomePageCategories(
  productLimit: number
): Promise<HomePageCategoryWithProducts[]> {
  const categories = await db.query.homePageCategories.findMany({
    orderBy: (categories, { asc }) => asc(categories.id),
  });

  if (categories.length === 0) {
    return [];
  }

  const result: HomePageCategoryWithProducts[] = [];

  for (const category of categories) {
    const categoryProducts = await getCategoryProducts({
      categoryId: category.id,
      offset: 0,
      limit: productLimit,
    });

    if (categoryProducts.total > 0) {
      result.push({
        id: category.id,
        name: category.name,
        description: category.description,
        products: categoryProducts.products,
        total: categoryProducts.total,
      });
    }
  }

  return result;
}

type GetCategoryProductsOptions = {
  categoryId: number;
  offset?: number;
  limit: number;
};

export async function getCategoryProducts({
  categoryId,
  offset = 0,
  limit,
}: GetCategoryProductsOptions): Promise<CategoryProductsResponse> {
  // Get product IDs for this category
  const categoryProductIds = await db
    .select({ productId: homePageCategoriesProducts.productId })
    .from(homePageCategoriesProducts)
    .where(eq(homePageCategoriesProducts.homePageCategoryId, categoryId));

  const productIds = categoryProductIds.map((p) => p.productId);

  if (productIds.length === 0) {
    return { products: [], total: 0, nextOffset: 0 };
  }

  // Get total count of products with valid prices
  const priceFilters = and(
    isNotNull(productsShopsPrices.currentPrice),
    or(
      isNull(productsShopsPrices.hidden),
      eq(productsShopsPrices.hidden, false)
    )
  );

  const totalRows = await db
    .select({
      count: sql<number>`count(distinct ${products.id})`,
    })
    .from(products)
    .innerJoin(
      productsShopsPrices,
      and(eq(productsShopsPrices.productId, products.id), priceFilters)
    )
    .where(
      and(
        inArray(products.id, productIds),
        or(isNull(products.deleted), eq(products.deleted, false))
      )
    );

  const total = Number(totalRows[0]?.count ?? 0);

  // Get products with their minimum prices and shop counts
  const minPrice = sql<string>`min(${productsShopsPrices.currentPrice})`;
  const shopCount = sql<number>`count(distinct ${productsShopsPrices.shopId})`;
  const rankValue = sql<number>`coalesce(${products.rank}, 0)`;

  const productRows = await db
    .select({
      productId: products.id,
      name: products.name,
      unit: products.unit,
      image: products.image,
      brandName: productsBrands.name,
      possibleBrandName: sql<string | null>`(
        SELECT pb.name FROM products_brands pb 
        WHERE pb.id = ${products.possibleBrandId}
      )`,
      currentPrice: minPrice.as("currentPrice"),
      amountOfShops: shopCount.as("amountOfShops"),
    })
    .from(products)
    .innerJoin(productsBrands, eq(products.brandId, productsBrands.id))
    .innerJoin(
      productsShopsPrices,
      and(eq(productsShopsPrices.productId, products.id), priceFilters)
    )
    .where(
      and(
        inArray(products.id, productIds),
        or(isNull(products.deleted), eq(products.deleted, false))
      )
    )
    .groupBy(
      products.id,
      products.name,
      products.unit,
      products.image,
      products.possibleBrandId,
      products.rank,
      productsBrands.name
    )
    .orderBy(desc(rankValue), minPrice)
    .limit(limit)
    .offset(offset);

  const categoryProducts: HomePageCategoryProduct[] = productRows.map((row) => ({
    productId: row.productId,
    name: row.name,
    unit: row.unit,
    image: row.image,
    brandName: row.brandName,
    possibleBrandName: row.possibleBrandName,
    currentPrice: row.currentPrice,
    amountOfShops: Number(row.amountOfShops),
  }));

  return {
    products: categoryProducts,
    total,
    nextOffset: offset + categoryProducts.length,
  };
}

export async function getCategoryById(categoryId: number) {
  return await db.query.homePageCategories.findFirst({
    where: (categories, { eq }) => eq(categories.id, categoryId),
  });
}

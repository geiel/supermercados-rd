"use server";

import { db } from "@/db";
import {
  products,
  type productsInsert,
  productsShopsPrices,
  unverfiedProducts,
} from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export type ProductSource = "products" | "unverified_products";

type ProductIdentity = Pick<productsInsert, "name" | "unit" | "brandId">;

type ProductSourceReference = {
  shopId: number;
  url: string;
  api?: string | null;
};

type SourceReferenceResult =
  | { source: "products_shops_prices"; id: number }
  | { source: "unverified_products"; id: number };

type ExistingProductRow = {
  id: number;
  categoryId: number;
  name: string;
  image: string | null;
  unit: string;
  brandId: number;
  deleted: boolean | null;
};

export async function findExistingProductAcrossTables(
  identity: ProductIdentity,
  options: { matchBrand?: boolean } = {}
): Promise<{ source: ProductSource; product: ExistingProductRow } | null> {
  const matchBrand = options.matchBrand ?? true;

  const productsWhere = matchBrand
    ? and(
        eq(products.name, identity.name),
        eq(products.unit, identity.unit),
        eq(products.brandId, identity.brandId)
      )
    : and(eq(products.name, identity.name), eq(products.unit, identity.unit));

  const productInMainTable = await db.query.products.findFirst({
    where: productsWhere,
    columns: {
      id: true,
      categoryId: true,
      name: true,
      image: true,
      unit: true,
      brandId: true,
      deleted: true,
    },
  });

  if (productInMainTable) {
    return {
      source: "products",
      product: productInMainTable,
    };
  }

  const unverifiedWhere = matchBrand
    ? and(
        eq(unverfiedProducts.name, identity.name),
        eq(unverfiedProducts.unit, identity.unit),
        eq(unverfiedProducts.brandId, identity.brandId)
      )
    : and(
        eq(unverfiedProducts.name, identity.name),
        eq(unverfiedProducts.unit, identity.unit)
      );

  const productInUnverifiedTable = await db.query.unverfiedProducts.findFirst({
    where: unverifiedWhere,
    columns: {
      id: true,
      categoryId: true,
      name: true,
      image: true,
      unit: true,
      brandId: true,
      deleted: true,
    },
  });

  if (productInUnverifiedTable) {
    return {
      source: "unverified_products",
      product: productInUnverifiedTable,
    };
  }

  return null;
}

export async function findUnverifiedBySourceReference(
  sourceReference: ProductSourceReference
) {
  const normalizedApi = sourceReference.api?.trim() || null;

  return db.query.unverfiedProducts.findFirst({
    where: and(
      eq(unverfiedProducts.shopId, sourceReference.shopId),
      eq(unverfiedProducts.url, sourceReference.url),
      normalizedApi === null
        ? isNull(unverfiedProducts.api)
        : eq(unverfiedProducts.api, normalizedApi)
    ),
    columns: {
      id: true,
    },
  });
}

export async function findSourceReferenceAcrossTables(
  sourceReference: ProductSourceReference
): Promise<SourceReferenceResult | null> {
  const normalizedApi = sourceReference.api?.trim() || null;

  const existingInProductsShopsPrices = await db.query.productsShopsPrices.findFirst({
    where: and(
      eq(productsShopsPrices.shopId, sourceReference.shopId),
      eq(productsShopsPrices.url, sourceReference.url),
      normalizedApi === null
        ? isNull(productsShopsPrices.api)
        : eq(productsShopsPrices.api, normalizedApi)
    ),
    columns: {
      productId: true,
    },
  });

  if (existingInProductsShopsPrices) {
    return {
      source: "products_shops_prices",
      id: existingInProductsShopsPrices.productId,
    };
  }

  const existingInUnverified = await findUnverifiedBySourceReference(
    sourceReference
  );

  if (existingInUnverified) {
    return {
      source: "unverified_products",
      id: existingInUnverified.id,
    };
  }

  return null;
}

export async function insertProductIntoUnverified(
  product: productsInsert,
  sourceReference: ProductSourceReference
) {
  const normalizedApi = sourceReference.api?.trim() || null;

  return db
    .insert(unverfiedProducts)
    .values({
      categoryId: product.categoryId,
      name: product.name,
      image: product.image,
      unit: product.unit,
      brandId: product.brandId,
      deleted: product.deleted,
      rank: product.rank,
      relevance: product.relevance,
      possibleBrandId: product.possibleBrandId,
      baseUnit: product.baseUnit,
      baseUnitAmount: product.baseUnitAmount,
      shopId: sourceReference.shopId,
      url: sourceReference.url,
      api: normalizedApi,
    })
    .onConflictDoNothing()
    .returning({ id: unverfiedProducts.id });
}

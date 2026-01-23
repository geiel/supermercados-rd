import "server-only";

import { and, asc, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  products,
  productsBrands,
  productsGroups,
  productsShopsPrices,
  subCategories,
  subCategoriesGroups,
} from "@/db/schema";
import type {
  GroupExplorerProduct,
  GroupExplorerSort,
} from "@/types/group-explorer";
import { GROUP_EXPLORER_DEFAULT_SORT } from "@/types/group-explorer";
import type { SubCategoryExplorerResponse } from "@/types/subcategory-explorer";
import {
  parseUnitWithGroupConversion,
  type Measurement,
} from "@/lib/unit-utils";

type GetSubCategoryProductsOptions = {
  subCategoryId: number;
  groupId?: number;
  offset?: number;
  limit: number;
  sort?: GroupExplorerSort;
};

type SubCategoryRow = {
  id: number;
  name: string;
  humanNameId: string;
  mainCategoryId: number;
  isExplorable: boolean;
};

type GroupContext = {
  humanNameId: string;
  compareBy: string | null;
  cheaperProductId: number | null;
};

export async function getSubCategoryProducts({
  subCategoryId,
  groupId,
  offset = 0,
  limit,
  sort = GROUP_EXPLORER_DEFAULT_SORT,
}: GetSubCategoryProductsOptions): Promise<SubCategoryExplorerResponse | null> {
  const subCategory = (await db.query.subCategories.findFirst({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
      mainCategoryId: true,
      isExplorable: true,
    },
    where: (subCategories, { eq }) => eq(subCategories.id, subCategoryId),
  })) as SubCategoryRow | undefined;

  if (!subCategory) {
    return null;
  }

  const groupContext = groupId
    ? ((await db.query.groups.findFirst({
        columns: {
          humanNameId: true,
          compareBy: true,
          cheaperProductId: true,
        },
        where: (groups, { eq }) => eq(groups.id, groupId),
      })) as GroupContext | undefined)
    : undefined;

  const priceFilters = and(
    isNotNull(productsShopsPrices.currentPrice),
    or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false))
  );

  const whereConditions = [eq(subCategoriesGroups.subCategoryId, subCategoryId)];
  if (groupId) {
    whereConditions.push(eq(subCategoriesGroups.groupId, groupId));
  }

  const totalRows = await db
    .select({
      count: sql<number>`count(distinct ${products.id})`,
    })
    .from(subCategoriesGroups)
    .innerJoin(
      productsGroups,
      eq(productsGroups.groupId, subCategoriesGroups.groupId)
    )
    .innerJoin(products, eq(products.id, productsGroups.productId))
    .innerJoin(
      productsShopsPrices,
      and(eq(productsShopsPrices.productId, products.id), priceFilters)
    )
    .where(and(...whereConditions));

  const total = Number(totalRows[0]?.count ?? 0);

  const pBrand = alias(productsBrands, "possible_brand");
  const minCurrentPrice = sql<string>`min(${productsShopsPrices.currentPrice})`;
  const relevanceRank = sql<number>`coalesce(${products.rank}, 0)`;

  const isBestValueSort = sort === "best_value";

  const orderBy = (() => {
    switch (sort) {
      case "highest_price":
        return [desc(minCurrentPrice), asc(products.id)];
      case "best_value":
        return [asc(minCurrentPrice), asc(products.id)];
      case "relevance":
        return [desc(relevanceRank), asc(minCurrentPrice), asc(products.id)];
      case "lowest_price":
      default:
        return [asc(minCurrentPrice), asc(products.id)];
    }
  })();

  const fetchLimit = isBestValueSort ? 1000 : limit;
  const fetchOffset = isBestValueSort ? 0 : offset;

  const rows = await db
    .select({
      productId: products.id,
      productName: products.name,
      productImage: products.image,
      productUnit: products.unit,
      productCategory: products.categoryId,
      productBrand: {
        id: productsBrands.id,
        name: productsBrands.name,
      },
      possibleBrand: {
        id: pBrand.id,
        name: pBrand.name,
      },
      currentPrice: minCurrentPrice.as("currentPrice"),
    })
    .from(subCategoriesGroups)
    .innerJoin(
      productsGroups,
      eq(productsGroups.groupId, subCategoriesGroups.groupId)
    )
    .innerJoin(products, eq(products.id, productsGroups.productId))
    .innerJoin(
      productsShopsPrices,
      and(eq(productsShopsPrices.productId, products.id), priceFilters)
    )
    .innerJoin(productsBrands, eq(products.brandId, productsBrands.id))
    .leftJoin(pBrand, eq(products.possibleBrandId, pBrand.id))
    .where(and(...whereConditions))
    .groupBy(
      products.id,
      products.name,
      products.image,
      products.unit,
      products.categoryId,
      products.rank,
      products.baseUnitAmount,
      productsBrands.id,
      productsBrands.name,
      pBrand.id,
      pBrand.name
    )
    .orderBy(...orderBy)
    .limit(fetchLimit)
    .offset(fetchOffset);

  let processedRows = rows;

  if (isBestValueSort) {
    type ParsedProduct = {
      row: (typeof rows)[0];
      parsed: ReturnType<typeof parseUnitWithGroupConversion>;
      measurement: Measurement | null;
      unitPrice: number | null;
    };

    const parsedProducts: ParsedProduct[] = rows.map((row) => {
      const parsed = parseUnitWithGroupConversion(
        row.productUnit,
        groupContext?.humanNameId ?? null
      );
      const price = Number(row.currentPrice);
      const unitPrice =
        parsed && Number.isFinite(price) && parsed.base > 0
          ? price / parsed.base
          : null;

      return {
        row,
        parsed,
        measurement: parsed?.measurement ?? null,
        unitPrice,
      };
    });

    type ComparableType = "measure" | "count";

    const getComparableType = (m: Measurement | null): ComparableType | null => {
      if (!m) return null;
      return m === "count" ? "count" : "measure";
    };

    const wantsCount =
      typeof groupContext?.compareBy === "string" &&
      groupContext.compareBy.toLowerCase() === "count";

    const countByType: Record<ComparableType, number> = { measure: 0, count: 0 };
    for (const p of parsedProducts) {
      if (p.unitPrice !== null && p.measurement) {
        const type = getComparableType(p.measurement);
        if (type) countByType[type]++;
      }
    }

    let targetType: ComparableType;
    if (wantsCount && countByType.count > 0) {
      targetType = "count";
    } else if (countByType.measure > countByType.count) {
      targetType = "measure";
    } else if (countByType.count > 0) {
      targetType = "count";
    } else {
      targetType = "measure";
    }

    parsedProducts.sort((a, b) => {
      const aMatchesType = getComparableType(a.measurement) === targetType;
      const bMatchesType = getComparableType(b.measurement) === targetType;
      const aHasUnitPrice = a.unitPrice !== null;
      const bHasUnitPrice = b.unitPrice !== null;

      const aValid = aMatchesType && aHasUnitPrice;
      const bValid = bMatchesType && bHasUnitPrice;

      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;

      if (aValid && bValid) {
        const diff = (a.unitPrice ?? 0) - (b.unitPrice ?? 0);
        if (Math.abs(diff) > 1e-9) return diff;
        return Number(a.row.currentPrice) - Number(b.row.currentPrice);
      }

      return Number(a.row.currentPrice) - Number(b.row.currentPrice);
    });

    processedRows = parsedProducts
      .slice(offset, offset + limit)
      .map((p) => p.row);
  }

  const productsList: GroupExplorerProduct[] = processedRows.map((row) => ({
    id: row.productId,
    name: row.productName,
    image: row.productImage,
    unit: row.productUnit,
    categoryId: row.productCategory,
    brand: row.productBrand,
    possibleBrand: row.possibleBrand?.id ? row.possibleBrand : null,
    currentPrice: row.currentPrice,
    isCheaper: groupContext
      ? row.productId === groupContext.cheaperProductId
      : false,
  }));

  return {
    subCategory: {
      id: subCategory.id,
      name: subCategory.name,
      humanId: subCategory.humanNameId,
      mainCategoryId: subCategory.mainCategoryId,
      isExplorable: subCategory.isExplorable,
    },
    products: productsList,
    total,
    nextOffset: offset + productsList.length,
  };
}


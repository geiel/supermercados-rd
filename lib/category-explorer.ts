import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { mainCategories, subCategories } from "@/db/schema";
import type {
  CategoryPreview,
  CategorySubCategorySummary,
  CategorySubCategoriesResponse,
} from "@/types/category-explorer";

export async function getMainCategoriesWithSubCategories(): Promise<CategoryPreview[]> {
  const categories = await db.query.mainCategories.findMany({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
      imageUrl: true,
    },
    orderBy: (mainCategories, { asc }) => asc(mainCategories.name),
  });

  if (categories.length === 0) {
    return [];
  }

  const categoryIds = categories.map((category) => category.id);
  const subCategoryRows = await db
    .select({
      id: subCategories.id,
      name: subCategories.name,
      humanNameId: subCategories.humanNameId,
      mainCategoryId: subCategories.mainCategoryId,
    })
    .from(subCategories)
    .where(inArray(subCategories.mainCategoryId, categoryIds))
    .orderBy(asc(subCategories.name));

  const subCategoriesByCategory = new Map<number, CategorySubCategorySummary[]>();
  for (const row of subCategoryRows) {
    const list = subCategoriesByCategory.get(row.mainCategoryId) ?? [];
    list.push({ id: row.id, name: row.name, humanId: row.humanNameId });
    subCategoriesByCategory.set(row.mainCategoryId, list);
  }

  return categories.map((category) => {
    const subCategoriesList = subCategoriesByCategory.get(category.id) ?? [];

    return {
      id: category.id,
      name: category.name,
      humanId: category.humanNameId,
      imageUrl: category.imageUrl ?? null,
      subCategories: subCategoriesList,
    };
  });
}

export async function getSubCategoriesByCategoryId(
  categoryId: number,
  offset = 0,
  limit = 5
): Promise<CategorySubCategoriesResponse | null> {
  const category = await db.query.mainCategories.findFirst({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
    },
    where: (mainCategories, { eq }) => eq(mainCategories.id, categoryId),
  });

  if (!category) {
    return null;
  }

  const totalRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(subCategories)
    .where(eq(subCategories.mainCategoryId, categoryId));
  const total = Number(totalRows[0]?.count ?? 0);

  const subCategoryRows = await db
    .select({
      id: subCategories.id,
      name: subCategories.name,
      humanNameId: subCategories.humanNameId,
    })
    .from(subCategories)
    .where(eq(subCategories.mainCategoryId, categoryId))
    .orderBy(asc(subCategories.name))
    .limit(limit)
    .offset(offset);

  const subCategoriesList = subCategoryRows.map((row) => ({
    id: row.id,
    name: row.name,
    humanId: row.humanNameId,
  }));

  return {
    category: {
      id: category.id,
      name: category.name,
      humanId: category.humanNameId,
    },
    subCategories: subCategoriesList,
    total,
    nextOffset: offset + subCategoriesList.length,
  };
}

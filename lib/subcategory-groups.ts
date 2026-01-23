import "server-only";

import { asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  groups,
  products,
  productsGroups,
  subCategoriesGroups,
} from "@/db/schema";
import type {
  SubCategoryGroupsResponse,
  SubCategoryGroupSummary,
} from "@/types/subcategory-explorer";

type GetSubCategoryGroupsOptions = {
  subCategoryId: number;
  offset?: number;
  limit?: number;
};

type GroupRow = {
  id: number;
  name: string;
  humanNameId: string;
  parentGroupId: number | null;
};

export async function getSubCategoryGroups({
  subCategoryId,
  offset = 0,
  limit,
}: GetSubCategoryGroupsOptions): Promise<SubCategoryGroupsResponse | null> {
  const subCategory = await db.query.subCategories.findFirst({
    columns: { id: true, name: true, humanNameId: true },
    where: (subCategories, { eq }) => eq(subCategories.id, subCategoryId),
  });

  if (!subCategory) {
    return null;
  }

  const totalRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(subCategoriesGroups)
    .where(eq(subCategoriesGroups.subCategoryId, subCategoryId));
  const total = Number(totalRows[0]?.count ?? 0);

  let groupsQuery = db
    .select({
      id: groups.id,
      name: groups.name,
      humanNameId: groups.humanNameId,
      parentGroupId: groups.parentGroupId,
    })
    .from(subCategoriesGroups)
    .innerJoin(groups, eq(groups.id, subCategoriesGroups.groupId))
    .where(eq(subCategoriesGroups.subCategoryId, subCategoryId))
    .orderBy(asc(groups.name));

  if (Number.isFinite(limit)) {
    groupsQuery = groupsQuery.limit(limit as number).offset(offset);
  }

  const groupsRows = (await groupsQuery) as GroupRow[];
  const groupIds = groupsRows.map((row) => row.id);

  if (groupIds.length === 0) {
    return {
      subCategory: {
        id: subCategory.id,
        name: subCategory.name,
        humanId: subCategory.humanNameId,
      },
      groups: [],
      total,
      nextOffset: offset,
    };
  }

  const childRows = await db
    .select({
      id: groups.id,
      name: groups.name,
      humanNameId: groups.humanNameId,
      parentGroupId: groups.parentGroupId,
    })
    .from(groups)
    .where(inArray(groups.parentGroupId, groupIds))
    .orderBy(asc(groups.name));

  const childByParent = new Map<number, SubCategoryGroupSummary[]>();
  for (const child of childRows) {
    if (!child.parentGroupId) continue;
    const list = childByParent.get(child.parentGroupId) ?? [];
    list.push({
      id: child.id,
      name: child.name,
      humanId: child.humanNameId,
    });
    childByParent.set(child.parentGroupId, list);
  }

  const rankValue = sql<number>`coalesce(${products.rank}, 0)`;
  const imageRows = await db
    .select({
      groupId: productsGroups.groupId,
      image: products.image,
      rank: rankValue,
    })
    .from(productsGroups)
    .innerJoin(products, eq(products.id, productsGroups.productId))
    .where(inArray(productsGroups.groupId, groupIds))
    .orderBy(productsGroups.groupId, desc(rankValue), desc(products.id));

  const imageByGroup = new Map<number, string | null>();
  for (const row of imageRows) {
    if (!imageByGroup.has(row.groupId)) {
      imageByGroup.set(row.groupId, row.image ?? null);
    }
  }

  const groupsList = groupsRows.map((group) => ({
    id: group.id,
    name: group.name,
    humanId: group.humanNameId,
    image: imageByGroup.get(group.id) ?? null,
    childGroups: childByParent.get(group.id) ?? [],
  }));

  return {
    subCategory: {
      id: subCategory.id,
      name: subCategory.name,
      humanId: subCategory.humanNameId,
    },
    groups: groupsList,
    total,
    nextOffset: offset + groupsList.length,
  };
}

export async function getSubCategoryGroupFilters(subCategoryId: number) {
  return await db
    .select({
      id: groups.id,
      name: groups.name,
      humanId: groups.humanNameId,
    })
    .from(subCategoriesGroups)
    .innerJoin(groups, eq(groups.id, subCategoriesGroups.groupId))
    .where(eq(subCategoriesGroups.subCategoryId, subCategoryId))
    .orderBy(asc(groups.name));
}

export async function getSubCategoryByHumanId(
  categoryId: number,
  subCategoryHumanId: string
) {
  return await db.query.subCategories.findFirst({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
      imageUrl: true,
      isExplorable: true,
      mainCategoryId: true,
    },
    where: (subCategories, { and, eq }) =>
      and(
        eq(subCategories.humanNameId, subCategoryHumanId),
        eq(subCategories.mainCategoryId, categoryId)
      ),
  });
}

export async function getMainCategoryByHumanId(categoryHumanId: string) {
  return await db.query.mainCategories.findFirst({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
      description: true,
      imageUrl: true,
    },
    where: (mainCategories, { eq }) =>
      eq(mainCategories.humanNameId, categoryHumanId),
  });
}

type SubCategoryGroupPreview = {
  id: number;
  name: string;
  humanId: string;
};

export type SubCategoryWithGroupsPreview = {
  id: number;
  name: string;
  humanId: string;
  imageUrl: string | null;
  isExplorable: boolean;
  groups: SubCategoryGroupPreview[];
};

export async function getSubCategoriesWithGroupsByCategoryId(
  categoryId: number
): Promise<SubCategoryWithGroupsPreview[]> {
  const subCategoriesList = await db.query.subCategories.findMany({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
      imageUrl: true,
      isExplorable: true,
    },
    where: (subCategories, { eq }) =>
      eq(subCategories.mainCategoryId, categoryId),
    orderBy: (subCategories, { asc }) => asc(subCategories.name),
  });

  if (subCategoriesList.length === 0) {
    return [];
  }

  const subCategoryIds = subCategoriesList.map((subCategory) => subCategory.id);

  const groupsRows = await db
    .select({
      subCategoryId: subCategoriesGroups.subCategoryId,
      id: groups.id,
      name: groups.name,
      humanNameId: groups.humanNameId,
    })
    .from(subCategoriesGroups)
    .innerJoin(groups, eq(groups.id, subCategoriesGroups.groupId))
    .where(inArray(subCategoriesGroups.subCategoryId, subCategoryIds))
    .orderBy(asc(groups.name));

  const groupsBySubCategory = new Map<number, SubCategoryGroupPreview[]>();
  for (const row of groupsRows) {
    const list = groupsBySubCategory.get(row.subCategoryId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      humanId: row.humanNameId,
    });
    groupsBySubCategory.set(row.subCategoryId, list);
  }

  return subCategoriesList.map((subCategory) => {
    const groupsList = groupsBySubCategory.get(subCategory.id) ?? [];

    return {
      id: subCategory.id,
      name: subCategory.name,
      humanId: subCategory.humanNameId,
      imageUrl: subCategory.imageUrl ?? null,
      isExplorable: subCategory.isExplorable,
      groups: groupsList,
    };
  });
}

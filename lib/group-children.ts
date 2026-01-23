import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  groups,
  mainCategories,
  subCategories,
  subCategoriesGroups,
} from "@/db/schema";

export type ChildGroup = {
  id: number;
  name: string;
  humanId: string;
};

export async function getGroupByHumanId(humanId: string) {
  return await db.query.groups.findFirst({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
    },
    where: (groups, { eq }) => eq(groups.humanNameId, humanId),
  });
}

export async function getChildGroupsByGroupId(
  groupId: number
): Promise<ChildGroup[]> {
  const children = await db.query.groups.findMany({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
    },
    where: (groups, { eq }) => eq(groups.parentGroupId, groupId),
    orderBy: (groups, { asc }) => asc(groups.name),
  });

  return children.map((child) => ({
    id: child.id,
    name: child.name,
    humanId: child.humanNameId,
  }));
}

export type GroupBreadcrumb = {
  category: {
    name: string;
    humanId: string;
  };
  subCategory: {
    name: string;
    humanId: string;
  };
  parentGroup?: {
    name: string;
    humanId: string;
  };
} | null;

export async function getGroupBreadcrumb(
  groupId: number
): Promise<GroupBreadcrumb> {
  // Get the group to check if it has a parent
  const group = await db.query.groups.findFirst({
    columns: { id: true, parentGroupId: true },
    where: (groups, { eq }) => eq(groups.id, groupId),
  });

  if (!group) {
    return null;
  }

  // Get parent group if exists
  let parentGroup: { name: string; humanId: string } | undefined;
  if (group.parentGroupId) {
    const parent = await db.query.groups.findFirst({
      columns: { name: true, humanNameId: true },
      where: (groups, { eq }) => eq(groups.id, group.parentGroupId!),
    });
    if (parent) {
      parentGroup = { name: parent.name, humanId: parent.humanNameId };
    }
  }

  // Get subcategory for this group (or parent group if this is a child)
  const targetGroupId = group.parentGroupId ?? groupId;

  const subCategoryGroupRow = await db
    .select({
      subCategoryId: subCategoriesGroups.subCategoryId,
    })
    .from(subCategoriesGroups)
    .where(eq(subCategoriesGroups.groupId, targetGroupId))
    .limit(1);

  if (subCategoryGroupRow.length === 0) {
    return null;
  }

  const subCategoryId = subCategoryGroupRow[0].subCategoryId;

  const subCategory = await db.query.subCategories.findFirst({
    columns: { name: true, humanNameId: true, mainCategoryId: true },
    where: (subCategories, { eq }) => eq(subCategories.id, subCategoryId),
  });

  if (!subCategory) {
    return null;
  }

  const category = await db.query.mainCategories.findFirst({
    columns: { name: true, humanNameId: true },
    where: (mainCategories, { eq }) =>
      eq(mainCategories.id, subCategory.mainCategoryId),
  });

  if (!category) {
    return null;
  }

  return {
    category: {
      name: category.name,
      humanId: category.humanNameId,
    },
    subCategory: {
      name: subCategory.name,
      humanId: subCategory.humanNameId,
    },
    parentGroup,
  };
}

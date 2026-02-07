import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, categoriesGroups, groups } from "@/db/schema";

export type GroupCategory = {
  id: number;
  name: string;
  humanNameId: string;
  icon: string | null;
  shortName: string | null;
};

export type GroupCategoryGroup = {
  id: number;
  name: string;
  humanNameId: string;
  imageUrl: string | null;
};

export async function getGroupCategories(): Promise<GroupCategory[]> {
  return db.query.categories.findMany({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
      icon: true,
      shortName: true,
    },
    orderBy: (categories, { asc }) => asc(categories.name),
  });
}

export async function getGroupCategoryWithGroups(slug: string) {
  const category = await db.query.categories.findFirst({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
      icon: true,
      shortName: true,
    },
    where: (categories, { eq }) => eq(categories.humanNameId, slug),
  });

  if (!category) {
    return null;
  }

  const categoryGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      humanNameId: groups.humanNameId,
      imageUrl: groups.imageUrl,
    })
    .from(categoriesGroups)
    .innerJoin(groups, eq(categoriesGroups.groupId, groups.id))
    .where(eq(categoriesGroups.categoryId, category.id))
    .orderBy(asc(groups.name));

  return { category, groups: categoryGroups };
}

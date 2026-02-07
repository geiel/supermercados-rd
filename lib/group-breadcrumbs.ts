import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { categories, categoriesGroups, groups } from "@/db/schema";

export type GroupBreadcrumbItem = {
  id: number;
  name: string;
  href: string;
};

type GroupNode = GroupBreadcrumbItem & {
  parentGroupId: number | null;
};

async function getGroupMap() {
  const rows = await db.query.groups.findMany({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
      parentGroupId: true,
    },
  });

  return new Map<number, GroupNode>(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        href: `/grupos/${row.humanNameId}`,
        parentGroupId: row.parentGroupId ?? null,
      },
    ])
  );
}

async function getCategoryByGroupIds(groupIds: number[]) {
  if (groupIds.length === 0) return null;

  const rows = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      categoryHumanId: categories.humanNameId,
      groupId: categoriesGroups.groupId,
    })
    .from(categoriesGroups)
    .innerJoin(categories, eq(categoriesGroups.categoryId, categories.id))
    .where(inArray(categoriesGroups.groupId, groupIds));

  return rows;
}

function buildGroupChain(
  groupId: number,
  groupById: Map<number, GroupNode>
): GroupBreadcrumbItem[] {
  const chain: GroupNode[] = [];
  const visited = new Set<number>();
  let currentId: number | null = groupId;

  while (currentId !== null && !visited.has(currentId)) {
    const group = groupById.get(currentId);
    if (!group) break;
    visited.add(currentId);
    chain.push(group);
    currentId = group.parentGroupId ?? null;
  }

  return chain.reverse().map(({ id, name, href }) => ({
    id,
    name,
    href,
  }));
}

export async function getGroupBreadcrumbsForGroup(groupId: number) {
  const groupById = await getGroupMap();
  const chain = buildGroupChain(groupId, groupById);
  const groupIds = chain.map((item) => item.id);
  const categoriesRows = await getCategoryByGroupIds(groupIds);

  if (!categoriesRows || categoriesRows.length === 0) {
    return chain;
  }

  const categoryByGroup = new Map(
    categoriesRows.map((row) => [row.groupId, row])
  );
  const categoryMatch = groupIds
    .map((id) => categoryByGroup.get(id))
    .find(Boolean);

  if (!categoryMatch) {
    return chain;
  }

  return [
    {
      id: categoryMatch.categoryId,
      name: categoryMatch.categoryName,
      href: `/categorias/${categoryMatch.categoryHumanId}`,
    },
    ...chain,
  ];
}

export async function getGroupBreadcrumbPaths(groupIds: number[]) {
  const seen = new Set<number>();
  const orderedGroupIds = groupIds.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  if (orderedGroupIds.length === 0) return [];

  const groupById = await getGroupMap();
  const ancestorIds = new Set<number>();

  for (const id of orderedGroupIds) {
    let current = groupById.get(id);
    const visited = new Set<number>();

    while (current?.parentGroupId != null && !visited.has(current.parentGroupId)) {
      const parentId = current.parentGroupId;
      ancestorIds.add(parentId);
      visited.add(parentId);
      current = groupById.get(parentId);
    }
  }

  const leafGroupIds = orderedGroupIds.filter((id) => !ancestorIds.has(id));

  const chains = leafGroupIds
    .map((id) => buildGroupChain(id, groupById))
    .filter((chain) => chain.length > 0);

  const chainGroupIds = chains.flatMap((chain) => chain.map((item) => item.id));
  const categoriesRows = await getCategoryByGroupIds(chainGroupIds);

  if (!categoriesRows || categoriesRows.length === 0) {
    return chains;
  }

  const categoryByGroup = new Map(
    categoriesRows.map((row) => [row.groupId, row])
  );

  return chains.map((chain) => {
    const match = chain
      .map((item) => categoryByGroup.get(item.id))
      .find(Boolean);

    if (!match) return chain;

    return [
      {
        id: match.categoryId,
        name: match.categoryName,
        href: `/categorias/${match.categoryHumanId}`,
      },
      ...chain,
    ];
  });
}

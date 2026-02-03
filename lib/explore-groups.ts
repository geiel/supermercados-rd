import "server-only";

import { db } from "@/db";
import { groups, productsGroups } from "@/db/schema";
import type { ExploreGroupResult } from "@/types/explore";
import { eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

type ParentGroupRow = {
  productId: number;
  groupId: number;
  groupName: string;
  groupHumanId: string;
  isComparable: boolean;
};

type GroupAggregate = {
  row: ParentGroupRow;
  count: number;
  firstIndex: number;
};

export async function getExploreParentGroups(
  productIds: number[],
  limit = 10
): Promise<ExploreGroupResult[]> {
  if (productIds.length === 0) return [];

  const parentGroup = alias(groups, "parent_group");

  const rows = await db
    .select({
      productId: productsGroups.productId,
      groupId: sql<number>`COALESCE(${parentGroup.id}, ${groups.id})`,
      groupName: sql<string>`COALESCE(${parentGroup.name}, ${groups.name})`,
      groupHumanId: sql<string>`COALESCE(${parentGroup.humanNameId}, ${groups.humanNameId})`,
      isComparable: sql<boolean>`COALESCE(${parentGroup.isComparable}, ${groups.isComparable})`,
    })
    .from(productsGroups)
    .innerJoin(groups, eq(groups.id, productsGroups.groupId))
    .leftJoin(parentGroup, eq(groups.parentGroupId, parentGroup.id))
    .where(inArray(productsGroups.productId, productIds));

  const byProduct = new Map<number, Map<number, ParentGroupRow>>();

  for (const row of rows) {
    let groupMap = byProduct.get(row.productId);
    if (!groupMap) {
      groupMap = new Map();
      byProduct.set(row.productId, groupMap);
    }

    if (!groupMap.has(row.groupId)) {
      groupMap.set(row.groupId, row);
    }
  }

  const aggregates = new Map<number, GroupAggregate>();

  productIds.forEach((productId, index) => {
    const groupMap = byProduct.get(productId);
    if (!groupMap) return;

    for (const row of groupMap.values()) {
      const existing = aggregates.get(row.groupId);
      if (existing) {
        existing.count += 1;
      } else {
        aggregates.set(row.groupId, {
          row,
          count: 1,
          firstIndex: index,
        });
      }
    }
  });

  const topByCount = Array.from(aggregates.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.firstIndex - b.firstIndex;
    })
    .slice(0, limit)
    .sort((a, b) => a.firstIndex - b.firstIndex);

  return topByCount.map(({ row }) => ({
    name: row.groupName,
    humanId: row.groupHumanId,
    groupId: row.groupId,
    isComparable: row.isComparable,
  }));
}

import "server-only";

import { db } from "@/db";
import { groups, products, productsGroups, productsShopsPrices } from "@/db/schema";
import type { ExploreGroupResult } from "@/types/explore";
import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

type ParentGroupRow = {
  productId: number;
  ownGroupId: number;
  ownGroupName: string;
  ownGroupHumanId: string;
  ownIsComparable: boolean;
  ownImageUrl: string | null;
  parentGroupId: number | null;
  parentGroupName: string | null;
  parentGroupHumanId: string | null;
  parentIsComparable: boolean | null;
  parentImageUrl: string | null;
};

type GroupAggregate = {
  row: Omit<ExploreGroupResult, "name" | "humanId"> & {
    groupName: string;
    groupHumanId: string;
  };
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
      ownGroupId: groups.id,
      ownGroupName: groups.name,
      ownGroupHumanId: groups.humanNameId,
      ownIsComparable: groups.isComparable,
      ownImageUrl: groups.imageUrl,
      parentGroupId: parentGroup.id,
      parentGroupName: parentGroup.name,
      parentGroupHumanId: parentGroup.humanNameId,
      parentIsComparable: parentGroup.isComparable,
      parentImageUrl: parentGroup.imageUrl,
    })
    .from(productsGroups)
    .innerJoin(groups, eq(groups.id, productsGroups.groupId))
    .leftJoin(parentGroup, eq(groups.parentGroupId, parentGroup.id))
    .where(inArray(productsGroups.productId, productIds));

  const candidateGroupIds = Array.from(
    new Set(
      rows.flatMap((row) =>
        row.parentGroupId ? [row.ownGroupId, row.parentGroupId] : [row.ownGroupId]
      )
    )
  );

  const visibleGroupRows =
    candidateGroupIds.length > 0
      ? await db
          .select({
            groupId: productsGroups.groupId,
          })
          .from(productsGroups)
          .innerJoin(products, eq(products.id, productsGroups.productId))
          .innerJoin(
            productsShopsPrices,
            and(
              eq(productsShopsPrices.productId, products.id),
              isNotNull(productsShopsPrices.currentPrice),
              or(
                isNull(productsShopsPrices.hidden),
                eq(productsShopsPrices.hidden, false)
              )
            )
          )
          .where(
            and(
              inArray(productsGroups.groupId, candidateGroupIds),
              or(isNull(products.deleted), eq(products.deleted, false))
            )
          )
          .groupBy(productsGroups.groupId)
      : [];

  const visibleGroupIds = new Set(visibleGroupRows.map((row) => row.groupId));

  const byProduct = new Map<number, Map<number, GroupAggregate["row"]>>();

  for (const row of rows) {
    let groupMap = byProduct.get(row.productId);
    if (!groupMap) {
      groupMap = new Map();
      byProduct.set(row.productId, groupMap);
    }

    const useParent =
      row.parentGroupId !== null && visibleGroupIds.has(row.parentGroupId);
    const targetGroupId = useParent ? row.parentGroupId! : row.ownGroupId;

    if (!visibleGroupIds.has(targetGroupId)) {
      continue;
    }

    if (!groupMap.has(targetGroupId)) {
      groupMap.set(targetGroupId, {
        groupId: targetGroupId,
        groupName: useParent ? row.parentGroupName ?? row.ownGroupName : row.ownGroupName,
        groupHumanId: useParent
          ? row.parentGroupHumanId ?? row.ownGroupHumanId
          : row.ownGroupHumanId,
        isComparable: useParent
          ? row.parentIsComparable ?? row.ownIsComparable
          : row.ownIsComparable,
        imageUrl: useParent ? row.parentImageUrl ?? row.ownImageUrl : row.ownImageUrl,
      });
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
    imageUrl: row.imageUrl,
  }));
}

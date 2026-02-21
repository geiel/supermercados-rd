import "server-only";

import { db } from "@/db";
import { groups, productsGroups } from "@/db/schema";
import type { ExploreGroupResult } from "@/types/explore";
import { baseV2 } from "@/lib/synonyms-v2";
import { asc, desc, inArray, sql } from "drizzle-orm";
import { searchProductIds } from "./search-query";

const HIGH_GROUP_SIMILARITY_THRESHOLD = 0.7;
const MAX_SIMILARITY_VARIANTS = 20;

type GroupNode = {
  id: number;
  name: string;
  humanNameId: string;
  parentGroupId: number | null;
  isComparable: boolean;
  imageUrl: string | null;
};

type GroupAggregate = {
  row: GroupNode;
  count: number;
  firstIndex: number;
};

function normalizeSimilarityText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const synonymsByEntry = baseV2.map((entry) =>
  Array.from(
    new Set(
      entry.synonyms
        .map((synonym) => normalizeSimilarityText(synonym))
        .filter((synonym) => synonym.length > 0)
    )
  )
);

const entryIndexesBySynonym = (() => {
  const map = new Map<string, number[]>();

  synonymsByEntry.forEach((synonyms, entryIndex) => {
    for (const synonym of synonyms) {
      const existing = map.get(synonym);
      if (existing) {
        existing.push(entryIndex);
      } else {
        map.set(synonym, [entryIndex]);
      }
    }
  });

  return map;
})();

function getSimilarityVariants(searchText: string) {
  const normalizedSearchText = normalizeSimilarityText(searchText);

  if (!normalizedSearchText) {
    return [];
  }

  const orderedVariants: string[] = [];
  const seenVariants = new Set<string>();
  const addVariant = (value: string) => {
    const normalized = normalizeSimilarityText(value);
    if (!normalized || seenVariants.has(normalized)) {
      return;
    }
    seenVariants.add(normalized);
    orderedVariants.push(normalized);
  };

  addVariant(normalizedSearchText);
  const entryIndexes = new Set<number>();
  const searchTokens = normalizedSearchText.split(" ").filter(Boolean);

  const matchedByFullText = entryIndexesBySynonym.get(normalizedSearchText) ?? [];
  matchedByFullText.forEach((entryIndex) => entryIndexes.add(entryIndex));

  const eligibleTokens = searchTokens.filter((token) => token.length >= 3);

  for (const token of eligibleTokens) {
    const matchedByToken = entryIndexesBySynonym.get(token) ?? [];
    matchedByToken.forEach((entryIndex) => entryIndexes.add(entryIndex));
  }

  // First priority after the original text: phrase variants replacing one token at a time.
  for (let index = 0; index < searchTokens.length; index += 1) {
    const token = searchTokens[index];
    if (token.length < 3) {
      continue;
    }

    const tokenMatchedEntryIndexes = entryIndexesBySynonym.get(token) ?? [];
    if (tokenMatchedEntryIndexes.length === 0) {
      continue;
    }

    const replacements = new Set<string>();
    for (const entryIndex of tokenMatchedEntryIndexes) {
      const synonyms = synonymsByEntry[entryIndex] ?? [];
      for (const synonym of synonyms) {
        if (synonym.length >= 3) {
          replacements.add(synonym);
        }
      }
    }

    for (const replacement of replacements) {
      if (replacement === token) {
        continue;
      }

      const phraseVariantTokens = [...searchTokens];
      phraseVariantTokens[index] = replacement;
      addVariant(phraseVariantTokens.join(" "));
    }
  }

  // Second priority: single-term variants from all matched synonym entries.
  const isMultiWordSearch = searchTokens.length > 1;
  if (!isMultiWordSearch) {
    for (const entryIndex of entryIndexes) {
      const synonyms = synonymsByEntry[entryIndex] ?? [];
      for (const synonym of synonyms) {
        if (synonym.length >= 3) {
          addVariant(synonym);
        }
      }
    }
  }

  return orderedVariants.slice(0, MAX_SIMILARITY_VARIANTS);
}

function mapGroupNodeToExploreResult(
  group: GroupNode,
  options?: { parentGroupName?: string | null }
): ExploreGroupResult {
  return {
    name: group.name,
    humanId: group.humanNameId,
    groupId: group.id,
    isComparable: group.isComparable,
    imageUrl: group.imageUrl,
    parentGroupName: options?.parentGroupName ?? null,
  };
}

function isAncestorGroup(
  ancestorGroupId: number,
  descendantGroupId: number,
  groupsById: Map<number, GroupNode>
) {
  const visited = new Set<number>();
  let current = groupsById.get(descendantGroupId);

  while (current && current.parentGroupId !== null) {
    if (visited.has(current.id)) {
      return false;
    }

    visited.add(current.id);
    const parentGroupId = current.parentGroupId;
    if (parentGroupId === ancestorGroupId) {
      return true;
    }

    current = groupsById.get(parentGroupId);
  }

  return false;
}

function resolveRootGroup(
  groupId: number,
  groupsById: Map<number, GroupNode>
): GroupNode | null {
  let current = groupsById.get(groupId);
  const visited = new Set<number>();

  while (current && current.parentGroupId !== null) {
    if (visited.has(current.id)) {
      break;
    }

    visited.add(current.id);
    const parent = groupsById.get(current.parentGroupId);
    if (!parent) {
      break;
    }

    current = parent;
  }

  return current ?? null;
}

function getAncestorChainFromRoot(
  groupId: number,
  groupsById: Map<number, GroupNode>
) {
  const chain: number[] = [];
  const visited = new Set<number>();
  let current = groupsById.get(groupId);

  while (current) {
    if (visited.has(current.id)) {
      break;
    }

    visited.add(current.id);
    chain.push(current.id);

    if (current.parentGroupId === null) {
      break;
    }

    current = groupsById.get(current.parentGroupId);
  }

  return chain.reverse();
}

function getLowestCommonAncestorGroupId(
  groupIds: number[],
  groupsById: Map<number, GroupNode>
) {
  if (groupIds.length === 0) {
    return null;
  }

  const chains = groupIds
    .map((groupId) => getAncestorChainFromRoot(groupId, groupsById))
    .filter((chain) => chain.length > 0);

  if (chains.length === 0) {
    return null;
  }

  const shortestLength = Math.min(...chains.map((chain) => chain.length));
  let lcaGroupId: number | null = null;

  for (let index = 0; index < shortestLength; index += 1) {
    const candidateGroupId = chains[0][index];
    const matchesInAllChains = chains.every(
      (chain) => chain[index] === candidateGroupId
    );

    if (!matchesInAllChains) {
      break;
    }

    lcaGroupId = candidateGroupId;
  }

  return lcaGroupId;
}

async function getHighSimilarityMatch(searchText: string) {
  const normalizedSearchText = searchText.trim();

  if (!normalizedSearchText) {
    return null;
  }

  const similarityVariants = getSimilarityVariants(normalizedSearchText);
  if (similarityVariants.length === 0) {
    return null;
  }

  const similarityExpressions = similarityVariants.map(
    (variant) =>
      sql`similarity(
        unaccent(lower(${groups.name})),
        unaccent(lower(${variant}))
      )`
  );

  const similarityScore =
    similarityExpressions.length === 1
      ? similarityExpressions[0]
      : sql`greatest(${sql.join(similarityExpressions, sql`, `)})`;

  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      humanNameId: groups.humanNameId,
      parentGroupId: groups.parentGroupId,
      isComparable: groups.isComparable,
      imageUrl: groups.imageUrl,
      similarityScore: similarityScore.as("similarityScore"),
    })
    .from(groups)
    .where(sql`${similarityScore} >= ${HIGH_GROUP_SIMILARITY_THRESHOLD}`)
    .orderBy(desc(similarityScore), asc(groups.name), asc(groups.id))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  console.log(rows)

  const bestGroup = rows[0];
  return {
    id: bestGroup.id,
    name: bestGroup.name,
    humanNameId: bestGroup.humanNameId,
    parentGroupId: bestGroup.parentGroupId,
    isComparable: bestGroup.isComparable,
    imageUrl: bestGroup.imageUrl,
  };
}

async function getDirectChildGroups(parentGroupId: number) {
  return db.query.groups.findMany({
    columns: {
      id: true,
      name: true,
      humanNameId: true,
      parentGroupId: true,
      isComparable: true,
      imageUrl: true,
    },
    where: (groups, { eq }) => eq(groups.parentGroupId, parentGroupId),
    orderBy: (groups, { asc }) => asc(groups.name),
  });
}

async function getTopTreeGroupsFromProducts(
  productIds: number[],
  limit = 10
): Promise<ExploreGroupResult[]> {
  if (productIds.length === 0) {
    return [];
  }

  const [productGroupRows, allGroups] = await Promise.all([
    db
      .select({
        productId: productsGroups.productId,
        groupId: productsGroups.groupId,
      })
      .from(productsGroups)
      .where(inArray(productsGroups.productId, productIds)),
    db.query.groups.findMany({
      columns: {
        id: true,
        name: true,
        humanNameId: true,
        parentGroupId: true,
        isComparable: true,
        imageUrl: true,
      },
    }),
  ]);

  if (productGroupRows.length === 0 || allGroups.length === 0) {
    return [];
  }

  const groupsById = new Map(allGroups.map((group) => [group.id, group]));
  const groupIdsByProduct = new Map<number, Set<number>>();

  for (const row of productGroupRows) {
    let groupIds = groupIdsByProduct.get(row.productId);
    if (!groupIds) {
      groupIds = new Set<number>();
      groupIdsByProduct.set(row.productId, groupIds);
    }
    groupIds.add(row.groupId);
  }

  const effectiveGroupIdsByProduct = new Map<number, number[]>();
  const effectiveGroupIdsByRoot = new Map<number, Set<number>>();

  for (const [productId, productGroupIds] of groupIdsByProduct.entries()) {
    const candidateGroupIds = Array.from(productGroupIds);
    const effectiveGroupIds = candidateGroupIds.filter((candidateGroupId) => {
      return !candidateGroupIds.some(
        (otherGroupId) =>
          otherGroupId !== candidateGroupId &&
          isAncestorGroup(candidateGroupId, otherGroupId, groupsById)
      );
    });

    effectiveGroupIdsByProduct.set(productId, effectiveGroupIds);

    for (const groupId of effectiveGroupIds) {
      const rootGroup = resolveRootGroup(groupId, groupsById);
      if (rootGroup) {
        let rootSet = effectiveGroupIdsByRoot.get(rootGroup.id);
        if (!rootSet) {
          rootSet = new Set<number>();
          effectiveGroupIdsByRoot.set(rootGroup.id, rootSet);
        }

        rootSet.add(groupId);
      }
    }
  }

  const representativeGroupIdByRoot = new Map<number, number>();
  for (const [rootGroupId, groupIds] of effectiveGroupIdsByRoot.entries()) {
    const lcaGroupId = getLowestCommonAncestorGroupId(
      Array.from(groupIds),
      groupsById
    );

    representativeGroupIdByRoot.set(rootGroupId, lcaGroupId ?? rootGroupId);
  }

  const groupedByProduct = new Map<number, Map<number, GroupNode>>();

  for (const [productId, effectiveGroupIds] of effectiveGroupIdsByProduct.entries()) {
    let groupsForProduct = groupedByProduct.get(productId);
    if (!groupsForProduct) {
      groupsForProduct = new Map();
      groupedByProduct.set(productId, groupsForProduct);
    }

    for (const groupId of effectiveGroupIds) {
      const rootGroup = resolveRootGroup(groupId, groupsById);
      if (!rootGroup) {
        continue;
      }

      const representativeGroupId =
        representativeGroupIdByRoot.get(rootGroup.id) ?? rootGroup.id;
      const group = groupsById.get(representativeGroupId);
      if (!group) {
        continue;
      }

      if (!groupsForProduct.has(group.id)) {
        groupsForProduct.set(group.id, group);
      }
    }
  }

  const aggregates = new Map<number, GroupAggregate>();

  productIds.forEach((productId, index) => {
    const groupsForProduct = groupedByProduct.get(productId);
    if (!groupsForProduct) {
      return;
    }

    for (const group of groupsForProduct.values()) {
      const existing = aggregates.get(group.id);
      if (existing) {
        existing.count += 1;
      } else {
        aggregates.set(group.id, {
          row: group,
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
    .slice(0, limit);

  return topByCount.map(({ row }) => mapGroupNodeToExploreResult(row));
}

export async function getExploreParentGroups(
  searchText: string,
  limit = 10
): Promise<ExploreGroupResult[]> {
  const highSimilarityGroup = await getHighSimilarityMatch(searchText);

  if (highSimilarityGroup) {
    const directChildGroups = await getDirectChildGroups(highSimilarityGroup.id);

    if (directChildGroups.length > 0) {
      return directChildGroups
        .slice(0, limit)
        .map((group) =>
          mapGroupNodeToExploreResult(group, {
            parentGroupName: highSimilarityGroup.name,
          })
        );
    }

    return [mapGroupNodeToExploreResult(highSimilarityGroup)].slice(0, limit);
  }

  const allMatchedProducts = await searchProductIds(searchText);

  return getTopTreeGroupsFromProducts(allMatchedProducts.productIds, limit);
}

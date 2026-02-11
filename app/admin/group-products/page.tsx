import { db } from "@/db";
import {
  groups as groupsTable,
  products as productsTable,
  productsGroups,
  productsShopsPrices,
} from "@/db/schema";
import Image from "next/image";
import Link from "next/link";
import { getShopsIds, toSlug } from "@/lib/utils";
import { BottomPagination } from "@/components/bottom-pagination";
import { ProductImage } from "@/components/product-image";
import { searchProducts } from "@/lib/search-query";
import { expandUnitFilter } from "@/lib/unit-utils";
import { Unit } from "@/components/unit";
import { getUser } from "@/lib/supabase";
import {
  normalizeUnitFiltersForSearch,
  parseUnitFilterParam,
} from "@/utils/unit-filter";
import { ProductBrand } from "@/components/product-brand";
import { validateAdminUser } from "@/lib/authentication";
import { GroupProductsToolbar } from "./client";
import { TypographyH3 } from "@/components/typography-h3";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GroupProductActionButton } from "./group-product-action-button";

type Props = {
  searchParams: Promise<{
    value: string | undefined;
    page: string | undefined;
    shop_ids: string | undefined;
    only_shop_products: string | undefined;
    unit_filter: string | undefined;
    groupId: string | undefined;
    multi_tree: string | undefined;
    unassigned_only: string | undefined;
  }>;
};

type GroupProduct = Awaited<ReturnType<typeof searchProducts>>["products"][number];
type ProductsAndTotal = Awaited<ReturnType<typeof searchProducts>>;

function getOffset(page: string | undefined): number {
  if (!page) {
    return 0;
  }

  const pageNumber = Number(page);
  if (isNaN(pageNumber)) {
    return 0;
  }

  if (!pageNumber) {
    return 0;
  }

  return (Number(page) - 1) * 15;
}

function normalizeUnitFiltersForQuery(units: string[]): string[] {
  return Array.from(
    new Set(
      units.flatMap((unit) => {
        const expanded = expandUnitFilter(unit);

        return expanded.flatMap((variant) => {
          const match = variant.match(/^1\s+(.+)$/);
          if (match) {
            const baseUnit = match[1].trim();
            return baseUnit ? [variant, baseUnit] : [variant];
          }
          return [variant];
        });
      })
    )
  );
}

async function fetchProductsForRows(
  rows: Array<{ id: number }>
) {
  const productsResponse = await db.query.products.findMany({
    columns: {
      id: true,
      categoryId: true,
      name: true,
      unit: true,
      image: true,
    },
    where: (products, { inArray }) =>
      inArray(
        products.id,
        rows.map((row) => row.id)
      ),
    with: {
      shopCurrentPrices: true,
      brand: {
        columns: {
          id: true,
          name: true,
        },
      },
      possibleBrand: {
        columns: {
          id: true,
          name: true,
        },
      },
      productDeal: {
        columns: {
          dropPercentage: true,
        },
      },
    },
  });

  const byId = new Map(productsResponse.map((product) => [product.id, product]));
  return rows.map((row) => byId.get(row.id)!);
}

async function getMultiTreeProducts({
  limit,
  offset,
  shopIds,
  includeHiddenProducts,
  onlySupermarketProducts,
  unitsFilter,
}: {
  limit: number;
  offset: number;
  shopIds?: number[];
  includeHiddenProducts: boolean;
  onlySupermarketProducts: boolean;
  unitsFilter: string[];
}) {
  const normalizedUnitsFilter = normalizeUnitFiltersForQuery(unitsFilter);
  const hasUnitFilter = normalizedUnitsFilter.length > 0;
  const unitsArray = hasUnitFilter
    ? sql`ARRAY[${sql.join(
        normalizedUnitsFilter.map((unit) => sql`${unit}`),
        sql`, `
      )}]`
    : null;

  const supermarketBrandIds = [28, 54, 9, 77, 80, 69, 19, 30, 2527];
  const supermarketNameKeywords = [
    "bravo",
    "lider",
    "wala",
    "selection",
    "gold",
    "zerca",
    "mubravo",
  ];
  const keywordConditions = supermarketNameKeywords.map((keyword) =>
    sql`unaccent(${productsTable.name}) ~* ('\\y' || ${keyword} || '\\y')`
  );

  const shopFilter =
    shopIds && shopIds.length > 0
      ? sql`AND ${productsShopsPrices.shopId} IN (${sql.join(
          shopIds,
          sql`,`
        )})`
      : sql``;

  const hiddenFilter = includeHiddenProducts
    ? sql``
    : sql`AND (${productsShopsPrices.hidden} IS NULL OR ${productsShopsPrices.hidden} = FALSE)`;

  const unitFilter = hasUnitFilter && unitsArray
    ? sql`AND ${productsTable.unit} = ANY(${unitsArray})`
    : sql``;

  const supermarketFilter = onlySupermarketProducts
    ? sql`
        AND ${productsTable.brandId} IN (${sql.join(
          supermarketBrandIds,
          sql`,`
        )})
        AND (${sql.join(keywordConditions, sql` OR `)})
      `
    : sql``;

  const query = sql`
    WITH sibling_parent_matches AS (
      SELECT ${productsGroups.productId} AS product_id,
        ${groupsTable.parentGroupId} AS parent_id
      FROM ${productsGroups}
      JOIN ${groupsTable} ON ${productsGroups.groupId} = ${groupsTable.id}
      WHERE ${groupsTable.parentGroupId} IS NOT NULL
      GROUP BY ${productsGroups.productId}, ${groupsTable.parentGroupId}
      HAVING COUNT(DISTINCT ${productsGroups.groupId}) >= 2
    ),
    multi_tree AS (
      SELECT DISTINCT product_id
      FROM sibling_parent_matches
    )
    SELECT ${productsTable.id} AS id, COUNT(*) OVER() AS total_count
    FROM ${productsTable}
    JOIN multi_tree mt ON mt.product_id = ${productsTable.id}
    WHERE ${productsTable.deleted} IS NOT TRUE
      ${unitFilter}
      ${supermarketFilter}
      AND EXISTS (
        SELECT 1
        FROM ${productsShopsPrices}
        WHERE ${productsShopsPrices.productId} = ${productsTable.id}
        ${shopFilter}
        ${hiddenFilter}
      )
    ORDER BY ${productsTable.id} ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const rows = await db.execute<{ id: number; total_count: string }>(query);
  if (rows.length === 0) {
    return { products: [], total: 0 };
  }

  const orderedProducts = await fetchProductsForRows(rows);

  return {
    products: orderedProducts,
    total: Number(rows[0].total_count),
  };
}

async function getUngroupedProducts({
  limit,
  offset,
  shopIds,
  includeHiddenProducts,
  onlySupermarketProducts,
  unitsFilter,
}: {
  limit: number;
  offset: number;
  shopIds?: number[];
  includeHiddenProducts: boolean;
  onlySupermarketProducts: boolean;
  unitsFilter: string[];
}) {
  const normalizedUnitsFilter = normalizeUnitFiltersForQuery(unitsFilter);
  const hasUnitFilter = normalizedUnitsFilter.length > 0;
  const unitsArray = hasUnitFilter
    ? sql`ARRAY[${sql.join(
        normalizedUnitsFilter.map((unit) => sql`${unit}`),
        sql`, `
      )}]`
    : null;

  const supermarketBrandIds = [28, 54, 9, 77, 80, 69, 19, 30, 2527];
  const supermarketNameKeywords = [
    "bravo",
    "lider",
    "wala",
    "selection",
    "gold",
    "zerca",
    "mubravo",
  ];
  const keywordConditions = supermarketNameKeywords.map((keyword) =>
    sql`unaccent(${productsTable.name}) ~* ('\\y' || ${keyword} || '\\y')`
  );

  const shopFilter =
    shopIds && shopIds.length > 0
      ? sql`AND ${productsShopsPrices.shopId} IN (${sql.join(
          shopIds,
          sql`,`
        )})`
      : sql``;

  const hiddenFilter = includeHiddenProducts
    ? sql``
    : sql`AND (${productsShopsPrices.hidden} IS NULL OR ${productsShopsPrices.hidden} = FALSE)`;

  const unitFilter =
    hasUnitFilter && unitsArray
      ? sql`AND ${productsTable.unit} = ANY(${unitsArray})`
      : sql``;

  const supermarketFilter = onlySupermarketProducts
    ? sql`
        AND ${productsTable.brandId} IN (${sql.join(
          supermarketBrandIds,
          sql`,`
        )})
        AND (${sql.join(keywordConditions, sql` OR `)})
      `
    : sql``;

  const query = sql`
    SELECT ${productsTable.id} AS id, COUNT(*) OVER() AS total_count
    FROM ${productsTable}
    WHERE ${productsTable.deleted} IS NOT TRUE
      ${unitFilter}
      ${supermarketFilter}
      AND NOT EXISTS (
        SELECT 1
        FROM ${productsGroups}
        WHERE ${productsGroups.productId} = ${productsTable.id}
      )
      AND EXISTS (
        SELECT 1
        FROM ${productsShopsPrices}
        WHERE ${productsShopsPrices.productId} = ${productsTable.id}
        ${shopFilter}
        ${hiddenFilter}
      )
    ORDER BY ${productsTable.id} ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const rows = await db.execute<{ id: number; total_count: string }>(query);
  if (rows.length === 0) {
    return { products: [], total: 0 };
  }

  const orderedProducts = await fetchProductsForRows(rows);

  return {
    products: orderedProducts,
    total: Number(rows[0].total_count),
  };
}

async function getAllProducts({
  limit,
  offset,
  shopIds,
  includeHiddenProducts,
  onlySupermarketProducts,
  unitsFilter,
}: {
  limit: number;
  offset: number;
  shopIds?: number[];
  includeHiddenProducts: boolean;
  onlySupermarketProducts: boolean;
  unitsFilter: string[];
}) {
  const normalizedUnitsFilter = normalizeUnitFiltersForQuery(unitsFilter);
  const hasUnitFilter = normalizedUnitsFilter.length > 0;
  const unitsArray = hasUnitFilter
    ? sql`ARRAY[${sql.join(
        normalizedUnitsFilter.map((unit) => sql`${unit}`),
        sql`, `
      )}]`
    : null;

  const supermarketBrandIds = [28, 54, 9, 77, 80, 69, 19, 30, 2527];
  const supermarketNameKeywords = [
    "bravo",
    "lider",
    "wala",
    "selection",
    "gold",
    "zerca",
    "mubravo",
  ];
  const keywordConditions = supermarketNameKeywords.map((keyword) =>
    sql`unaccent(${productsTable.name}) ~* ('\\y' || ${keyword} || '\\y')`
  );

  const shopFilter =
    shopIds && shopIds.length > 0
      ? sql`AND ${productsShopsPrices.shopId} IN (${sql.join(
          shopIds,
          sql`,`
        )})`
      : sql``;

  const hiddenFilter = includeHiddenProducts
    ? sql``
    : sql`AND (${productsShopsPrices.hidden} IS NULL OR ${productsShopsPrices.hidden} = FALSE)`;

  const unitFilter =
    hasUnitFilter && unitsArray
      ? sql`AND ${productsTable.unit} = ANY(${unitsArray})`
      : sql``;

  const supermarketFilter = onlySupermarketProducts
    ? sql`
        AND ${productsTable.brandId} IN (${sql.join(
          supermarketBrandIds,
          sql`,`
        )})
        AND (${sql.join(keywordConditions, sql` OR `)})
      `
    : sql``;

  const query = sql`
    SELECT ${productsTable.id} AS id, COUNT(*) OVER() AS total_count
    FROM ${productsTable}
    WHERE ${productsTable.deleted} IS NOT TRUE
      ${unitFilter}
      ${supermarketFilter}
      AND EXISTS (
        SELECT 1
        FROM ${productsShopsPrices}
        WHERE ${productsShopsPrices.productId} = ${productsTable.id}
        ${shopFilter}
        ${hiddenFilter}
      )
    ORDER BY ${productsTable.id} ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const rows = await db.execute<{ id: number; total_count: string }>(query);
  if (rows.length === 0) {
    return { products: [], total: 0 };
  }

  const orderedProducts = await fetchProductsForRows(rows);

  return {
    products: orderedProducts,
    total: Number(rows[0].total_count),
  };
}

async function getAncestorGroupIds(groupId: number): Promise<number[]> {
  const allGroups = await db.query.groups.findMany({
    columns: { id: true, parentGroupId: true },
  });

  const groupById = new Map(allGroups.map((group) => [group.id, group]));
  const ancestors: number[] = [];
  const visited = new Set<number>();
  let currentId: number | null = groupId;

  while (currentId !== null && !visited.has(currentId)) {
    visited.add(currentId);
    const group = groupById.get(currentId);

    if (group && group.parentGroupId !== null) {
      ancestors.push(group.parentGroupId);
      currentId = group.parentGroupId;
    } else {
      break;
    }
  }

  return ancestors;
}

async function getDescendantGroupIds(groupId: number): Promise<number[]> {
  const allGroups = await db.query.groups.findMany({
    columns: { id: true, parentGroupId: true },
  });

  const childrenByParentId = new Map<number, number[]>();
  for (const group of allGroups) {
    if (group.parentGroupId === null) {
      continue;
    }

    const children = childrenByParentId.get(group.parentGroupId);
    if (children) {
      children.push(group.id);
    } else {
      childrenByParentId.set(group.parentGroupId, [group.id]);
    }
  }

  const descendants: number[] = [];
  const visited = new Set<number>([groupId]);
  const toProcess = [groupId];

  while (toProcess.length > 0) {
    const currentId = toProcess.pop();
    if (currentId === undefined) {
      continue;
    }

    const children = childrenByParentId.get(currentId) ?? [];
    for (const childId of children) {
      if (visited.has(childId)) {
        continue;
      }

      visited.add(childId);
      descendants.push(childId);
      toProcess.push(childId);
    }
  }

  return descendants;
}

async function addProductToGroup(formData: FormData) {
  "use server";

  await validateAdminUser();
  const productId = Number(formData.get("productId"));
  const groupId = Number(formData.get("groupId"));

  if (
    !Number.isFinite(productId) ||
    !Number.isFinite(groupId) ||
    productId <= 0 ||
    groupId <= 0
  ) {
    return;
  }

  const ancestorIds = await getAncestorGroupIds(groupId);
  const groupIdsToInsert = [groupId, ...ancestorIds];

  const inserted = await db
    .insert(productsGroups)
    .values(groupIdsToInsert.map((id) => ({ productId, groupId: id })))
    .onConflictDoNothing()
    .returning({ productId: productsGroups.productId });

  if (inserted.length > 0) {
    revalidatePath("/admin/group-products");
  }
}

async function createGroup(formData: FormData) {
  "use server";

  await validateAdminUser();
  const name = String(formData.get("groupName") ?? "").trim();
  const returnParams = String(formData.get("returnParams") ?? "");

  if (!name) {
    return;
  }

  const baseSlug = toSlug(name);
  if (!baseSlug) {
    return;
  }

  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await db.query.groups.findFirst({
      columns: {
        id: true,
      },
      where: (groups, { eq }) => eq(groups.humanNameId, slug),
    });

    if (!existing) {
      break;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const insertedGroups = await db
    .insert(groupsTable)
    .values({
      name,
      humanNameId: slug,
    })
    .returning({ id: groupsTable.id });

  const newGroupId = insertedGroups[0]?.id;
  const params = new URLSearchParams(returnParams);

  if (newGroupId) {
    params.set("groupId", String(newGroupId));
  }

  params.delete("page");

  const query = params.toString();
  redirect(query ? `/admin/group-products?${query}` : "/admin/group-products");
}

async function removeProductFromGroup(formData: FormData) {
  "use server";

  await validateAdminUser();
  const productId = Number(formData.get("productId"));
  const groupId = Number(formData.get("groupId"));

  if (
    !Number.isFinite(productId) ||
    !Number.isFinite(groupId) ||
    productId <= 0 ||
    groupId <= 0
  ) {
    return;
  }

  const descendantIds = await getDescendantGroupIds(groupId);
  const groupIdsToRemove = [groupId, ...descendantIds];

  const deleted = await db
    .delete(productsGroups)
    .where(
      and(
        eq(productsGroups.productId, productId),
        inArray(productsGroups.groupId, groupIdsToRemove)
      )
    )
    .returning({ productId: productsGroups.productId });

  if (deleted.length > 0) {
    revalidatePath("/admin/group-products");
  }
}

export default function Page({ searchParams }: Props) {
  return (
    <Suspense fallback={<GroupProductsFallback />}>
      <GroupProductsPage searchParams={searchParams} />
    </Suspense>
  );
}

async function GroupProductsPage({ searchParams }: Props) {
  await validateAdminUser();

  const {
    value,
    page,
    shop_ids,
    only_shop_products,
    unit_filter,
    groupId,
    multi_tree,
    unassigned_only,
  } =
    await searchParams;

  const groups = await db.query.groups.findMany({
    columns: {
      id: true,
      name: true,
      description: true,
      parentGroupId: true,
    },
    orderBy: (groups, { asc }) => asc(groups.name),
  });

  const shopLogoById = new Map(
    (
      await db.query.shops.findMany({
        columns: {
          id: true,
          logo: true,
        },
      })
    ).map((shop) => [shop.id, shop.logo])
  );

  const isLegacyUnassignedOnly = groupId === "__unassigned__";
  const selectedGroupId =
    groupId && !isLegacyUnassignedOnly ? Number(groupId) : undefined;
  const resolvedGroupId =
    selectedGroupId && Number.isFinite(selectedGroupId) && selectedGroupId > 0
      ? selectedGroupId
      : undefined;

  const searchValue = value ?? "";
  const trimmedValue = searchValue.trim();
  const shopsIds = getShopsIds(shop_ids);

  const user = await getUser();
  const canSeeHiddenProducts = user?.email?.toLowerCase() === "geielpeguero@gmail.com";

  const unitFilters = normalizeUnitFiltersForSearch(
    parseUnitFilterParam(unit_filter)
  );
  const unassignedOnly =
    isLegacyUnassignedOnly ||
    unassigned_only === "1" ||
    unassigned_only === "true";
  const multiTreeOnly =
    (multi_tree === "1" || multi_tree === "true") && !unassignedOnly;

  const onlySupermarketProducts = only_shop_products ? true : false;
  let productsAndTotal: ProductsAndTotal;

  if (!trimmedValue) {
    if (unassignedOnly) {
      productsAndTotal = await getUngroupedProducts({
        limit: 15,
        offset: getOffset(page),
        shopIds: shopsIds,
        includeHiddenProducts: canSeeHiddenProducts,
        onlySupermarketProducts,
        unitsFilter: unitFilters,
      });
    } else if (multiTreeOnly) {
      productsAndTotal = await getMultiTreeProducts({
        limit: 15,
        offset: getOffset(page),
        shopIds: shopsIds,
        includeHiddenProducts: canSeeHiddenProducts,
        onlySupermarketProducts,
        unitsFilter: unitFilters,
      });
    } else {
      productsAndTotal = await getAllProducts({
        limit: 15,
        offset: getOffset(page),
        shopIds: shopsIds,
        includeHiddenProducts: canSeeHiddenProducts,
        onlySupermarketProducts,
        unitsFilter: unitFilters,
      });
    }
  } else {
    productsAndTotal = await searchProducts(
      trimmedValue,
      15,
      getOffset(page),
      true,
      shopsIds,
      canSeeHiddenProducts,
      onlySupermarketProducts,
      unitFilters,
      unassignedOnly
    );
  }

  const filteredProducts = productsAndTotal.products.filter((product) => {
    if (product.shopCurrentPrices.length === 0) {
      productsAndTotal.total -= 1;
    }

    return product.shopCurrentPrices.length > 0;
  });

  if (filteredProducts.length === 0) {
    const emptyTitle = unassignedOnly
      ? "No hay productos sin grupo asignado"
      : multiTreeOnly
        ? "No hay productos con m\u00faltiples categor\u00edas"
        : "Productos no encontrados";
    const emptyDescription = unassignedOnly
      ? trimmedValue
        ? "No hay productos sin grupo asignado para esta b\u00fasqueda."
        : "No hay productos sin grupo asignado."
      : multiTreeOnly
        ? trimmedValue
          ? "No hay productos con m\u00faltiples categor\u00edas para esta b\u00fasqueda."
          : "No hay productos con m\u00faltiples categor\u00edas."
        : trimmedValue
          ? "No hay resultados para esta b\u00fasqueda."
          : "No hay productos disponibles con los filtros actuales.";

    return (
      <div className="container mx-auto pb-4 pt-4">
        <div className="flex flex-1 flex-col gap-4">
          <TypographyH3>Asignar productos a grupo</TypographyH3>
          <GroupProductsToolbar
            groups={groups}
            createGroup={createGroup}
            initialValue={searchValue}
            initialGroupId={resolvedGroupId}
            initialMultiTree={multiTreeOnly}
            initialUnassignedOnly={unassignedOnly}
          />
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{emptyTitle}</EmptyTitle>
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    );
  }

  const filteredProductIds = filteredProducts.map((product) => product.id);
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const productGroupEntries =
    filteredProductIds.length > 0
      ? await db.query.productsGroups.findMany({
          columns: {
            productId: true,
            groupId: true,
          },
          where: (productsGroups, { inArray }) =>
            inArray(productsGroups.productId, filteredProductIds),
        })
      : [];

  const productGroupsByProductId = new Map<
    number,
    { id: number; name: string }[]
  >();
  const groupProductIds = new Set<number>();
  const siblingGroupsByParentIdByProductId = new Map<
    number,
    Map<number, Set<number>>
  >();

  for (const entry of productGroupEntries) {
    const group = groupById.get(entry.groupId);
    if (group) {
      const existingGroups = productGroupsByProductId.get(entry.productId);
      const groupInfo = { id: entry.groupId, name: group.name };
      if (existingGroups) {
        existingGroups.push(groupInfo);
      } else {
        productGroupsByProductId.set(entry.productId, [groupInfo]);
      }
    }

    if (resolvedGroupId && entry.groupId === resolvedGroupId) {
      groupProductIds.add(entry.productId);
    }

    if (group?.parentGroupId != null) {
      let siblingGroupsByParentId =
        siblingGroupsByParentIdByProductId.get(entry.productId);
      if (!siblingGroupsByParentId) {
        siblingGroupsByParentId = new Map<number, Set<number>>();
        siblingGroupsByParentIdByProductId.set(
          entry.productId,
          siblingGroupsByParentId
        );
      }

      let siblingGroupIds = siblingGroupsByParentId.get(group.parentGroupId);
      if (!siblingGroupIds) {
        siblingGroupIds = new Set<number>();
        siblingGroupsByParentId.set(group.parentGroupId, siblingGroupIds);
      }

      siblingGroupIds.add(entry.groupId);
    }
  }

  for (const groupsList of productGroupsByProductId.values()) {
    groupsList.sort((a, b) => {
      const nameOrder = a.name.localeCompare(b.name);
      return nameOrder !== 0 ? nameOrder : a.id - b.id;
    });
  }

  const multiTreeProductIds = new Set<number>();
  for (const [
    productId,
    siblingGroupsByParentId,
  ] of siblingGroupsByParentIdByProductId) {
    const hasMultipleGroupsWithSameParent = Array.from(
      siblingGroupsByParentId.values()
    ).some((siblingGroupIds) => siblingGroupIds.size >= 2);

    if (hasMultipleGroupsWithSameParent) {
      multiTreeProductIds.add(productId);
    }
  }

  let visibleProducts = filteredProducts;
  if (multiTreeOnly && !unassignedOnly) {
    const beforeCount = visibleProducts.length;
    visibleProducts = visibleProducts.filter((product) =>
      multiTreeProductIds.has(product.id)
    );
    productsAndTotal.total = Math.max(
      0,
      productsAndTotal.total - (beforeCount - visibleProducts.length)
    );
  }

  if (visibleProducts.length === 0) {
    return (
      <div className="container mx-auto pb-4 pt-4">
        <div className="flex flex-1 flex-col gap-4">
          <TypographyH3>Asignar productos a grupo</TypographyH3>
          <GroupProductsToolbar
            groups={groups}
            createGroup={createGroup}
            initialValue={searchValue}
            initialGroupId={resolvedGroupId}
            initialMultiTree={multiTreeOnly}
            initialUnassignedOnly={unassignedOnly}
          />
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Productos no encontrados</EmptyTitle>
              <EmptyDescription>
                {unassignedOnly
                  ? "No hay productos sin grupo asignado para esta b\u00fasqueda."
                  : multiTreeOnly
                    ? "No hay productos con m\u00faltiples categor\u00edas para esta b\u00fasqueda."
                    : trimmedValue
                      ? "No hay resultados para esta b\u00fasqueda."
                      : "No hay productos disponibles con los filtros actuales."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-4 pt-4">
      <div className="flex flex-1 flex-col gap-4">
        <TypographyH3>Asignar productos a grupo</TypographyH3>
        <GroupProductsToolbar
          groups={groups}
          createGroup={createGroup}
          initialValue={searchValue}
          initialGroupId={resolvedGroupId}
          initialMultiTree={multiTreeOnly}
          initialUnassignedOnly={unassignedOnly}
        />
        <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
          {visibleProducts.map((product) => {
            const isInGroup = resolvedGroupId
              ? groupProductIds.has(product.id)
              : false;
            const productGroups = productGroupsByProductId.get(product.id) ?? [];

            return (
              <div
                key={product.id}
                className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px] relative"
              >
                <div className="absolute top-2 left-2 z-10">
                  {isInGroup ? (
                    <form action={removeProductFromGroup}>
                      <input
                        type="hidden"
                        name="productId"
                        value={product.id}
                      />
                      <input
                        type="hidden"
                        name="groupId"
                        value={resolvedGroupId ?? ""}
                      />
                      <GroupProductActionButton
                        variant="destructive"
                        label="Remover"
                        disabled={!resolvedGroupId}
                      />
                    </form>
                  ) : (
                    <form action={addProductToGroup}>
                      <input
                        type="hidden"
                        name="productId"
                        value={product.id}
                      />
                      <input
                        type="hidden"
                        name="groupId"
                        value={resolvedGroupId ?? ""}
                      />
                      <GroupProductActionButton
                        variant="outline"
                        label="Agregar"
                        disabled={!resolvedGroupId}
                      />
                    </form>
                  )}
                </div>
                <Link
                  href={`/productos/${toSlug(product.name)}/${product.id}`}
                  className="flex flex-col gap-2"
                  prefetch={false}
                >
                  <div className="flex justify-center">
                    <div className="h-[220px] w-[220px] relative">
                      <ExploreImage product={product} />
                    </div>
                  </div>
                  <Unit unit={product.unit} />
                  {productGroups.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {productGroups.map((group) => (
                        <Badge
                          key={group.id}
                          variant="secondary"
                          className="px-1 py-0 text-[10px] leading-4"
                        >
                          {group.name}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <div>
                    <ProductBrand
                      brand={product.brand}
                      possibleBrand={product.possibleBrand}
                      type="explore"
                    />
                    {product.name}
                  </div>
                  <ShopExclusive
                    shopPrices={product.shopCurrentPrices}
                    shopLogoById={shopLogoById}
                  />
                </Link>
              </div>
            );
          })}
        </div>
        <BottomPagination items={productsAndTotal.total} />
      </div>
    </div>
  );
}

function GroupProductsFallback() {
  return (
    <div className="container mx-auto pb-4 pt-4">
      <div className="flex flex-1 flex-col gap-4">
        <TypographyH3>Asignar productos a grupo</TypographyH3>
        <div className="text-sm text-muted-foreground">Cargando...</div>
      </div>
    </div>
  );
}

function ExploreImage({ product }: { product: GroupProduct }) {
  if (!product.image) {
    return (
      <Image
        src="/no-product-found.jpg"
        alt="image product not found"
        fill
        unoptimized
        sizes="220px"
        style={{
          objectFit: "contain",
        }}
        placeholder="blur"
        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
        className="max-w-none"
      />
    );
  }

  return (
    <ProductImage
      src={product.image}
      productId={product.id}
      fill
      alt={product.name + product.unit}
      sizes="220px"
      style={{
        objectFit: "contain",
      }}
      placeholder="blur"
      blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
      className="max-w-none"
    />
  );
}

async function ShopExclusive({
  shopPrices,
  shopLogoById,
}: {
  shopPrices: productsShopsPrices[];
  shopLogoById: Map<number, string>;
}) {
  if (shopPrices.length !== 1) {
    return null;
  }

  const logo = shopLogoById.get(shopPrices[0].shopId);
  if (!logo) {
    return null;
  }

  return (
    <Image
      src={`/supermarket-logo/${logo}`}
      width={0}
      height={0}
      sizes="100vw"
      className="w-[50px] h-auto"
      alt="logo tienda"
      unoptimized
    />
  );
}

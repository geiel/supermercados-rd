import { db } from "@/db";
import {
    groups,
    products,
    productsGroups as productsGroupsTable,
    productsShopsPrices as productsShopsPricesTable,
    shops,
} from "@/db/schema";
import {
    addLineItemPrice,
    addValueLineItem,
    buildGroupEntry,
    buildPairSelectionStats,
    buildSingleSelectionStats,
    calculateTotalPrice,
    computeSelectionStats,
    computeValueScore,
    getValuePrice,
    groupEntriesByShop,
    pickBestSelection,
    type CompareMode,
    type LineItem,
    type ListEntry,
    type ProductWithPrices,
} from "@/lib/list-calculations";
import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

type RequestBody = {
    products: number[];
    groups: number[];
    ignoredByGroup?: Record<number, number[]>;
    selectedShops?: number[];
    compareMode?: string;
};

export type StatsApiResponse = {
    selectedShopIds: number[];
    compareMode: CompareMode;
    entriesWithShop: ListEntry[];
    entriesWithoutShop: ListEntry[];
    totalProducts: number;
    totalPrice: number;
    cheapestSingleShopIds: number[];
    cheapestPairShopIds: number[];
    bestValueSingleShopIds: number[];
    bestValuePairShopIds: number[];
    selectedValueScore: number | null;
    shopsGrouped: Record<string, ListEntry[]>;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as RequestBody;
        const {
            products: providedProducts = [],
            groups: providedGroups = [],
            ignoredByGroup: providedIgnoredByGroup = {},
            selectedShops: providedSelectedShops,
            compareMode: providedCompareMode,
        } = body;

        // Fetch all shops for calculations
        const allShops = await db.query.shops.findMany();
        const allShopIds = allShops.map((shop) => shop.id);

        // Validate and filter input
        const productIds = providedProducts.filter(
            (id) => Number.isFinite(id) && id > 0
        );
        const groupIds = providedGroups.filter(
            (id) => Number.isFinite(id) && id > 0
        );
        const ignoredByGroup = providedIgnoredByGroup;

        // Determine selected shops
        let selectedShopIds: number[];
        if (providedSelectedShops && providedSelectedShops.length > 0) {
            selectedShopIds = providedSelectedShops.filter((id) =>
                allShopIds.includes(id)
            );
        } else {
            selectedShopIds = allShopIds;
        }

        const selectedShopIdSet = new Set(selectedShopIds);
        const compareMode: CompareMode = providedCompareMode === "value" ? "value" : "cheapest";

        // Return empty response if no items
        if (productIds.length === 0 && groupIds.length === 0) {
            return NextResponse.json({
                selectedShopIds,
                compareMode,
                entriesWithShop: [],
                entriesWithoutShop: [],
                totalProducts: 0,
                totalPrice: 0,
                cheapestSingleShopIds: [],
                cheapestPairShopIds: [],
                bestValueSingleShopIds: [],
                bestValuePairShopIds: [],
                selectedValueScore: null,
                shopsGrouped: {},
            } satisfies StatsApiResponse);
        }

        // Amount maps (default to 1 for stats endpoint)
        const listItemAmounts = new Map<number, number>();
        const groupItemAmounts = new Map<number, number>();

        // =====================================================================
        // Fetch product prices for cheapest shop calculations
        // =====================================================================
        const listItemRows =
            productIds.length > 0
                ? await db
                      .select({
                          productId: products.id,
                          unit: products.unit,
                          shopId: productsShopsPricesTable.shopId,
                          price: productsShopsPricesTable.currentPrice,
                      })
                      .from(products)
                      .innerJoin(
                          productsShopsPricesTable,
                          eq(productsShopsPricesTable.productId, products.id)
                      )
                      .where(
                          and(
                              inArray(products.id, productIds),
                              or(isNull(products.deleted), eq(products.deleted, false)),
                              or(
                                  isNull(productsShopsPricesTable.hidden),
                                  eq(productsShopsPricesTable.hidden, false)
                              ),
                              sql`${productsShopsPricesTable.currentPrice} IS NOT NULL`
                          )
                      )
                : [];

        // Fetch group prices (min price per shop)
        const groupItemRows =
            groupIds.length > 0
                ? await db
                      .select({
                          groupId: productsGroupsTable.groupId,
                          shopId: productsShopsPricesTable.shopId,
                          price: sql<string>`MIN(${productsShopsPricesTable.currentPrice})`.as(
                              "price"
                          ),
                      })
                      .from(productsGroupsTable)
                      .innerJoin(products, eq(products.id, productsGroupsTable.productId))
                      .innerJoin(
                          productsShopsPricesTable,
                          eq(productsShopsPricesTable.productId, productsGroupsTable.productId)
                      )
                      .where(
                          and(
                              inArray(productsGroupsTable.groupId, groupIds),
                              or(isNull(products.deleted), eq(products.deleted, false)),
                              or(
                                  isNull(productsShopsPricesTable.hidden),
                                  eq(productsShopsPricesTable.hidden, false)
                              ),
                              sql`${productsShopsPricesTable.currentPrice} IS NOT NULL`
                          )
                      )
                      .groupBy(productsGroupsTable.groupId, productsShopsPricesTable.shopId)
                : [];

        // =====================================================================
        // Build line items for shop selection calculations
        // =====================================================================
        const lineItemsByKey = new Map<string, LineItem>();

        for (const row of listItemRows) {
            if (row.shopId != null && row.price != null) {
                const quantity = listItemAmounts.get(row.productId) ?? 1;
                addLineItemPrice(
                    lineItemsByKey,
                    `product-${row.productId}`,
                    quantity,
                    row.shopId,
                    row.price
                );
            }
        }

        for (const row of groupItemRows) {
            if (row.shopId != null && row.price != null) {
                const quantity = groupItemAmounts.get(row.groupId) ?? 1;
                addLineItemPrice(
                    lineItemsByKey,
                    `group-${row.groupId}`,
                    quantity,
                    row.shopId,
                    row.price
                );
            }
        }

        const lineItems = Array.from(lineItemsByKey.values()).filter(
            (item) => item.pricesByShop.size > 0
        );

        // =====================================================================
        // Calculate best shop selections (cheapest)
        // =====================================================================
        const cheapestSingleSelections = buildSingleSelectionStats(allShopIds, lineItems);
        const cheapestPairSelections = buildPairSelectionStats(allShopIds, lineItems);
        const bestSingleShop = pickBestSelection(cheapestSingleSelections);
        const bestPairShops = pickBestSelection(cheapestPairSelections);
        const cheapestSingleShopIds = bestSingleShop ? bestSingleShop.shopIds : [];
        const cheapestPairShopIds = bestPairShops ? bestPairShops.shopIds : [];

        // =====================================================================
        // Fetch full product data with prices
        // =====================================================================
        const productPrices =
            productIds.length > 0
                ? await db.query.products.findMany({
                      where: (p, { and: andOp, or: orOp, isNull: isNullOp, eq: eqOp }) =>
                          andOp(
                              inArray(p.id, productIds),
                              orOp(isNullOp(p.deleted), eqOp(p.deleted, false))
                          ),
                      with: {
                          shopCurrentPrices: {
                              where: (scp, { and: andOp, or: orOp, isNull: isNullOp, eq: eqOp }) =>
                                  andOp(
                                      orOp(eqOp(scp.hidden, false), isNullOp(scp.hidden)),
                                      inArray(scp.shopId, selectedShopIds)
                                  ),
                              with: { shop: true },
                              orderBy: (prices, { asc: ascOp }) => [ascOp(prices.currentPrice)],
                          },
                      },
                  })
                : [];

        // =====================================================================
        // Fetch groups with products
        // =====================================================================
        const groupProductRows =
            groupIds.length > 0
                ? await db
                      .select({
                          groupId: groups.id,
                          groupName: groups.name,
                          groupCompareBy: groups.compareBy,
                          groupHumanId: groups.humanNameId,
                          productId: products.id,
                          productCategoryId: products.categoryId,
                          productName: products.name,
                          productImage: products.image,
                          productUnit: products.unit,
                          productBrandId: products.brandId,
                          productDeleted: products.deleted,
                          productRank: products.rank,
                          productRelevance: products.relevance,
                          productPossibleBrandId: products.possibleBrandId,
                          productBaseUnit: products.baseUnit,
                          productBaseUnitAmount: products.baseUnitAmount,
                          shopId: productsShopsPricesTable.shopId,
                          priceUrl: productsShopsPricesTable.url,
                          priceApi: productsShopsPricesTable.api,
                          currentPrice: productsShopsPricesTable.currentPrice,
                          regularPrice: productsShopsPricesTable.regularPrice,
                          updateAt: productsShopsPricesTable.updateAt,
                          hidden: productsShopsPricesTable.hidden,
                          shopName: shops.name,
                          shopLogo: shops.logo,
                      })
                      .from(groups)
                      .innerJoin(productsGroupsTable, eq(productsGroupsTable.groupId, groups.id))
                      .innerJoin(products, eq(products.id, productsGroupsTable.productId))
                      .leftJoin(
                          productsShopsPricesTable,
                          and(
                              eq(productsShopsPricesTable.productId, products.id),
                              or(
                                  isNull(productsShopsPricesTable.hidden),
                                  eq(productsShopsPricesTable.hidden, false)
                              )
                          )
                      )
                      .leftJoin(shops, eq(shops.id, productsShopsPricesTable.shopId))
                      .where(
                          and(
                              inArray(groups.id, groupIds),
                              or(isNull(products.deleted), eq(products.deleted, false))
                          )
                      )
                      .orderBy(
                          asc(groups.id),
                          asc(products.id),
                          sql`${productsShopsPricesTable.currentPrice} NULLS LAST`
                      )
                : [];

        // Build groups with products map
        type GroupWithProducts = {
            id: number;
            name: string;
            compareBy: string | null;
            humanId: string | null;
            products: ProductWithPrices[];
        };

        const groupsWithProducts: GroupWithProducts[] = (() => {
            if (groupProductRows.length === 0) return [];

            const groupsMap = new Map<number, GroupWithProducts>();
            const productsMapByGroup = new Map<number, Map<number, ProductWithPrices>>();

            for (const row of groupProductRows) {
                let group = groupsMap.get(row.groupId);
                if (!group) {
                    group = {
                        id: row.groupId,
                        name: row.groupName,
                        compareBy: row.groupCompareBy ?? null,
                        humanId: row.groupHumanId ?? null,
                        products: [],
                    };
                    groupsMap.set(row.groupId, group);
                    productsMapByGroup.set(row.groupId, new Map());
                }

                const productsMap = productsMapByGroup.get(row.groupId);
                if (!productsMap) continue;

                let product = productsMap.get(row.productId);
                if (!product) {
                    product = {
                        id: row.productId,
                        categoryId: row.productCategoryId,
                        name: row.productName,
                        image: row.productImage,
                        unit: row.productUnit,
                        brandId: row.productBrandId,
                        deleted: row.productDeleted ?? null,
                        rank: row.productRank,
                        relevance: row.productRelevance,
                        possibleBrandId: row.productPossibleBrandId,
                        baseUnit: row.productBaseUnit ?? null,
                        baseUnitAmount: row.productBaseUnitAmount ?? null,
                        shopCurrentPrices: [],
                    };
                    productsMap.set(row.productId, product);
                    group.products.push(product);
                }

                if (!row.shopId) continue;

                product.shopCurrentPrices.push({
                    productId: row.productId,
                    shopId: row.shopId,
                    url: row.priceUrl ?? "",
                    api: row.priceApi ?? null,
                    currentPrice: row.currentPrice,
                    regularPrice: row.regularPrice,
                    updateAt: row.updateAt,
                    hidden: row.hidden ?? null,
                    shop: {
                        id: row.shopId,
                        name: row.shopName ?? "",
                        logo: row.shopLogo ?? "",
                    },
                });
            }

            return Array.from(groupsMap.values());
        })();

        // =====================================================================
        // Build value line items for value score calculations
        // =====================================================================
        const valueLineItemsByKey = new Map<string, LineItem>();

        for (const row of listItemRows) {
            if (row.shopId == null || row.price == null) continue;
            const price = Number(row.price);
            if (!Number.isFinite(price)) continue;
            const quantity = listItemAmounts.get(row.productId) ?? 1;
            const valuePrice = getValuePrice(price, row.unit);
            addValueLineItem(
                valueLineItemsByKey,
                `product-${row.productId}`,
                quantity,
                row.shopId,
                valuePrice
            );
        }

        for (const row of groupProductRows) {
            if (!row.shopId || row.currentPrice === null) continue;

            // Skip ignored products
            const ignoredIds = ignoredByGroup[row.groupId] ?? [];
            if (ignoredIds.includes(row.productId)) continue;

            const price = Number(row.currentPrice);
            if (!Number.isFinite(price)) continue;
            const quantity = groupItemAmounts.get(row.groupId) ?? 1;
            const valuePrice = getValuePrice(price, row.productUnit);
            addValueLineItem(
                valueLineItemsByKey,
                `group-${row.groupId}`,
                quantity,
                row.shopId,
                valuePrice
            );
        }

        const valueLineItems = Array.from(valueLineItemsByKey.values()).filter(
            (item) => item.pricesByShop.size > 0
        );

        // =====================================================================
        // Calculate best value shop selections
        // =====================================================================
        const valueSingleSelections = buildSingleSelectionStats(allShopIds, valueLineItems);
        const valuePairSelections = buildPairSelectionStats(allShopIds, valueLineItems);
        const bestValueSingleShop = pickBestSelection(valueSingleSelections);
        const bestValuePairShops = pickBestSelection(valuePairSelections);
        const selectedValueSelection = computeSelectionStats(selectedShopIds, valueLineItems);
        const selectedValueScore =
            selectedShopIds.length > 0
                ? computeValueScore(selectedValueSelection, valueLineItems.length, allShopIds.length)
                : null;

        const bestValueSingleShopIds = bestValueSingleShop ? bestValueSingleShop.shopIds : [];
        const bestValuePairShopIds = bestValuePairShops ? bestValuePairShops.shopIds : [];

        // =====================================================================
        // Build list entries
        // =====================================================================
        const productEntries: ListEntry[] = productPrices.map((product) => ({
            rowKey: `product-${product.id}`,
            product: product as ProductWithPrices,
            amount: listItemAmounts.get(product.id) ?? null,
        }));

        const groupEntries: ListEntry[] = [];
        const groupEntriesWithoutShop: ListEntry[] = [];

        for (const group of groupsWithProducts) {
            const allProductsUnfiltered = group.products.filter(
                (p) => p.deleted !== true
            );
            const ignoredProductIds = new Set(ignoredByGroup[group.id] ?? []);

            const result = buildGroupEntry(
                group,
                allProductsUnfiltered,
                ignoredProductIds,
                selectedShopIds,
                selectedShopIdSet,
                compareMode
            );

            if (!result) continue;

            // Set amount from group item
            result.entry.amount = groupItemAmounts.get(group.id) ?? null;

            if (result.hasShop) {
                groupEntries.push(result.entry);
            } else {
                groupEntriesWithoutShop.push(result.entry);
            }
        }

        const entriesWithShop = [
            ...productEntries.filter((e) => e.product.shopCurrentPrices.length > 0),
            ...groupEntries,
        ];
        const entriesWithoutShop = [
            ...productEntries.filter((e) => e.product.shopCurrentPrices.length === 0),
            ...groupEntriesWithoutShop,
        ];

        const totalProducts = entriesWithShop.length + entriesWithoutShop.length;
        const totalPrice = calculateTotalPrice(entriesWithShop);
        const shopsGrouped = groupEntriesByShop(entriesWithShop);

        return NextResponse.json({
            selectedShopIds,
            compareMode,
            entriesWithShop,
            entriesWithoutShop,
            totalProducts,
            totalPrice,
            cheapestSingleShopIds,
            cheapestPairShopIds,
            bestValueSingleShopIds,
            bestValuePairShopIds,
            selectedValueScore,
            shopsGrouped,
        } satisfies StatsApiResponse);
    } catch (error) {
        console.error("[list/stats] API error:", error);
        return NextResponse.json(
            { error: "Failed to calculate stats" },
            { status: 500 }
        );
    }
}

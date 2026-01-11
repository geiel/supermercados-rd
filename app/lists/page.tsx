
import { CompareModeTabs } from "@/components/compare-mode-tabs";
import { ProductItems } from "@/components/products-items";
import { SelectShops } from "@/components/select-shops";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { db } from "@/db";
import {
    listGroupItems as listGroupItemsTable,
    listItems as listItemsTable,
    groups,
    products,
    productsGroups as productsGroupsTable,
    productsShopsPrices as productsShopsPricesTable,
    shops,
} from "@/db/schema";
import { parseUnit, type ParsedUnit } from "@/lib/unit-utils";
import { getUser } from "@/lib/supabase";
import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type CompareMode = "cheapest" | "value";
type ComparableType = "measure" | "count";

type Props = {
    searchParams: Promise<{
        compare: string | undefined;
    }>;
};

export default async function Page({ searchParams }: Props) {
    const { compare } = await searchParams;
    const user = await getUser();

    if (!user) {
        return <div>Please log in to compare products.</div>;
    }

    const list = await db.query.list.findFirst({
        where: (list, { eq }) => eq(list.userId, user.id),
        with: {
            items: true
        }
    });

    if (!list) {
        return <div>Your comparison list is empty.</div>;
    }

    const listGroupItems = await db.query.listGroupItems.findMany({
        where: (items, { eq }) => eq(items.listId, list.id),
    });

    if (list.items.length === 0 && listGroupItems.length === 0) {
        return <div>Your comparison list is empty.</div>;
    }

    const allShops = await db.query.shops.findMany();
    let selectedShops = list.selectedShops;

    if (selectedShops.length === 0) {
        selectedShops = allShops.map(shop => shop.id.toString());
    }

    const selectedShopIds = selectedShops.map(id => Number(id));
    const selectedShopIdSet = new Set(selectedShopIds);
    const allShopIds = allShops.map((shop) => shop.id);
    const compareMode: CompareMode = compare === "value" ? "value" : "cheapest";

    const groupIds = Array.from(new Set(listGroupItems.map((item) => item.groupId)));
    const groupItemByGroupId = new Map(listGroupItems.map((item) => [item.groupId, item]));

    const listItemRows = list.items.length > 0
        ? await db.execute<{
            productId: number;
            shopId: number;
            price: number | string;
            quantity: number | string;
            unit: string | null;
        }>(sql`
            SELECT
                ${listItemsTable.productId} AS "productId",
                ${products.unit} AS "unit",
                ${productsShopsPricesTable.shopId} AS "shopId",
                ${productsShopsPricesTable.currentPrice} AS "price",
                COALESCE(${listItemsTable.amount}, 1) AS "quantity"
            FROM ${listItemsTable}
            INNER JOIN ${products}
                ON ${products.id} = ${listItemsTable.productId}
            INNER JOIN ${productsShopsPricesTable}
                ON ${productsShopsPricesTable.productId} = ${listItemsTable.productId}
            WHERE ${listItemsTable.listId} = ${list.id}
                AND (${products.deleted} IS NULL OR ${products.deleted} = false)
                AND (${productsShopsPricesTable.hidden} IS NULL OR ${productsShopsPricesTable.hidden} = false)
                AND ${productsShopsPricesTable.currentPrice} IS NOT NULL
        `)
        : [];

    const groupItemRows = listGroupItems.length > 0
        ? await db.execute<{
            groupId: number;
            shopId: number;
            price: number | string;
            quantity: number | string;
        }>(sql`
            SELECT
                ${listGroupItemsTable.groupId} AS "groupId",
                ${productsShopsPricesTable.shopId} AS "shopId",
                MIN(${productsShopsPricesTable.currentPrice}) AS "price",
                COALESCE(${listGroupItemsTable.amount}, 1) AS "quantity"
            FROM ${listGroupItemsTable}
            INNER JOIN ${productsGroupsTable}
                ON ${productsGroupsTable.groupId} = ${listGroupItemsTable.groupId}
            INNER JOIN ${products}
                ON ${products.id} = ${productsGroupsTable.productId}
            INNER JOIN ${productsShopsPricesTable}
                ON ${productsShopsPricesTable.productId} = ${productsGroupsTable.productId}
            WHERE ${listGroupItemsTable.listId} = ${list.id}
                AND (${products.deleted} IS NULL OR ${products.deleted} = false)
                AND (${productsShopsPricesTable.hidden} IS NULL OR ${productsShopsPricesTable.hidden} = false)
                AND ${productsShopsPricesTable.currentPrice} IS NOT NULL
                AND NOT (${productsGroupsTable.productId} = ANY(${listGroupItemsTable.ignoredProducts}::int[]))
            GROUP BY
                ${listGroupItemsTable.groupId},
                ${productsShopsPricesTable.shopId},
                ${listGroupItemsTable.amount}
        `)
        : [];

    type LineItem = {
        quantity: number;
        pricesByShop: Map<number, number>;
    };

    const lineItemsByKey = new Map<string, LineItem>();

    const getQuantity = (raw: number | string) => {
        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    };

    const addLineItemPrice = (
        key: string,
        quantity: number,
        shopIdRaw: number | string,
        priceRaw: number | string,
    ) => {
        const price = Number(priceRaw);
        if (!Number.isFinite(price)) {
            return;
        }

        const shopId = Number(shopIdRaw);
        if (!Number.isFinite(shopId)) {
            return;
        }

        const lineItem = lineItemsByKey.get(key);
        if (!lineItem) {
            lineItemsByKey.set(key, { quantity, pricesByShop: new Map([[shopId, price]]) });
            return;
        }

        const existing = lineItem.pricesByShop.get(shopId);
        if (existing === undefined || price < existing) {
            lineItem.pricesByShop.set(shopId, price);
        }
    };

    for (const row of listItemRows) {
        const quantity = getQuantity(row.quantity);
        addLineItemPrice(`product-${row.productId}`, quantity, row.shopId, row.price);
    }

    for (const row of groupItemRows) {
        const quantity = getQuantity(row.quantity);
        addLineItemPrice(`group-${row.groupId}`, quantity, row.shopId, row.price);
    }

    const lineItems = Array.from(lineItemsByKey.values()).filter(
        (item) => item.pricesByShop.size > 0
    );

    type ShopSelectionScore = {
        shopIds: number[];
        total: number;
        missingCount: number;
    };

    const computeSelectionStats = (shopIds: number[], items: LineItem[]) => {
        if (items.length === 0 || shopIds.length === 0) {
            return null;
        }

        let total = 0;
        let missingCount = 0;

        for (const item of items) {
            let bestPrice: number | null = null;

            for (const shopId of shopIds) {
                const price = item.pricesByShop.get(shopId);
                if (price === undefined) {
                    continue;
                }

                if (bestPrice === null || price < bestPrice) {
                    bestPrice = price;
                }
            }

            if (bestPrice === null) {
                missingCount += 1;
                continue;
            }

            total += bestPrice * item.quantity;
        }

        return { shopIds, total, missingCount };
    };

    const buildSingleSelectionStats = (shopIds: number[], items: LineItem[]) => {
        return shopIds
            .map((shopId) => computeSelectionStats([shopId], items))
            .filter((selection): selection is ShopSelectionScore => Boolean(selection));
    };

    const buildPairSelectionStats = (shopIds: number[], items: LineItem[]) => {
        if (shopIds.length < 2) {
            return [];
        }

        const selections: ShopSelectionScore[] = [];
        for (let i = 0; i < shopIds.length; i += 1) {
            for (let j = i + 1; j < shopIds.length; j += 1) {
                const selection = computeSelectionStats([shopIds[i], shopIds[j]], items);
                if (selection) {
                    selections.push(selection);
                }
            }
        }

        return selections;
    };

    const pickBestSelection = (selections: ShopSelectionScore[]) => {
        let best: ShopSelectionScore | null = null;

        for (const selection of selections) {
            if (
                !best ||
                selection.missingCount < best.missingCount ||
                (selection.missingCount === best.missingCount && selection.total < best.total)
            ) {
                best = selection;
            }
        }

        return best;
    };

    const computeValueScore = (
        selection: ShopSelectionScore | null,
        totalItems: number,
        totalShopCount: number,
    ) => {
        if (!selection || totalItems === 0) {
            return null;
        }

        if (selection.missingCount >= totalItems || totalShopCount === 0) {
            return 0;
        }

        const coveredItems = totalItems - selection.missingCount;
        if (coveredItems <= 0) {
            return 0;
        }

        const averagePrice = selection.total / coveredItems;
        if (!Number.isFinite(averagePrice) || averagePrice <= 0) {
            return 0;
        }

        const coverageRatio = coveredItems / totalItems;
        const shopCountFactor = selection.shopIds.length / totalShopCount;
        const scale = 1000;

        return (coverageRatio * shopCountFactor * scale) / averagePrice;
    };

    const cheapestSingleSelections = buildSingleSelectionStats(allShopIds, lineItems);
    const cheapestPairSelections = buildPairSelectionStats(allShopIds, lineItems);

    const bestSingleShop = pickBestSelection(cheapestSingleSelections);
    const bestPairShops = pickBestSelection(cheapestPairSelections);

    const cheapestSingleShopIds = bestSingleShop ? bestSingleShop.shopIds : [];
    const cheapestPairShopIds = bestPairShops ? bestPairShops.shopIds : [];

    const productPrices = list.items.length > 0
        ? await db.query.products.findMany({
            where: (products, { inArray, and, or, isNull, eq }) =>
                and(
                    inArray(products.id, list.items.map(i => i.productId)),
                    or(isNull(products.deleted), eq(products.deleted, false))
                ),
            with: {
                shopCurrentPrices: {
                    where: (scp, { eq, or, and, inArray, isNull }) => and(or(eq(scp.hidden, false), isNull(scp.hidden)), inArray(scp.shopId, selectedShopIds)),
                    with: {
                        shop: true,
                    },
                    orderBy: (prices, { asc }) => [asc(prices.currentPrice)]
                }
            }
        })
        : [];

    type ProductWithPrices = (typeof productPrices)[number];
    type GroupProductRow = {
        groupId: number;
        groupName: string;
        groupCompareBy: string | null;
        productId: number;
        productCategoryId: number;
        productName: string;
        productImage: string | null;
        productUnit: string;
        productBrandId: number;
        productDeleted: boolean | null;
        productRank: string | null;
        productRelevance: string | null;
        productPossibleBrandId: number | null;
        productBaseUnit: string | null;
        productBaseUnitAmount: string | null;
        shopId: number | null;
        priceUrl: string | null;
        priceApi: string | null;
        currentPrice: string | null;
        regularPrice: string | null;
        updateAt: Date | null;
        hidden: boolean | null;
        shopName: string | null;
        shopLogo: string | null;
    };

    type GroupWithProducts = {
        id: number;
        name: string;
        compareBy: string | null;
        products: Array<{ product: ProductWithPrices | null }>;
    };

    const groupProductRows: GroupProductRow[] = groupIds.length > 0
        ? await db
            .select({
                groupId: groups.id,
                groupName: groups.name,
                groupCompareBy: groups.compareBy,
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

    const groupsWithProducts: GroupWithProducts[] = (() => {
        if (groupProductRows.length === 0) {
            return [];
        }

        const groupsMap = new Map<number, GroupWithProducts>();
        const productsMapByGroup = new Map<number, Map<number, ProductWithPrices>>();

        for (const row of groupProductRows) {
            let group = groupsMap.get(row.groupId);
            if (!group) {
                group = {
                    id: row.groupId,
                    name: row.groupName,
                    compareBy: row.groupCompareBy ?? null,
                    products: [],
                };
                groupsMap.set(row.groupId, group);
                productsMapByGroup.set(row.groupId, new Map());
            }

            const productsMap = productsMapByGroup.get(row.groupId);
            if (!productsMap) {
                continue;
            }

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
                } as ProductWithPrices;
                productsMap.set(row.productId, product);
                group.products.push({ product });
            }

            if (!row.shopId) {
                continue;
            }

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

    type GroupAlternative = {
        product: ProductWithPrices;
        price: number;
        shopName: string;
        shopId: number;
        isCurrent: boolean;
    };
    type GroupInfo = {
        id: number;
        name: string;
        alternatives: GroupAlternative[];
        ignoredProducts: ProductWithPrices[];
        listItemId?: number;
    };
    type ListEntry = {
        rowKey: string;
        product: ProductWithPrices;
        amount: number | null;
        listItem?: (typeof list.items)[number];
        comparisonLabel?: string | null;
        group?: GroupInfo;
    };

    type GroupPick = {
        product: ProductWithPrices;
        price: number;
        shopPrice: ProductWithPrices["shopCurrentPrices"][number];
        unitPrice?: number;
        measurement?: ParsedUnit["measurement"];
    };

    type GroupPickResult = {
        bestPick: GroupPick | null;
        shopPicks: GroupPick[];
        comparisonLabel: string | null;
        comparisonMode: CompareMode;
    };

    const getUnitPrice = (price: number, parsed: ParsedUnit) => {
        if (!Number.isFinite(price) || price <= 0) {
            return null;
        }

        if (!Number.isFinite(parsed.base) || parsed.base <= 0) {
            return null;
        }

        const unitPrice =
            parsed.measurement === "count"
                ? price / parsed.base
                : (price / parsed.base) * 100;

        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            return null;
        }

        return unitPrice;
    };

    const getValuePrice = (price: number, unit: string | null) => {
        const parsed = unit ? parseUnit(unit) : null;
        const unitPrice = parsed ? getUnitPrice(price, parsed) : null;
        return unitPrice ?? price;
    };

    const ignoredProductsByGroupId = new Map<number, Set<number>>();

    for (const groupItem of listGroupItems) {
        const ignored = (groupItem.ignoredProducts ?? [])
            .map((productId) => Number(productId))
            .filter(Number.isFinite);

        if (ignored.length > 0) {
            ignoredProductsByGroupId.set(groupItem.groupId, new Set(ignored));
        }
    }

    const valueLineItemsByKey = new Map<string, LineItem>();

    const addValueLineItem = (
        key: string,
        quantity: number,
        shopIdRaw: number | string,
        valueRaw: number
    ) => {
        const value = Number(valueRaw);
        if (!Number.isFinite(value)) {
            return;
        }

        const shopId = Number(shopIdRaw);
        if (!Number.isFinite(shopId)) {
            return;
        }

        const lineItem = valueLineItemsByKey.get(key);
        if (!lineItem) {
            valueLineItemsByKey.set(key, {
                quantity,
                pricesByShop: new Map([[shopId, value]])
            });
            return;
        }

        const existing = lineItem.pricesByShop.get(shopId);
        if (existing === undefined || value < existing) {
            lineItem.pricesByShop.set(shopId, value);
        }
    };

    for (const row of listItemRows) {
        const quantity = getQuantity(row.quantity);
        const price = Number(row.price);
        if (!Number.isFinite(price)) {
            continue;
        }

        const valuePrice = getValuePrice(price, row.unit);
        addValueLineItem(`product-${row.productId}`, quantity, row.shopId, valuePrice);
    }

    const groupQuantityById = new Map<number, number>();
    for (const groupItem of listGroupItems) {
        groupQuantityById.set(groupItem.groupId, getQuantity(groupItem.amount ?? 1));
    }

    for (const row of groupProductRows) {
        if (!row.shopId || row.currentPrice === null) {
            continue;
        }

        const ignoredProducts = ignoredProductsByGroupId.get(row.groupId);
        if (ignoredProducts && ignoredProducts.has(row.productId)) {
            continue;
        }

        const price = Number(row.currentPrice);
        if (!Number.isFinite(price)) {
            continue;
        }

        const quantity = groupQuantityById.get(row.groupId);
        if (!quantity) {
            continue;
        }

        const valuePrice = getValuePrice(price, row.productUnit);
        addValueLineItem(`group-${row.groupId}`, quantity, row.shopId, valuePrice);
    }

    const valueLineItems = Array.from(valueLineItemsByKey.values()).filter(
        (item) => item.pricesByShop.size > 0
    );

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

    const getCheapestComparisonLabel = (
        bestPick: GroupPick | null,
        shopPicks: GroupPick[],
    ) => {
        if (!bestPick) {
            return null;
        }

        const otherPicks = shopPicks.filter(
            (pick) => pick.shopPrice.shopId !== bestPick.shopPrice.shopId
        );

        if (otherPicks.length === 0) {
            return null;
        }

        let mostExpensivePick = otherPicks[0];

        for (const pick of otherPicks.slice(1)) {
            if (pick.price > mostExpensivePick.price) {
                mostExpensivePick = pick;
            }
        }

        const difference = mostExpensivePick.price - bestPick.price;

        if (difference > 0) {
            return `RD$${difference.toFixed(2)} mas barato que ${mostExpensivePick.shopPrice.shop.name}`;
        }

        if (difference === 0) {
            return `Mismo precio que ${mostExpensivePick.shopPrice.shop.name}`;
        }

        return null;
    };

    const getValueComparisonLabel = (
        bestPick: GroupPick | null,
        shopPicks: GroupPick[],
        unitLabel: string,
    ) => {
        if (!bestPick || bestPick.unitPrice === undefined) {
            return null;
        }

        const otherPicks = shopPicks.filter(
            (pick) => pick.shopPrice.shopId !== bestPick.shopPrice.shopId
        );

        if (otherPicks.length === 0) {
            return null;
        }

        let mostExpensivePick = otherPicks[0];

        for (const pick of otherPicks.slice(1)) {
            if ((pick.unitPrice ?? 0) > (mostExpensivePick.unitPrice ?? 0)) {
                mostExpensivePick = pick;
            }
        }

        const difference = (mostExpensivePick.unitPrice ?? 0) - bestPick.unitPrice;

        if (difference > 0) {
            return `RD$${difference.toFixed(2)} por ${unitLabel} mas barato que ${mostExpensivePick.shopPrice.shop.name}`;
        }

        if (difference === 0) {
            return `Mismo valor que ${mostExpensivePick.shopPrice.shop.name}`;
        }

        return null;
    };

    const getCheapestGroupPicks = (
        products: ProductWithPrices[],
        shopIds: number[],
    ): GroupPickResult => {
        let bestPick: GroupPick | null = null;
        const shopPicks: GroupPick[] = [];

        for (const shopId of shopIds) {
            let cheapestForShop: GroupPick | null = null;

            for (const product of products) {
                const shopPrice = product.shopCurrentPrices.find((price) => price.shopId === shopId);

                if (!shopPrice?.currentPrice) {
                    continue;
                }

                const numericPrice = Number(shopPrice.currentPrice);
                if (!Number.isFinite(numericPrice)) {
                    continue;
                }

                if (!cheapestForShop || numericPrice < cheapestForShop.price) {
                    cheapestForShop = { product, price: numericPrice, shopPrice };
                }
            }

            if (cheapestForShop) {
                shopPicks.push(cheapestForShop);
            }

            if (cheapestForShop && (!bestPick || cheapestForShop.price < bestPick.price)) {
                bestPick = cheapestForShop;
            }
        }

        return {
            bestPick,
            shopPicks,
            comparisonLabel: getCheapestComparisonLabel(bestPick, shopPicks),
            comparisonMode: "cheapest",
        };
    };

    const getBestValueGroupPicks = (
        products: ProductWithPrices[],
        shopIds: number[],
        compareBy?: string | null,
    ): GroupPickResult | null => {
        if (shopIds.length === 0) {
            return null;
        }

        type ProductInfo = {
            product: ProductWithPrices;
            parsed: ParsedUnit;
            comparisonType: ComparableType;
        };

        const productInfos: ProductInfo[] = products
            .map((product) => {
                const parsed = parseUnit(product.unit);
                if (!parsed) {
                    return null;
                }

                const comparisonType: ComparableType =
                    parsed.measurement === "count" ? "count" : "measure";

                return { product, parsed, comparisonType };
            })
            .filter((info): info is ProductInfo => Boolean(info));

        if (productInfos.length === 0) {
            return null;
        }

        const buildCoverage = (infos: ProductInfo[]) => {
            const coverageByType: Record<ComparableType, Set<number>> = {
                measure: new Set(),
                count: new Set(),
            };
            const countByType: Record<ComparableType, number> = { measure: 0, count: 0 };

            for (const info of infos) {
                countByType[info.comparisonType] += 1;

                for (const shopPrice of info.product.shopCurrentPrices) {
                    const price = Number(shopPrice.currentPrice);
                    if (!Number.isFinite(price)) {
                        continue;
                    }

                    const unitPrice = getUnitPrice(price, info.parsed);
                    if (!unitPrice) {
                        continue;
                    }

                    coverageByType[info.comparisonType].add(shopPrice.shopId);
                }
            }

            return { coverageByType, countByType };
        };

        let effectiveInfos = productInfos;
        let { coverageByType, countByType } = buildCoverage(effectiveInfos);
        let candidateTypes = (["measure", "count"] as const).filter((type) =>
            shopIds.every((shopId) => coverageByType[type].has(shopId))
        );

        if (candidateTypes.length === 0) {
            const wantsCount =
                typeof compareBy === "string" && compareBy.toLowerCase() === "count";

            if (wantsCount && countByType.count > countByType.measure) {
                const forcedCountInfos: ProductInfo[] = effectiveInfos.map((info) => {
                    if (info.comparisonType === "count") {
                        return info;
                    }

                    const forcedParsed: ParsedUnit = {
                        measurement: "count",
                        base: 1,
                        display: "1 UND",
                        amount: 1,
                        normalizedUnit: "UND",
                    };

                    return {
                        ...info,
                        comparisonType: "count",
                        parsed: forcedParsed,
                    };
                });

                const rebuilt = buildCoverage(forcedCountInfos);
                const forcedCandidateTypes = (["measure", "count"] as const).filter((type) =>
                    shopIds.every((shopId) => rebuilt.coverageByType[type].has(shopId))
                );

                if (forcedCandidateTypes.length === 0) {
                    return null;
                }

                effectiveInfos = forcedCountInfos;
                coverageByType = rebuilt.coverageByType;
                countByType = rebuilt.countByType;
                candidateTypes = forcedCandidateTypes;
            } else {
                return null;
            }
        }

        const selectedType = candidateTypes.reduce((best, type) => {
            if ((countByType[type] ?? 0) > (countByType[best] ?? 0)) {
                return type;
            }

            return best;
        }, candidateTypes[0]);

        const candidates = effectiveInfos.filter((info) => info.comparisonType === selectedType);
        const hasWeight = candidates.some((info) => info.parsed.measurement === "weight");
        const hasVolume = candidates.some((info) => info.parsed.measurement === "volume");
        const unitLabel =
            selectedType === "count"
                ? "UND"
                : hasWeight && hasVolume
                    ? "100 GR/ML"
                    : hasWeight
                        ? "100 GR"
                        : "100 ML";

        let bestPick: GroupPick | null = null;
        const shopPicks: GroupPick[] = [];

        for (const shopId of shopIds) {
            let bestForShop: GroupPick | null = null;

            for (const info of candidates) {
                const shopPrice = info.product.shopCurrentPrices.find(
                    (price) => price.shopId === shopId
                );

                if (!shopPrice?.currentPrice) {
                    continue;
                }

                const numericPrice = Number(shopPrice.currentPrice);
                if (!Number.isFinite(numericPrice)) {
                    continue;
                }

                const unitPrice = getUnitPrice(numericPrice, info.parsed);
                if (!unitPrice) {
                    continue;
                }

                if (
                    !bestForShop ||
                    unitPrice < (bestForShop.unitPrice ?? Number.POSITIVE_INFINITY) ||
                    (unitPrice === bestForShop.unitPrice && numericPrice < bestForShop.price)
                ) {
                    bestForShop = {
                        product: info.product,
                        price: numericPrice,
                        unitPrice,
                        shopPrice,
                        measurement: info.parsed.measurement,
                    };
                }
            }

            if (bestForShop) {
                shopPicks.push(bestForShop);
                if (
                    !bestPick ||
                    (bestForShop.unitPrice ?? Number.POSITIVE_INFINITY) <
                        (bestPick.unitPrice ?? Number.POSITIVE_INFINITY) ||
                    (bestForShop.unitPrice === bestPick.unitPrice && bestForShop.price < bestPick.price)
                ) {
                    bestPick = bestForShop;
                }
            }
        }

        if (!bestPick || shopPicks.length !== shopIds.length) {
            return null;
        }

        return {
            bestPick,
            shopPicks,
            comparisonLabel: getValueComparisonLabel(bestPick, shopPicks, unitLabel),
            comparisonMode: "value",
        };
    };

    const listItemByProductId = new Map(list.items.map((item) => [item.productId, item]));
    const productEntries: ListEntry[] = productPrices.map((product) => ({
        rowKey: `product-${product.id}`,
        product,
        amount: listItemByProductId.get(product.id)?.amount ?? null,
        listItem: listItemByProductId.get(product.id),
    }));

    const groupEntries: ListEntry[] = [];
    const groupEntriesWithoutShop: ListEntry[] = [];

    for (const group of groupsWithProducts) {
        const listGroupItem = groupItemByGroupId.get(group.id);
        const amount = listGroupItem?.amount ?? null;
        const ignoredProductIds = new Set(
            (listGroupItem?.ignoredProducts ?? [])
                .map((productId) => Number(productId))
                .filter(Number.isFinite)
        );
        const allProducts = group.products.flatMap((groupProduct) =>
            groupProduct.product && groupProduct.product.deleted !== true
                ? [groupProduct.product]
                : []
        );

        if (allProducts.length === 0) {
            continue;
        }

        const ignoredProducts = ignoredProductIds.size > 0
            ? allProducts.filter((product) => ignoredProductIds.has(product.id))
            : [];
        const products = ignoredProductIds.size > 0
            ? allProducts.filter((product) => !ignoredProductIds.has(product.id))
            : allProducts;
        const fallbackProduct = products[0] ?? allProducts[0];
        const groupInfoBase = {
            id: group.id,
            name: group.name,
            listItemId: listGroupItem?.id,
            ignoredProducts,
        };

        if (products.length === 0) {
            groupEntriesWithoutShop.push({
                rowKey: `group-${group.id}`,
                product: fallbackProduct,
                amount,
                comparisonLabel: null,
                group: {
                    ...groupInfoBase,
                    alternatives: [],
                },
            });
            continue;
        }

        const pickResult =
            compareMode === "value"
                ? getBestValueGroupPicks(products, selectedShopIds, group.compareBy) ??
                  getCheapestGroupPicks(products, selectedShopIds)
                : getCheapestGroupPicks(products, selectedShopIds);

        const { bestPick, shopPicks, comparisonLabel, comparisonMode } = pickResult;

        if (!bestPick) {
            groupEntriesWithoutShop.push({
                rowKey: `group-${group.id}`,
                product: fallbackProduct,
                amount,
                comparisonLabel: null,
                group: {
                    ...groupInfoBase,
                    alternatives: [],
                },
            });
            continue;
        }

        const productForList = {
            ...bestPick.product,
            shopCurrentPrices: [
                bestPick.shopPrice,
                ...bestPick.product.shopCurrentPrices.filter(
                    (price) =>
                        price.shopId !== bestPick.shopPrice.shopId &&
                        selectedShopIdSet.has(price.shopId)
                ),
            ],
        };

        const sortedPicks = [...shopPicks].sort((a, b) => {
            if (comparisonMode === "value" && a.unitPrice !== undefined && b.unitPrice !== undefined) {
                if (a.unitPrice === b.unitPrice) {
                    return a.price - b.price;
                }

                return a.unitPrice - b.unitPrice;
            }

            return a.price - b.price;
        });

        const alternatives = sortedPicks.map((pick) => ({
            product: pick.product,
            price: pick.price,
            shopName: pick.shopPrice.shop.name,
            shopId: pick.shopPrice.shopId,
            isCurrent:
                pick.shopPrice.shopId === bestPick.shopPrice.shopId &&
                pick.product.id === bestPick.product.id,
        }));

        groupEntries.push({
            rowKey: `group-${group.id}`,
            product: productForList,
            amount,
            comparisonLabel,
            group: {
                ...groupInfoBase,
                alternatives,
            },
        });
    }

    const entriesWithShop = [
        ...productEntries.filter((entry) => entry.product.shopCurrentPrices.length > 0),
        ...groupEntries,
    ];
    const entriesWithoutShop = [
        ...productEntries.filter((entry) => entry.product.shopCurrentPrices.length === 0),
        ...groupEntriesWithoutShop,
    ];
    const allEntries = [...entriesWithShop, ...entriesWithoutShop];
    const totalProducts = allEntries.length;
    const totalPrice = entriesWithShop.reduce((acc, entry) => {
        const unitPrice = entry.product.shopCurrentPrices[0]?.currentPrice;
        const quantity = entry.amount && entry.amount > 0 ? entry.amount : 1;
        return acc + (unitPrice ? Number(unitPrice) : 0) * quantity;
    }, 0);

    const groupByShop = Object.groupBy(entriesWithShop, ({ product }) => product.shopCurrentPrices[0].shop.name);
    const shopsGrouped = Object.keys(groupByShop);

    const content = (
        <div className="container mx-auto pb-4 px-2 max-w-4xl">
            <div className="flex flex-1 flex-col">
                <div className="flex justify-between">
                    <div className="font-bold text-2xl">Lista</div>
                    <div>
                        <SelectShops
                            shops={allShops}
                            listId={list.id}
                            initialSelectedShops={list.selectedShops.map(s => (Number(s)))}
                            cheapestSingleShopIds={cheapestSingleShopIds}
                            cheapestPairShopIds={cheapestPairShopIds}
                            bestValueSingleShopIds={bestValueSingleShopIds}
                            bestValuePairShopIds={bestValuePairShopIds}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <CompareModeTabs mode={compareMode} />
                    <div className="flex flex-wrap items-center gap-3">
                        <div>
                            Total <span className="font-bold">RD${totalPrice.toFixed(2)}</span>
                        </div>

                        <div>
                            Productos <span className="font-bold">{totalProducts}</span>
                        </div>

                        {compareMode === "value" && selectedValueScore !== null ? (
                            <div className="flex items-center">
                                <div>
                                    Índice de eficiencia{" "}
                                    <span className="font-bold">{selectedValueScore.toFixed(1)}</span>
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label="Cómo funciona el índice de eficiencia"
                                        >
                                            <Info className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="text-sm">
                                        Más alto = mejor valor. <br /> Explora cómo funciona.{" "}
                                        <Link href="/value-score" className="underline">
                                            Leer más
                                        </Link>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        ) : null}
                    </div>
                </div>
                {shopsGrouped.map(shop => {
                    const items = groupByShop[shop];

                    if (!items) {
                        return null;
                    }

                    const totalPrice = items.reduce((acc, entry) => {
                        const unitPrice = entry.product.shopCurrentPrices[0].currentPrice;
                        const quantity = entry.amount && entry.amount > 0 ? entry.amount : 1;
                        return acc + (unitPrice ? Number(unitPrice) : 0) * quantity;
                    }, 0);

                    return (
                        <section key={shop}>
                            <div className="py-4 flex justify-between items-center">
                                <div>
                                    <Image
                                        src={`/supermarket-logo/${items[0].product.shopCurrentPrices[0].shop.logo}`}
                                        width={0}
                                        height={0}
                                        className="w-[50px] h-auto"
                                        alt="Supermarket logo"
                                        unoptimized
                                    />
                                </div>

                                <div className="font-bold">
                                    RD${totalPrice.toFixed(2)}
                                </div>
                            </div>
                            <ProductItems items={items} />
                        </section>
                    )
                })}
                {entriesWithoutShop.length > 0 ? (
                    <section>
                        <div>No disponible en las tiendas seleccionadas</div>
                        <ProductItems items={entriesWithoutShop} />
                    </section>
                ) : null}
            </div>
        </div>
    );

    return content;
}

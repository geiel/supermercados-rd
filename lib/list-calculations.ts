import { parseUnit, type ParsedUnit } from "@/lib/unit-utils";

// ============================================================================
// Types
// ============================================================================

export type CompareMode = "cheapest" | "value";
export type ComparableType = "measure" | "count";

export type LineItem = {
    quantity: number;
    pricesByShop: Map<number, number>;
};

export type ShopSelectionScore = {
    shopIds: number[];
    total: number;
    missingCount: number;
};

export type ShopPrice = {
    productId: number;
    shopId: number;
    url?: string;
    api?: string | null;
    currentPrice: string | null;
    regularPrice?: string | null;
    updateAt?: Date | null;
    hidden?: boolean | null;
    shop: { id: number; name: string; logo: string };
};

export type ProductWithPrices = {
    id: number;
    categoryId: number;
    name: string;
    image: string | null;
    unit: string;
    brandId: number;
    deleted: boolean | null;
    rank: string | null;
    relevance: string | null;
    possibleBrandId: number | null;
    baseUnit: string | null;
    baseUnitAmount: string | null;
    shopCurrentPrices: ShopPrice[];
};

export type GroupPick = {
    product: ProductWithPrices;
    price: number;
    shopPrice: ShopPrice;
    unitPrice?: number;
    measurement?: ParsedUnit["measurement"];
};

export type GroupPickResult = {
    bestPick: GroupPick | null;
    shopPicks: GroupPick[];
    comparisonLabel: string | null;
    comparisonMode: CompareMode;
};

export type GroupAlternative = {
    product: ProductWithPrices;
    price: number;
    shopName: string;
    shopId: number;
    isCurrent: boolean;
};

export type GroupInfo = {
    id: number;
    name: string;
    alternatives: GroupAlternative[];
    ignoredProducts: ProductWithPrices[];
    listItemId?: number;
};

export type ListEntry = {
    rowKey: string;
    product: ProductWithPrices;
    amount: number | null;
    comparisonLabel?: string | null;
    group?: GroupInfo;
};

export type Shop = {
    id: number;
    name: string;
    logo: string;
};

export type ListApiResponse = {
    allShops: Shop[];
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

// ============================================================================
// Shop Selection Statistics
// ============================================================================

/**
 * Compute statistics for a given shop selection across line items.
 * Returns total price and count of missing items.
 */
export function computeSelectionStats(
    shopIds: number[],
    items: LineItem[]
): ShopSelectionScore | null {
    if (items.length === 0 || shopIds.length === 0) {
        return null;
    }

    let total = 0;
    let missingCount = 0;

    for (const item of items) {
        let bestPrice: number | null = null;

        for (const shopId of shopIds) {
            const price = item.pricesByShop.get(shopId);
            if (price === undefined) continue;
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
}

/**
 * Build selection stats for each individual shop.
 */
export function buildSingleSelectionStats(
    shopIds: number[],
    items: LineItem[]
): ShopSelectionScore[] {
    return shopIds
        .map((shopId) => computeSelectionStats([shopId], items))
        .filter((s): s is ShopSelectionScore => Boolean(s));
}

/**
 * Build selection stats for each pair of shops.
 */
export function buildPairSelectionStats(
    shopIds: number[],
    items: LineItem[]
): ShopSelectionScore[] {
    if (shopIds.length < 2) return [];

    const selections: ShopSelectionScore[] = [];
    for (let i = 0; i < shopIds.length; i++) {
        for (let j = i + 1; j < shopIds.length; j++) {
            const selection = computeSelectionStats([shopIds[i], shopIds[j]], items);
            if (selection) selections.push(selection);
        }
    }
    return selections;
}

/**
 * Pick the best selection from a list of selections.
 * Prefers fewer missing items, then lower total price.
 */
export function pickBestSelection(
    selections: ShopSelectionScore[]
): ShopSelectionScore | null {
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
}

/**
 * Compute value score for a shop selection.
 * Higher score = better value (more coverage, fewer shops, lower prices).
 */
export function computeValueScore(
    selection: ShopSelectionScore | null,
    totalItems: number,
    totalShopCount: number
): number | null {
    if (!selection || totalItems === 0) return null;
    if (selection.missingCount >= totalItems || totalShopCount === 0) return 0;

    const coveredItems = totalItems - selection.missingCount;
    if (coveredItems <= 0) return 0;

    const averagePrice = selection.total / coveredItems;
    if (!Number.isFinite(averagePrice) || averagePrice <= 0) return 0;

    const coverageRatio = coveredItems / totalItems;
    const shopCountFactor = selection.shopIds.length / totalShopCount;
    const scale = 1000;

    return (coverageRatio * shopCountFactor * scale) / averagePrice;
}

// ============================================================================
// Price Calculation Utilities
// ============================================================================

/**
 * Calculate unit price from price and parsed unit.
 * Returns price per 100g/100ml for weight/volume, or price per unit for count.
 */
export function getUnitPrice(price: number, parsed: ParsedUnit): number | null {
    if (!Number.isFinite(price) || price <= 0) return null;
    if (!Number.isFinite(parsed.base) || parsed.base <= 0) return null;

    const unitPrice =
        parsed.measurement === "count"
            ? price / parsed.base
            : (price / parsed.base) * 100;

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
    return unitPrice;
}

/**
 * Get value price for a product (unit price if parseable, otherwise raw price).
 */
export function getValuePrice(price: number, unit: string | null): number {
    const parsed = unit ? parseUnit(unit) : null;
    const unitPrice = parsed ? getUnitPrice(price, parsed) : null;
    return unitPrice ?? price;
}

// ============================================================================
// Comparison Labels
// ============================================================================

/**
 * Generate comparison label for cheapest mode.
 */
export function getCheapestComparisonLabel(
    bestPick: GroupPick | null,
    shopPicks: GroupPick[]
): string | null {
    if (!bestPick) return null;

    const otherPicks = shopPicks.filter(
        (pick) => pick.shopPrice.shopId !== bestPick.shopPrice.shopId
    );
    if (otherPicks.length === 0) return null;

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
}

/**
 * Generate comparison label for value mode.
 */
export function getValueComparisonLabel(
    bestPick: GroupPick | null,
    shopPicks: GroupPick[],
    unitLabel: string
): string | null {
    if (!bestPick || bestPick.unitPrice === undefined) return null;

    const otherPicks = shopPicks.filter(
        (pick) => pick.shopPrice.shopId !== bestPick.shopPrice.shopId
    );
    if (otherPicks.length === 0) return null;

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
}

// ============================================================================
// Group Picking Functions
// ============================================================================

/**
 * Get the cheapest product picks for each shop in a group.
 */
export function getCheapestGroupPicks(
    products: ProductWithPrices[],
    shopIds: number[]
): GroupPickResult {
    let bestPick: GroupPick | null = null;
    const shopPicks: GroupPick[] = [];

    for (const shopId of shopIds) {
        let cheapestForShop: GroupPick | null = null;

        for (const product of products) {
            const shopPrice = product.shopCurrentPrices.find(
                (price) => price.shopId === shopId
            );

            if (!shopPrice?.currentPrice) continue;

            const numericPrice = Number(shopPrice.currentPrice);
            if (!Number.isFinite(numericPrice)) continue;

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
}

/**
 * Get the best value (lowest unit price) product picks for each shop in a group.
 */
export function getBestValueGroupPicks(
    products: ProductWithPrices[],
    shopIds: number[],
    compareBy?: string | null
): GroupPickResult | null {
    if (shopIds.length === 0) return null;

    type ProductInfo = {
        product: ProductWithPrices;
        parsed: ParsedUnit;
        comparisonType: ComparableType;
    };

    const productInfos: ProductInfo[] = products
        .map((product) => {
            const parsed = parseUnit(product.unit);
            if (!parsed) return null;
            const comparisonType: ComparableType =
                parsed.measurement === "count" ? "count" : "measure";
            return { product, parsed, comparisonType };
        })
        .filter((info): info is ProductInfo => Boolean(info));

    if (productInfos.length === 0) return null;

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
                if (!Number.isFinite(price)) continue;
                const unitPrice = getUnitPrice(price, info.parsed);
                if (!unitPrice) continue;
                coverageByType[info.comparisonType].add(shopPrice.shopId);
            }
        }

        return { coverageByType, countByType };
    };

    let effectiveInfos = productInfos;
    let { coverageByType, countByType } = buildCoverage(effectiveInfos);

    // For value comparison to be meaningful, we need at least 2 shops with coverage
    // (or at least 1 if only 1 shop is selected)
    const minCoverageRequired = Math.min(2, shopIds.length);
    let candidateTypes = (["measure", "count"] as const).filter((type) =>
        shopIds.filter((shopId) => coverageByType[type].has(shopId)).length >= minCoverageRequired
    );

    if (candidateTypes.length === 0) {
        const wantsCount =
            typeof compareBy === "string" && compareBy.toLowerCase() === "count";

        if (wantsCount && countByType.count > countByType.measure) {
            const forcedCountInfos: ProductInfo[] = effectiveInfos.map((info) => {
                if (info.comparisonType === "count") return info;

                const forcedParsed: ParsedUnit = {
                    measurement: "count",
                    base: 1,
                    display: "1 UND",
                    amount: 1,
                    normalizedUnit: "UND",
                };

                return { ...info, comparisonType: "count", parsed: forcedParsed };
            });

            const rebuilt = buildCoverage(forcedCountInfos);
            const forcedCandidateTypes = (["measure", "count"] as const).filter(
                (type) => shopIds.filter((shopId) => rebuilt.coverageByType[type].has(shopId)).length >= minCoverageRequired
            );

            if (forcedCandidateTypes.length === 0) return null;

            effectiveInfos = forcedCountInfos;
            coverageByType = rebuilt.coverageByType;
            countByType = rebuilt.countByType;
            candidateTypes = forcedCandidateTypes;
        } else {
            return null;
        }
    }

    const selectedType = candidateTypes.reduce(
        (best, type) =>
            (countByType[type] ?? 0) > (countByType[best] ?? 0) ? type : best,
        candidateTypes[0]
    );

    const candidates = effectiveInfos.filter(
        (info) => info.comparisonType === selectedType
    );

    const hasWeight = candidates.some((info) => info.parsed.measurement === "weight");
    const hasVolume = candidates.some((info) => info.parsed.measurement === "volume");
    const hasLength = candidates.some((info) => info.parsed.measurement === "length");

    const unitLabel = (() => {
        if (selectedType === "count") return "UND";
        if (hasWeight && hasVolume && hasLength) return "100 GR/ML/M";
        if (hasWeight && hasVolume) return "100 GR/ML";
        if (hasWeight && hasLength) return "100 GR/M";
        if (hasVolume && hasLength) return "100 ML/M";
        if (hasWeight) return "100 GR";
        if (hasVolume) return "100 ML";
        if (hasLength) return "M";
        return "UND";
    })();

    let bestPick: GroupPick | null = null;
    const shopPicks: GroupPick[] = [];

    for (const shopId of shopIds) {
        let bestForShop: GroupPick | null = null;

        for (const info of candidates) {
            const shopPrice = info.product.shopCurrentPrices.find(
                (price) => price.shopId === shopId
            );

            if (!shopPrice?.currentPrice) continue;

            const numericPrice = Number(shopPrice.currentPrice);
            if (!Number.isFinite(numericPrice)) continue;

            const unitPrice = getUnitPrice(numericPrice, info.parsed);
            if (!unitPrice) continue;

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
                (bestForShop.unitPrice === bestPick.unitPrice &&
                    bestForShop.price < bestPick.price)
            ) {
                bestPick = bestForShop;
            }
        }
    }

    // For value comparison to work, we need at least 2 shops with valid picks
    // (or at least 1 if only 1 shop is selected) to make a meaningful comparison
    const minPicksRequired = Math.min(2, shopIds.length);
    if (!bestPick || shopPicks.length < minPicksRequired) return null;

    return {
        bestPick,
        shopPicks,
        comparisonLabel: getValueComparisonLabel(bestPick, shopPicks, unitLabel),
        comparisonMode: "value",
    };
}

// ============================================================================
// Line Item Building
// ============================================================================

/**
 * Add a price entry to the line items map for cheapest calculations.
 */
export function addLineItemPrice(
    lineItemsByKey: Map<string, LineItem>,
    key: string,
    quantity: number,
    shopIdRaw: number | string,
    priceRaw: number | string
): void {
    const price = Number(priceRaw);
    if (!Number.isFinite(price)) return;

    const shopId = Number(shopIdRaw);
    if (!Number.isFinite(shopId)) return;

    const lineItem = lineItemsByKey.get(key);
    if (!lineItem) {
        lineItemsByKey.set(key, {
            quantity,
            pricesByShop: new Map([[shopId, price]]),
        });
        return;
    }

    const existing = lineItem.pricesByShop.get(shopId);
    if (existing === undefined || price < existing) {
        lineItem.pricesByShop.set(shopId, price);
    }
}

/**
 * Add a value price entry to the line items map for value calculations.
 */
export function addValueLineItem(
    valueLineItemsByKey: Map<string, LineItem>,
    key: string,
    quantity: number,
    shopIdRaw: number | string,
    valueRaw: number
): void {
    const value = Number(valueRaw);
    if (!Number.isFinite(value)) return;

    const shopId = Number(shopIdRaw);
    if (!Number.isFinite(shopId)) return;

    const lineItem = valueLineItemsByKey.get(key);
    if (!lineItem) {
        valueLineItemsByKey.set(key, {
            quantity,
            pricesByShop: new Map([[shopId, value]]),
        });
        return;
    }

    const existing = lineItem.pricesByShop.get(shopId);
    if (existing === undefined || value < existing) {
        lineItem.pricesByShop.set(shopId, value);
    }
}

// ============================================================================
// Entry Building Utilities
// ============================================================================

/**
 * Build list entry for a group with the best product pick.
 */
export function buildGroupEntry(
    group: { id: number; name: string; compareBy: string | null },
    allProductsUnfiltered: ProductWithPrices[],
    ignoredProductIds: Set<number>,
    selectedShopIds: number[],
    selectedShopIdSet: Set<number>,
    compareMode: CompareMode,
    listItemId?: number
): { entry: ListEntry; hasShop: boolean } | null {
    if (allProductsUnfiltered.length === 0) return null;

    // Separate ignored and non-ignored products
    const ignoredProducts = allProductsUnfiltered.filter((p) =>
        ignoredProductIds.has(p.id)
    );
    const allProducts = allProductsUnfiltered.filter(
        (p) => !ignoredProductIds.has(p.id)
    );

    const fallbackProduct = allProducts[0] ?? allProductsUnfiltered[0];
    const groupInfoBase: GroupInfo = {
        id: group.id,
        name: group.name,
        ignoredProducts,
        listItemId,
        alternatives: [],
    };

    // If all products are ignored, use unfiltered for picking
    const productsForPicking =
        allProducts.length > 0 ? allProducts : allProductsUnfiltered;

    const pickResult =
        compareMode === "value"
            ? getBestValueGroupPicks(productsForPicking, selectedShopIds, group.compareBy) ??
              getCheapestGroupPicks(productsForPicking, selectedShopIds)
            : getCheapestGroupPicks(productsForPicking, selectedShopIds);

    const { bestPick, shopPicks, comparisonLabel, comparisonMode: pickMode } = pickResult;

    if (!bestPick) {
        return {
            entry: {
                rowKey: `group-${group.id}`,
                product: fallbackProduct,
                amount: null,
                comparisonLabel: null,
                group: groupInfoBase,
            },
            hasShop: false,
        };
    }

    const productForList: ProductWithPrices = {
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
        if (
            pickMode === "value" &&
            a.unitPrice !== undefined &&
            b.unitPrice !== undefined
        ) {
            if (a.unitPrice === b.unitPrice) return a.price - b.price;
            return a.unitPrice - b.unitPrice;
        }
        return a.price - b.price;
    });

    const alternatives: GroupAlternative[] = sortedPicks.map((pick) => ({
        product: pick.product,
        price: pick.price,
        shopName: pick.shopPrice.shop.name,
        shopId: pick.shopPrice.shopId,
        isCurrent:
            pick.shopPrice.shopId === bestPick.shopPrice.shopId &&
            pick.product.id === bestPick.product.id,
    }));

    return {
        entry: {
            rowKey: `group-${group.id}`,
            product: productForList,
            amount: null,
            comparisonLabel,
            group: { ...groupInfoBase, alternatives },
        },
        hasShop: true,
    };
}

/**
 * Calculate total price from entries.
 */
export function calculateTotalPrice(entries: ListEntry[]): number {
    return entries.reduce((acc, entry) => {
        const unitPrice = entry.product.shopCurrentPrices[0]?.currentPrice;
        const quantity = entry.amount && entry.amount > 0 ? entry.amount : 1;
        return acc + (unitPrice ? Number(unitPrice) : 0) * quantity;
    }, 0);
}

/**
 * Group entries by shop name.
 */
export function groupEntriesByShop(
    entries: ListEntry[]
): Record<string, ListEntry[]> {
    const grouped: Record<string, ListEntry[]> = {};

    for (const entry of entries) {
        const shopName = entry.product.shopCurrentPrices[0]?.shop.name;
        if (!shopName) continue;
        if (!grouped[shopName]) grouped[shopName] = [];
        grouped[shopName].push(entry);
    }

    return grouped;
}

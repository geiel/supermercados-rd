
import { ProductItems } from "@/components/products-items";
import { SelectShops } from "@/components/select-shops";
import { db } from "@/db";
import { getUser } from "@/lib/supabase";
import Image from "next/image";

export default async function Page() {
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
    const allShopIds = allShops.map((shop) => shop.id);

    const groupIds = Array.from(new Set(listGroupItems.map((item) => item.groupId)));
    const groupItemByGroupId = new Map(listGroupItems.map((item) => [item.groupId, item]));

    const listProductsAllShops = list.items.length > 0
        ? await db.query.products.findMany({
            where: (products, { inArray }) => inArray(products.id, list.items.map(i => i.productId)),
            with: {
                shopCurrentPrices: {
                    where: (scp, { eq, or, and, isNull }) =>
                        and(or(eq(scp.hidden, false), isNull(scp.hidden))),
                    orderBy: (prices, { asc }) => [asc(prices.currentPrice)],
                }
            }
        })
        : [];

    const groupsWithProductsAllShops = groupIds.length > 0
        ? await db.query.groups.findMany({
            where: (groups, { inArray }) => inArray(groups.id, groupIds),
            with: {
                products: {
                    with: {
                        product: {
                            with: {
                                shopCurrentPrices: {
                                    where: (scp, { eq, or, and, isNull }) =>
                                        and(or(eq(scp.hidden, false), isNull(scp.hidden))),
                                    orderBy: (prices, { asc }) => [asc(prices.currentPrice)],
                                },
                            },
                        },
                    },
                },
            },
        })
        : [];

    type LineItem = {
        quantity: number;
        pricesByShop: Map<number, number>;
    };

    const lineItems: LineItem[] = [];
    const listProductsAllById = new Map(listProductsAllShops.map((product) => [product.id, product]));

    for (const item of list.items) {
        const product = listProductsAllById.get(item.productId);
        if (!product) {
            continue;
        }

        const pricesByShop = new Map<number, number>();
        for (const shopPrice of product.shopCurrentPrices) {
            const value = Number(shopPrice.currentPrice);
            if (!Number.isFinite(value)) {
                continue;
            }
            pricesByShop.set(shopPrice.shopId, value);
        }

        if (pricesByShop.size === 0) {
            continue;
        }

        const quantity = item.amount && item.amount > 0 ? item.amount : 1;
        lineItems.push({ quantity, pricesByShop });
    }

    for (const group of groupsWithProductsAllShops) {
        const listGroupItem = groupItemByGroupId.get(group.id);
        const quantity = listGroupItem?.amount && listGroupItem.amount > 0 ? listGroupItem.amount : 1;
        const ignoredProductIds = new Set(
            (listGroupItem?.ignoredProducts ?? [])
                .map((productId) => Number(productId))
                .filter(Number.isFinite)
        );
        const pricesByShop = new Map<number, number>();

        for (const groupProduct of group.products) {
            if (!groupProduct.product) {
                continue;
            }

            if (ignoredProductIds.has(groupProduct.product.id)) {
                continue;
            }

            for (const shopPrice of groupProduct.product.shopCurrentPrices) {
                const value = Number(shopPrice.currentPrice);
                if (!Number.isFinite(value)) {
                    continue;
                }

                const existing = pricesByShop.get(shopPrice.shopId);
                if (existing === undefined || value < existing) {
                    pricesByShop.set(shopPrice.shopId, value);
                }
            }
        }

        if (pricesByShop.size > 0) {
            lineItems.push({ quantity, pricesByShop });
        }
    }

    type ShopSelectionScore = {
        shopIds: number[];
        total: number;
        missingCount: number;
    };

    const computeBestSingleShop = (shopIds: number[], items: LineItem[]) => {
        if (items.length === 0) {
            return null;
        }

        let best: ShopSelectionScore | null = null;
        for (const shopId of shopIds) {
            let total = 0;
            let missingCount = 0;

            for (const item of items) {
                const price = item.pricesByShop.get(shopId);
                if (price === undefined) {
                    missingCount += 1;
                    continue;
                }
                total += price * item.quantity;
            }

            if (!best || missingCount < best.missingCount || (missingCount === best.missingCount && total < best.total)) {
                best = { shopIds: [shopId], total, missingCount };
            }
        }

        return best;
    };

    const computeBestPairShops = (shopIds: number[], items: LineItem[]) => {
        if (items.length === 0 || shopIds.length < 2) {
            return null;
        }

        let best: ShopSelectionScore | null = null;
        for (let i = 0; i < shopIds.length; i += 1) {
            for (let j = i + 1; j < shopIds.length; j += 1) {
                const shopA = shopIds[i];
                const shopB = shopIds[j];
                let total = 0;
                let missingCount = 0;

                for (const item of items) {
                    const priceA = item.pricesByShop.get(shopA);
                    const priceB = item.pricesByShop.get(shopB);

                    if (priceA === undefined && priceB === undefined) {
                        missingCount += 1;
                        continue;
                    }

                    const price = Math.min(priceA ?? Number.POSITIVE_INFINITY, priceB ?? Number.POSITIVE_INFINITY);
                    total += price * item.quantity;
                }

                if (!best || missingCount < best.missingCount || (missingCount === best.missingCount && total < best.total)) {
                    best = { shopIds: [shopA, shopB], total, missingCount };
                }
            }
        }

        return best;
    };

    const bestSingleShop = computeBestSingleShop(allShopIds, lineItems);
    const bestPairShops = computeBestPairShops(allShopIds, lineItems);

    const cheapestShopIds = bestSingleShop ? bestSingleShop.shopIds : [];
    const bestPairShopIds = (() => {
        if (!bestSingleShop && !bestPairShops) {
            return [];
        }
        if (!bestPairShops) {
            return bestSingleShop?.shopIds ?? [];
        }
        if (!bestSingleShop) {
            return bestPairShops.shopIds;
        }

        const pairIsBetter =
            bestPairShops.missingCount < bestSingleShop.missingCount ||
            (bestPairShops.missingCount === bestSingleShop.missingCount &&
                bestPairShops.total < bestSingleShop.total);

        return pairIsBetter ? bestPairShops.shopIds : bestSingleShop.shopIds;
    })();

    const productPrices = list.items.length > 0
        ? await db.query.products.findMany({
            where: (products, { inArray }) => inArray(products.id, list.items.map(i => i.productId)),
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

    const groupsWithProducts = groupIds.length > 0
        ? await db.query.groups.findMany({
            where: (groups, { inArray }) => inArray(groups.id, groupIds),
            with: {
                products: {
                    with: {
                        product: {
                            with: {
                                shopCurrentPrices: {
                                    where: (scp, { eq, or, and, inArray, isNull }) =>
                                        and(or(eq(scp.hidden, false), isNull(scp.hidden)), inArray(scp.shopId, selectedShopIds)),
                                    with: {
                                        shop: true,
                                    },
                                    orderBy: (prices, { asc }) => [asc(prices.currentPrice)],
                                },
                            },
                        },
                    },
                },
            },
        })
        : [];

    type ProductWithPrices = (typeof productPrices)[number];
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
            groupProduct.product ? [groupProduct.product] : []
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

        type GroupPick = {
            product: (typeof products)[number];
            price: number;
            shopPrice: (typeof products)[number]["shopCurrentPrices"][number];
        };

        let bestPick: GroupPick | null = null;
        const shopPicks: GroupPick[] = [];

        for (const shopId of selectedShopIds) {
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

        let comparisonLabel: string | null = null;
        const otherPicks = shopPicks.filter(
            (pick) => pick.shopPrice.shopId !== bestPick.shopPrice.shopId
        );

        if (otherPicks.length > 0) {
            let mostExpensivePick = otherPicks[0];

            for (const pick of otherPicks.slice(1)) {
                if (pick.price > mostExpensivePick.price) {
                    mostExpensivePick = pick;
                }
            }

            const difference = mostExpensivePick.price - bestPick.price;

            if (difference > 0) {
                comparisonLabel = `RD$${difference.toFixed(2)} mas barato que ${mostExpensivePick.shopPrice.shop.name}`;
            } else if (difference === 0) {
                comparisonLabel = `Mismo precio que ${mostExpensivePick.shopPrice.shop.name}`;
            }
        }

        const productForList = {
            ...bestPick.product,
            shopCurrentPrices: [
                bestPick.shopPrice,
                ...bestPick.product.shopCurrentPrices.filter(
                    (price) => price.shopId !== bestPick.shopPrice.shopId
                ),
            ],
        };

        const alternatives = shopPicks
            .map((pick) => ({
                product: pick.product,
                price: pick.price,
                shopName: pick.shopPrice.shop.name,
                shopId: pick.shopPrice.shopId,
                isCurrent:
                    pick.shopPrice.shopId === bestPick.shopPrice.shopId &&
                    pick.product.id === bestPick.product.id,
            }))
            .sort((a, b) => a.price - b.price);

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
    const shops = Object.keys(groupByShop);

    return (
        <div className="container mx-auto pb-4 px-2 max-w-4xl">
            <div className="flex flex-1 flex-col">
                <div className="flex justify-between">
                    <div className="font-bold text-2xl">Lista</div>
                    <div>
                        <SelectShops
                            shops={allShops}
                            listId={list.id}
                            initialSelectedShops={list.selectedShops.map(s => (Number(s)))}
                            cheapestShopIds={cheapestShopIds}
                            bestPairShopIds={bestPairShopIds}
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <div>
                        Total <span className="font-bold">RD${totalPrice.toFixed(2)}</span>
                    </div>
                    <div>
                        Productos <span className="font-bold">{totalProducts}</span>
                    </div>
                </div>
                {shops.map(shop => {
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
    )
}


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

    const groupIds = Array.from(new Set(listGroupItems.map((item) => item.groupId)));
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
    type ListEntry = {
        rowKey: string;
        product: ProductWithPrices;
        amount: number | null;
        listItem?: (typeof list.items)[number];
        comparisonLabel?: string | null;
    };

    const listItemByProductId = new Map(list.items.map((item) => [item.productId, item]));
    const productEntries: ListEntry[] = productPrices.map((product) => ({
        rowKey: `product-${product.id}`,
        product,
        amount: listItemByProductId.get(product.id)?.amount ?? null,
        listItem: listItemByProductId.get(product.id),
    }));

    const groupItemByGroupId = new Map(listGroupItems.map((item) => [item.groupId, item]));
    const groupEntries: ListEntry[] = [];
    const groupEntriesWithoutShop: ListEntry[] = [];

    for (const group of groupsWithProducts) {
        const listGroupItem = groupItemByGroupId.get(group.id);
        const amount = listGroupItem?.amount ?? null;
        const products = group.products.flatMap((groupProduct) =>
            groupProduct.product ? [groupProduct.product] : []
        );

        if (products.length === 0) {
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
                product: products[0],
                amount,
                comparisonLabel: null,
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

        groupEntries.push({
            rowKey: `group-${group.id}`,
            product: productForList,
            amount,
            comparisonLabel,
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
                        <SelectShops shops={allShops} listId={list.id} initialSelectedShops={list.selectedShops.map(s => (Number(s)))} />
                    </div>
                </div>

                <div>
                    Total <span className="font-bold">RD${totalPrice.toFixed(2)}</span> Productos <span className="font-bold">{totalProducts}</span>
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

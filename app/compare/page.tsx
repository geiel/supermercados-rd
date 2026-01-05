import { db } from "@/db";
import { getUser } from "@/lib/supabase";
import { CompareProducts } from "./client";

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

    const productPrices = list.items.length > 0
        ? await db.query.products.findMany({
            where: (products, { inArray }) => inArray(products.id, list.items.map(i => i.productId)),
            with: {
                shopCurrentPrices: {
                    where: (scp, { eq, or, and, isNull }) => and(or(eq(scp.hidden, false), isNull(scp.hidden))),
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

    const officialGroups = groupsWithProducts
        .map((group) => {
            const products = group.products.flatMap((groupProduct) =>
                groupProduct.product ? [groupProduct.product] : []
            );

            return {
                id: group.id,
                name: group.name,
                productsIds: products.map((product) => product.id),
                products,
                source: "official" as const,
            };
        })
        .filter((group) => group.products.length > 0);

    const shops = await db.query.shops.findMany({
        orderBy: (shops, { asc }) => [asc(shops.name)]
    });

    const totalsByShopId = new Map<number, number>(
        shops.map((shop) => [shop.id, 0])
    );

    for (const product of productPrices) {
        for (const price of product.shopCurrentPrices) {
            const value = Number(price.currentPrice);
            if (!Number.isFinite(value)) continue;
            totalsByShopId.set(price.shopId, (totalsByShopId.get(price.shopId) ?? 0) + value);
        }
    }

    return (
        <CompareProducts
            shops={shops}
            productPrices={productPrices}
            totalsByShopId={totalsByShopId}
            listItems={list.items}
            officialGroups={officialGroups}
        />
    )
}

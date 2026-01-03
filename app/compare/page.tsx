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

    if (!list || list.items.length === 0) {
        return <div>Your comparison list is empty.</div>;
    }

    const productPrices = await db.query.products.findMany({
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
    });

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
        <CompareProducts shops={shops} productPrices={productPrices} totalsByShopId={totalsByShopId} />
    )
}

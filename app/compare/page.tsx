
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

    if (!list || list.items.length === 0) {
        return <div>Your comparison list is empty.</div>;
    }

    const allShops = await db.query.shops.findMany();
    let selectedShops = list.selectedShops;

    if (selectedShops.length === 0) {
        selectedShops = allShops.map(shop => shop.id.toString());
    }

    const productPrices = await db.query.products.findMany({
        where: (products, { inArray }) => inArray(products.id, list.items.map(i => i.productId)),
        with: {
            shopCurrentPrices: {
                where: (scp, { eq, or, and, inArray, isNull }) => and(or(eq(scp.hidden, false), isNull(scp.hidden)), inArray(scp.shopId, selectedShops.map(id => Number(id)))),
                with: {
                    shop: true,
                },
                orderBy: (prices, { asc }) => [asc(prices.currentPrice)]
            }
        }
    });

    const productsWithoutShop = productPrices.filter(item => item.shopCurrentPrices.length === 0);
    const groupByShop = Object.groupBy(productPrices.filter(item => item.shopCurrentPrices.length > 0), ({ shopCurrentPrices }) => shopCurrentPrices[0].shop.name);
    const shops = Object.keys(groupByShop);

    return (
        <div className="container mx-auto pb-4 max-w-4xl">
            <div className="flex flex-1 flex-col">
                <div className="flex justify-between">
                    <div className="font-bold text-2xl">Lista</div>
                    <div>
                        <SelectShops shops={allShops} listId={list.id} initialSelectedShops={list.selectedShops.map(s => (Number(s)))} />
                    </div>
                </div>
                {shops.map(shop => {
                    const products = groupByShop[shop];

                    if (!products) {
                        return null;
                    }

                    const totalPrice = products.reduce((acc, item) => {
                        const unitPrice = item.shopCurrentPrices[0].currentPrice;
                        const listItem = list.items.find(i => i.productId === item.id);
                        const quantity = listItem?.amount && listItem.amount > 0 ? listItem.amount : 1;
                        return acc + (unitPrice ? Number(unitPrice) : 0) * quantity;
                    }, 0);

                    return (
                        <section key={shop}>
                            <div className="py-4 flex justify-between items-center">
                                <div>
                                    <Image
                                        src={`/supermarket-logo/${products[0].shopCurrentPrices[0].shop.logo}`}
                                        width={0}
                                        height={0}
                                        className="w-[50px] h-auto"
                                        alt="Supermarket logo"
                                        unoptimized
                                    />
                                </div>

                                <div>
                                    {totalPrice}
                                </div>
                            </div>
                            <ProductItems products={products} listItems={list.items} />
                        </section>
                    )
                })}
                {productsWithoutShop.length > 0 ? (
                    <section>
                        <div>No disponible en las tiendas seleccionadas</div>
                        <ProductItems products={productsWithoutShop} listItems={list.items} />
                    </section>
                ) : null}
            </div>
        </div>
    )
}

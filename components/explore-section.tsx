import { db } from "@/db";
import { and, asc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { TypographyH3 } from "./typography-h3";
import ScrollPeek from "./ui/scroll-peek";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ProductImage } from "./product-image";
import { complexCategories, complexCategoriesGroups, products, productsGroups, productsShopsPrices } from "@/db/schema";
import Link from "next/link";
import { toSlug } from "@/lib/utils";

export async function ExploreSection() {
    const categories = await db.query.complexCategories.findMany({
        where: eq(complexCategories.showHomePage, true)
    });
    
    return (
        <section>
            <div className="space-y-4">
                <TypographyH3>Explora</TypographyH3>
                <ScrollPeek>
                    <div className="flex space-x-4">
                        {categories.map(category => (
                            <Card className="w-84 bg-muted/60 border-none py-4" key={category.id}>
                                <CardHeader>
                                    <CardTitle>{category.name}</CardTitle>
                                    <CardDescription>
                                        Mas barato en el Nacional hoy.
                                    </CardDescription>
                                    <CardAction>
                                        <Button variant="link" asChild>
                                            <Link href={`categories/${category.humanNameId}`}>
                                                Ver mas
                                            </Link>
                                        </Button>
                                    </CardAction>
                                </CardHeader>
                                <CardContent className="px-4">
                                    <ComplexCategoryPreview complexCategoryId={category.id} />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollPeek>
            </div>
        </section>
    )
}

async function ComplexCategoryPreview({ complexCategoryId }: { complexCategoryId: number }) {
    const previewProductIds = await db
        .select({ productId: productsShopsPrices.productId })
        .from(complexCategoriesGroups)
        .innerJoin(
            productsGroups,
            eq(complexCategoriesGroups.groupId, productsGroups.groupId)
        )
        .innerJoin(
            productsShopsPrices,
            eq(productsGroups.productId, productsShopsPrices.productId)
        )
        .where(
            and(
                eq(complexCategoriesGroups.complexCategoryId, complexCategoryId),
                isNotNull(productsShopsPrices.currentPrice),
                or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false))
            )
        )
        .groupBy(productsShopsPrices.productId)
        .orderBy(sql`RANDOM()`)
        .limit(4);

    const previewIds = previewProductIds.map(({ productId }) => productId);

    const productsPreview = previewIds.length
        ? await db
            .selectDistinctOn([productsShopsPrices.productId], {
                productId: productsShopsPrices.productId,
                currentPrice: productsShopsPrices.currentPrice,
                product: products,
            })
            .from(productsShopsPrices)
            .innerJoin(products, eq(products.id, productsShopsPrices.productId))
            .where(
                and(
                    inArray(productsShopsPrices.productId, previewIds),
                    isNotNull(productsShopsPrices.currentPrice),
                    or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false))
                )
            )
            .orderBy(productsShopsPrices.productId, asc(productsShopsPrices.currentPrice))
            .limit(4)
        : [];

    

    return (
        <div className="grid grid-cols-2 gap-2">
            {productsPreview.map(price => (
                <Link key={price.productId} href={`/product/${toSlug(price.product.name)}/${price.productId}`} className="flex flex-col gap-2 max-w-full bg-white p-2 rounded" prefetch={false}>
                    <div className="flex justify-center">
                        <div className="h-[130px] w-[130px] relative">
                            {price.product.image ? (
                                <ProductImage
                                    src={price.product.image}
                                    fill
                                    alt={price.product.name + " " + price.product.unit}
                                    sizes="130px"
                                    style={{
                                        objectFit: "contain",
                                    }}
                                    placeholder="blur"
                                    blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                                    className="max-w-none"
                                />
                            ) : null}
                        </div>
                    </div>
                    <div className="truncate">{price.product.name}</div>
                    <div className="font-bold text-lg">RD${price.currentPrice}</div>
                </Link>
            ))}
        </div>
    )
    
}

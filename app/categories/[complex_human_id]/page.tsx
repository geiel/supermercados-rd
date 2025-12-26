import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ScrollFade from "@/components/ui/scroll-fade";
import { Unit } from "@/components/unit";
import { db } from "@/db";
import { groups, products, productsGroups, productsShopsPrices } from "@/db/schema";
import { toSlug } from "@/lib/utils";
import { and, asc, eq, isNotNull, isNull, or } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";

type Props = {
  params: Promise<{ complex_human_id: string }>;
};

export default async function Page({ params }: Props) {
    const { complex_human_id } = await params;

    const complexCategory = await db.query.complexCategories.findFirst({
        where: (category, { eq }) => eq(category.humanNameId, complex_human_id),
        with: {
            complexCategoryGroups: {
                limit: 5
            }
        }
    });

    return (
        <div className="container mx-auto px-2">
            <div className="space-y-2">
                {complexCategory?.complexCategoryGroups.map(group => (
                    <Suspense key={group.groupId}>
                        <GroupCard groupId={group.groupId} complexGroupHumanId={complex_human_id} />
                    </Suspense>
                ))}
            </div>
        </div>
    )
}

async function GroupCard({ groupId, complexGroupHumanId }: { groupId: number, complexGroupHumanId: string }) {
    const groupProducts = await db
        .selectDistinctOn([products.id], {
            groupId: groups.id,
            groupName: groups.name,
            groupHumanId: groups.humanNameId,
            productId: products.id,
            productName: products.name,
            productImage: products.image,
            productUnit: products.unit,
            currentPrice: productsShopsPrices.currentPrice,
        })
        .from(groups)
        .innerJoin(productsGroups, eq(productsGroups.groupId, groups.id))
        .innerJoin(products, eq(products.id, productsGroups.productId))
        .innerJoin(
            productsShopsPrices,
            and(
                eq(productsShopsPrices.productId, products.id),
                isNotNull(productsShopsPrices.currentPrice),
                or(
                    isNull(productsShopsPrices.hidden),
                    eq(productsShopsPrices.hidden, false)
                )
            )
        )
        .where(eq(groups.id, groupId))
        .orderBy(asc(products.id), asc(productsShopsPrices.currentPrice))
        .limit(10);

    if (groupProducts.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{groupProducts[0].groupName}</CardTitle>
                <CardDescription>
                    Precios han aumentado un 10% en los ultimos 3 meses.
                </CardDescription>
                <CardAction>
                    <Button variant="link" asChild>  
                        <Link href={`${complexGroupHumanId}/${groupProducts[0].groupHumanId}`}>
                            Ver mas
                        </Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <ScrollFade>
                    <div className="flex space-x-4">
                        {groupProducts.map(groupProduct => (
                            <Link key={groupProduct.productId} href={`/product/${toSlug(groupProduct.productName)}/${groupProduct.productId}`} className="w-40">
                                <div className="flex justify-center">
                                    <div className="h-[130px] w-[130px] relative">
                                        {groupProduct.productImage ? (
                                            <ProductImage
                                                src={groupProduct.productImage}
                                                fill
                                                alt={groupProduct.productName + " " + groupProduct.productUnit}
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
                                <div className="space-y-2">
                                    <Unit unit={groupProduct.productUnit} variant="small" />
                                    <div>
                                        <div className="text-sm">{groupProduct.productName}</div>
                                        <div className="font-bold">RD${groupProduct.currentPrice}</div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </ScrollFade>
            </CardContent>
        </Card>
    )
}   

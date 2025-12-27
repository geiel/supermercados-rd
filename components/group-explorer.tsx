import { AddListButton } from "@/components/add-list";
import { db } from "@/db";
import { groups, products, productsBrands, productsGroups, productsShopsPrices } from "@/db/schema";
import { toSlug } from "@/lib/utils";
import { and, asc, eq, getTableColumns, isNotNull, isNull, or } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";
import { ProductImage } from "@/components/product-image";
import { Unit } from "@/components/unit";
import { ProductBrand } from "@/components/product-brand";
import { alias } from "drizzle-orm/pg-core";
import { PricePerUnit } from "@/components/price-per-unit";
import { Badge } from "@/components/ui/badge";
import { TypographyH3 } from "@/components/typography-h3";

type Response = {
    groupId: number;
    groupName: string;
    productId: number;
    productName: string;
    productImage: string | null;
    productUnit: string;
    currentPrice: string | null;
}

export async function GroupExplorer({ humanId }: { humanId: string }) {
    const pBrand = alias(productsBrands, "possible_brand")

    const groupProducts = await db
        .selectDistinctOn([products.id], {
            groupId: groups.id,
            groupName: groups.name,
            groupCheaperProductId: groups.cheaperProductId,
            groupBestValueProductId: groups.bestValueProductId,
            productId: products.id,
            productName: products.name,
            productImage: products.image,
            productUnit: products.unit,
            productCategory: products.categoryId,
            productBrand: getTableColumns(productsBrands),
            possibleBrand: getTableColumns(pBrand),
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
        .innerJoin(productsBrands, eq(products.brandId, productsBrands.id))
        .leftJoin(pBrand, eq(products.possibleBrandId, pBrand.id))
        .where(eq(groups.humanNameId, humanId))
        .orderBy(asc(products.id), asc(productsShopsPrices.currentPrice));

    if (groupProducts.length === 0) {
        return null;
    }

    const sortedGroupProducts = [...groupProducts].sort((a, b) => {
        const aHasBadge = a.groupCheaperProductId === a.productId || a.groupBestValueProductId === a.productId;
        const bHasBadge = b.groupCheaperProductId === b.productId || b.groupBestValueProductId === b.productId;

        if (aHasBadge === bHasBadge) return 0;
        return aHasBadge ? -1 : 1;
    });

    return (
        <div className="container mx-auto px-2 pb-2 space-y-4">
            <TypographyH3>{sortedGroupProducts[0].groupName}</TypographyH3>
            <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
                {sortedGroupProducts.map((groupProduct) => {
                    const isCheaper = groupProduct.groupCheaperProductId === groupProduct.productId;
                    const isBestValue = groupProduct.groupBestValueProductId === groupProduct.productId;

                    return (
                        <div
                            key={groupProduct.productId}
                            className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px] relative"
                        >
                            {(isCheaper || isBestValue) ? (
                                <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
                                    {isCheaper ? (
                                        <Badge className="bg-emerald-600 text-white border-transparent">Mas barato</Badge>
                                    ) : null}
                                    {isBestValue ? (
                                        <Badge className="bg-amber-500 text-white border-transparent">Mejor valor</Badge>
                                    ) : null}
                                </div>
                            ) : null}
                            <div className="absolute top-2 right-2 z-10">
                                <AddListButton productId={groupProduct.productId} type="icon" />
                            </div>
                            <Link
                                href={`/product/${toSlug(groupProduct.productName)}/${groupProduct.productId}`}
                                className="flex flex-col gap-2"
                            >
                                <div className="flex justify-center">
                                    <div className="h-[220px] w-[220px] relative">
                                        <ExploreCategoryImage product={groupProduct} />
                                    </div>
                                </div>
                                <Unit unit={groupProduct.productUnit} />
                                <div>
                                    <ProductBrand brand={groupProduct.productBrand} possibleBrand={groupProduct.possibleBrand} type="explore" />
                                    {groupProduct.productName}
                                </div>
                                <div>
                                    <div className="font-bold text-lg pt-1">RD${groupProduct.currentPrice}</div>
                                    <PricePerUnit
                                        unit={groupProduct.productUnit}
                                        price={Number(groupProduct.currentPrice)}
                                        categoryId={groupProduct.productCategory}
                                    />
                                </div>
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

function ExploreCategoryImage({ product }: { product: Response }) {
  if (!product.productImage) {
    return <Image 
            src="/no-product-found.jpg" alt="image product not found" 
            fill
            unoptimized
            sizes="220px"
            style={{
              objectFit: "contain",
            }}
            placeholder="blur"
            blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
            className="max-w-none" />;
  }

  return (
    <ProductImage
      src={product.productImage}
      fill
      alt={product.productName + " " + product.productUnit}
      sizes="220px"
      style={{
        objectFit: "contain",
      }}
      placeholder="blur"
      blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
      className="max-w-none"
    />
  );
}
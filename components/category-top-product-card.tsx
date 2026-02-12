"use client";

import Link from "next/link";
import {
  productsBrandsSelect,
  productsSelect,
  productsShopsPrices,
} from "@/db/schema";
import { ProductImage } from "@/components/product-image";
import { PricePerUnit } from "@/components/price-per-unit";
import { Unit } from "@/components/unit";
import { ProductBrand } from "@/components/product-brand";
import { AddToListButton } from "@/components/add-to-list-button";
import { OfferBadge } from "@/components/offer-badge";
import { toSlug } from "@/lib/utils";
import { Price } from "@/components/price";

type CategoryTopProductCardProps = {
  product: productsSelect & {
    brand: productsBrandsSelect;
    possibleBrand: productsBrandsSelect | null;
  } & {
    shopCurrentPrices: productsShopsPrices[];
    productDeal: { dropPercentage: string | number } | null;
  };
};

export function CategoryTopProductCard({ product }: CategoryTopProductCardProps) {
  const cheapest = product.shopCurrentPrices.reduce((minSoFar, current) =>
    Number(current.currentPrice) < Number(minSoFar.currentPrice)
      ? current
      : minSoFar
  );
  const dropPercentage = product.productDeal?.dropPercentage;
  const shouldShowDeal =
    dropPercentage !== null &&
    dropPercentage !== undefined &&
    Number(dropPercentage) > 0;

  return (
    <div className="relative flex flex-col gap-3 pb-2">
      {shouldShowDeal ? (
        <div className="absolute top-0 left-0 z-10">
          <OfferBadge dropPercentage={dropPercentage} />
        </div>
      ) : null}
      <div className="absolute top-0 right-0 z-10">
        <AddToListButton productId={product.id} variant="icon" />
      </div>
      <Link
        href={`/productos/${toSlug(product.name)}/${product.id}`}
        className="flex flex-col gap-2"
        prefetch={false}
      >
        <div className="h-[140px] w-[140px] md:h-[190px] md:w-[190px] relative mx-auto">
          {product.image ? (
            <ProductImage
              src={product.image}
              productId={product.id}
              fill
              alt={product.name + product.unit}
              sizes="(max-width: 768px) 140px, 190px"
              style={{
                objectFit: "contain",
              }}
              className="max-w-none"
            />
          ) : null}
        </div>
        <div className="px-2 flex flex-col gap-1">
          <Unit unit={product.unit} />
          <div className="text-base">
            <ProductBrand
              brand={product.brand}
              possibleBrand={product.possibleBrand}
              type="related"
            />
            <span className="line-clamp-2">{product.name}</span>
          </div>
          <div>
            <Price value={cheapest.currentPrice} className="font-bold text-lg" />
            <PricePerUnit
              unit={product.unit}
              price={Number(cheapest.currentPrice)}
              categoryId={product.categoryId}
              productName={product.name}
            />
          </div>
        </div>
      </Link>
    </div>
  );
}

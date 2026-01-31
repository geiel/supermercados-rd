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
import { toSlug } from "@/lib/utils";
import { OfferBadge } from "@/components/offer-badge";

type RelatedProductCardProps = {
  product: productsSelect & {
    brand: productsBrandsSelect;
    possibleBrand: productsBrandsSelect | null;
  } & {
    shopCurrentPrices: productsShopsPrices[];
    productDeal: { dropPercentage: string | number } | null;
  };
};

export function RelatedProductCard({ product }: RelatedProductCardProps) {
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
    <div className="relative flex flex-col gap-2 pb-2">
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
        <div className="h-[130px] w-[130px] relative mx-auto">
          {product.image ? (
            <ProductImage
              src={product.image}
              productId={product.id}
              fill
              alt={product.name + product.unit}
              sizes="130px"
              style={{
                objectFit: "contain",
              }}
              className="max-w-none"
            />
          ) : null}
        </div>
        <Unit unit={product.unit} />
        <div>
          <ProductBrand
            brand={product.brand}
            possibleBrand={product.possibleBrand}
            type="related"
          />
          {product.name}
        </div>
        <div>
          <div className="font-bold text-lg">RD${cheapest.currentPrice}</div>
          <PricePerUnit
            unit={product.unit}
            price={Number(cheapest.currentPrice)}
            categoryId={product.categoryId}
            productName={product.name}
          />
        </div>
      </Link>
    </div>
  );
}

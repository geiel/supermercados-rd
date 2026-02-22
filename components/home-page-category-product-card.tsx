"use client";

import Link from "next/link";

import { ProductImage } from "@/components/product-image";
import { Unit } from "@/components/unit";
import { AddToListButton } from "@/components/add-to-list-button";
import { toSlug } from "@/lib/utils";
import type { HomePageCategoryProduct } from "@/lib/home-page-categories";
import { OfferBadge } from "@/components/offer-badge";
import { PricePerUnit } from "@/components/price-per-unit";
import { Price } from "@/components/price";

const SUPERMARKET_BRAND_NAMES = ["Bravo", "Jumbo Market", "Sirena", "Plaza Lama"];

type Props = {
  product: HomePageCategoryProduct;
};

export function HomePageCategoryProductCard({ product }: Props) {
  const dropPercentage = product.productDeal?.dropPercentage;
  const numericPrice = Number(product.currentPrice);
  const shouldShowDeal =
    dropPercentage !== null &&
    dropPercentage !== undefined &&
    Number(dropPercentage) > 0;

  return (
    <div className="relative flex flex-col gap-2">
      {shouldShowDeal ? (
        <div className="absolute top-0 left-0 z-10">
          <OfferBadge dropPercentage={dropPercentage} />
        </div>
      ) : null}
      <div className="absolute top-0 right-0 z-10">
        <AddToListButton productId={product.productId} variant="icon" />
      </div>
      <Link
        href={`/productos/${toSlug(product.name)}/${product.productId}`}
        className="flex flex-col gap-2"
        prefetch={false}
      >
        <div className="relative w-full max-w-[168px] aspect-square mx-auto">
          {product.image ? (
            <ProductImage
              src={product.image}
              productId={product.productId}
              fill
              alt={product.name + product.unit}
              sizes="(min-width: 1024px) 168px, 30vw"
              style={{
                objectFit: "contain",
              }}
              placeholder="blur"
              blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
              className="max-w-none"
            />
          ) : null}
        </div>
        <div className="px-2 flex flex-col gap-1">
          <Unit unit={product.unit} />
          <div>
            <BrandName
              name={product.brandName}
              possibleName={product.possibleBrandName}
            />
            <span className="line-clamp-2">{product.name}</span>
          </div>
          <div>
            <Price value={product.currentPrice} className="font-bold text-lg" />
            {Number.isFinite(numericPrice) ? (
              <PricePerUnit
                unit={product.unit}
                price={numericPrice}
                categoryId={product.categoryId}
                productName={product.name}
              />
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-muted-foreground text-sm">
            <span className="inline-flex items-center justify-center size-5 rounded-full border text-xs font-medium">
              {product.amountOfShops}
            </span>
            <span>
              {product.amountOfShops === 1 ? "tienda" : "tiendas"}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

function BrandName({
  name,
  possibleName,
}: {
  name: string;
  possibleName: string | null;
}) {
  if (!possibleName) {
    return <div className="font-bold">{name}</div>;
  }

  if (SUPERMARKET_BRAND_NAMES.includes(name)) {
    return <div className="font-bold">{possibleName}</div>;
  }

  return <div className="font-bold">{name}</div>;
}

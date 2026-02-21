"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

import { Price } from "@/components/price";
import { PricePerUnit } from "@/components/price-per-unit";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toSlug } from "@/lib/utils";

type SupermarketAlternativeProduct = {
  id: number;
  name: string;
  image: string | null;
  unit: string;
  categoryId: number;
  brand: {
    id: number;
    name: string;
  };
  possibleBrand: {
    id: number;
    name: string;
  } | null;
  shopCurrentPrices: Array<{
    shopId: number;
    currentPrice: string | null;
  }>;
  alternativeShopId: number;
};

export function SupermarketAlternatives({
  products,
  shopLogoById,
  shopNameById,
}: {
  products: SupermarketAlternativeProduct[];
  shopLogoById: Record<string, string>;
  shopNameById: Record<string, string>;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const preparedProducts = products.flatMap((product) => {
    const displayUnit =
      product.unit.trim().toUpperCase() === "PAQ" ? "" : product.unit;
    const productLabel = [product.name, displayUnit].filter(Boolean).join(" ");
    const selectedPrice = product.shopCurrentPrices.find(
      (shopPrice) => shopPrice.shopId === product.alternativeShopId
    );
    const selectedShopLogo = shopLogoById[product.alternativeShopId];
    const selectedShopName = shopNameById[product.alternativeShopId] ?? "Supermercado";

    if (!selectedPrice?.currentPrice || !selectedShopLogo) {
      return [];
    }

    return [
      {
        key: `${product.id}-${product.alternativeShopId}`,
        id: product.id,
        productId: product.id,
        name: product.name,
        image: product.image,
        unit: product.unit,
        categoryId: product.categoryId,
        href: `/productos/${toSlug(product.name)}/${product.id}`,
        productLabel,
        selectedShopLogo,
        selectedShopName,
        selectedPrice: selectedPrice.currentPrice,
        numericPrice: Number(selectedPrice.currentPrice),
      },
    ];
  });

  if (preparedProducts.length === 0) {
    return null;
  }

  const primaryProducts = preparedProducts.slice(0, 2);
  const hiddenProducts = preparedProducts.slice(2);
  const previewProducts = hiddenProducts.slice(0, 2);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {primaryProducts.map((product) => (
          <AlternativeCard key={product.key} product={product} />
        ))}
      </div>

      {hiddenProducts.length > 0 && !isExpanded ? (
        <div className="relative">
          <div className="max-h-16 overflow-hidden md:max-h-20">
            <div className="grid grid-cols-1 gap-2 opacity-70 blur-[1.2px] md:grid-cols-2">
              {previewProducts.map((product) => (
                <AlternativeCard key={`preview-${product.key}`} product={product} isPreview />
              ))}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-7 h-14 bg-gradient-to-t from-background via-background/95 to-transparent" />
          <div className="relative mt-1 border-t border-border">
            <div className="flex -translate-y-1/2 justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full px-5"
                onClick={() => setIsExpanded(true)}
              >
                Ver más
                <ChevronDown className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isExpanded && hiddenProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {hiddenProducts.map((product) => (
            <AlternativeCard key={`expanded-${product.key}`} product={product} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type PreparedAlternativeProduct = {
  key: string;
  id: number;
  productId: number;
  name: string;
  image: string | null;
  unit: string;
  categoryId: number;
  href: string;
  productLabel: string;
  selectedShopLogo: string;
  selectedShopName: string;
  selectedPrice: string;
  numericPrice: number;
};

function AlternativeCard({
  product,
  isPreview = false,
}: {
  product: PreparedAlternativeProduct;
  isPreview?: boolean;
}) {
  const cardContent = (
    <>
      <div className="relative h-16 w-16">
        {product.image ? (
          <ProductImage
            src={product.image}
            productId={product.productId}
            fill
            alt={product.productLabel}
            sizes="64px"
            style={{ objectFit: "contain" }}
            className="max-w-none"
          />
        ) : (
          <Image
            src="/no-product-found.jpg"
            alt="image product not found"
            fill
            unoptimized
            sizes="64px"
            style={{ objectFit: "contain" }}
            className="max-w-none"
          />
        )}
      </div>

      <div className="min-w-0 space-y-1">
        <Image
          src={`/supermarket-logo/${product.selectedShopLogo}`}
          width={0}
          height={0}
          className="h-auto w-[56px]"
          alt={`Logo ${product.selectedShopName}`}
          unoptimized
        />
        <div className="line-clamp-2 text-sm">{product.productLabel}</div>
        <Price value={product.selectedPrice} className="font-bold" />
        {Number.isFinite(product.numericPrice) ? (
          <PricePerUnit
            unit={product.unit}
            price={product.numericPrice}
            categoryId={product.categoryId}
            productName={product.name}
            className="text-xs opacity-60"
          />
        ) : null}
      </div>
    </>
  );

  const cardClassName = cn(
    "grid grid-cols-[64px_1fr] items-start gap-3 rounded-md border border-[#e4e4e7] p-3",
    isPreview ? "pointer-events-none select-none" : "transition-colors hover:bg-muted/40"
  );

  if (isPreview) {
    return (
      <div className={cardClassName} aria-hidden="true">
        {cardContent}
      </div>
    );
  }

  return (
    <Link href={product.href} className={cardClassName} prefetch={false}>
      {cardContent}
    </Link>
  );
}

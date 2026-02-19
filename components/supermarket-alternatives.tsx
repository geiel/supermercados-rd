import Link from "next/link";
import Image from "next/image";

import { Price } from "@/components/price";
import { PricePerUnit } from "@/components/price-per-unit";
import { ProductImage } from "@/components/product-image";
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
  shopLogoById: Map<number, string>;
  shopNameById: Map<number, string>;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {products.map((product) => {
        const displayUnit =
          product.unit.trim().toUpperCase() === "PAQ" ? "" : product.unit;
        const productLabel = [product.name, displayUnit].filter(Boolean).join(" ");
        const selectedPrice = product.shopCurrentPrices.find(
          (shopPrice) => shopPrice.shopId === product.alternativeShopId
        );
        const selectedShopLogo = shopLogoById.get(product.alternativeShopId);
        const selectedShopName =
          shopNameById.get(product.alternativeShopId) ?? "Supermercado";

        if (!selectedPrice?.currentPrice || !selectedShopLogo) {
          return null;
        }

        const numericPrice = Number(selectedPrice.currentPrice);

        return (
          <Link
            key={product.id}
            href={`/productos/${toSlug(product.name)}/${product.id}`}
            className="grid grid-cols-[64px_1fr] items-start gap-3 rounded-md border border-[#e4e4e7] p-3 transition-colors hover:bg-muted/40"
            prefetch={false}
          >
            <div className="relative h-16 w-16">
              {product.image ? (
                <ProductImage
                  src={product.image}
                  productId={product.id}
                  fill
                  alt={productLabel}
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
                src={`/supermarket-logo/${selectedShopLogo}`}
                width={0}
                height={0}
                className="h-auto w-[56px]"
                alt={`Logo ${selectedShopName}`}
                unoptimized
              />
              <div className="line-clamp-2 text-sm">
                {productLabel}
              </div>
              <Price value={selectedPrice.currentPrice} className="font-bold" />
              {Number.isFinite(numericPrice) ? (
                <PricePerUnit
                  unit={product.unit}
                  price={numericPrice}
                  categoryId={product.categoryId}
                  productName={product.name}
                  className="text-xs opacity-60"
                />
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

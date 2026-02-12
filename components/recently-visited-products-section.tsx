"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TypographyH3 } from "@/components/typography-h3";
import ScrollPeek from "@/components/ui/scroll-peek";
import { ProductImage } from "@/components/product-image";
import { Unit } from "@/components/unit";
import { PricePerUnit } from "@/components/price-per-unit";
import {
  getRecentlyVisitedProducts,
  type RecentlyVisitedProduct,
} from "@/lib/recently-visited-products";
import { toSlug } from "@/lib/utils";

const formatPrice = (price: number) =>
  price.toLocaleString("es-DO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export function RecentlyVisitedProductsSection() {
  const [recentProducts, setRecentProducts] = useState<RecentlyVisitedProduct[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadProducts = () => {
      setRecentProducts(getRecentlyVisitedProducts());
      setIsLoaded(true);
    };

    loadProducts();
    window.addEventListener("storage", loadProducts);
    window.addEventListener("focus", loadProducts);
    window.addEventListener("pageshow", loadProducts);

    return () => {
      window.removeEventListener("storage", loadProducts);
      window.removeEventListener("focus", loadProducts);
      window.removeEventListener("pageshow", loadProducts);
    };
  }, []);

  if (!isLoaded) {
    return null;
  }

  if (recentProducts.length < 3) {
    return null;
  }

  return (
    <section>
      <div className="space-y-4">
        <TypographyH3>Vistos recientemente</TypographyH3>
        <ScrollPeek
          itemWidth="min(max(35vw, 110px), 218px)"
          itemWidthMd="224px"
        >
          <div className="flex space-x-2 p-2 relative">
            {recentProducts.map((product) => (
              <Link
                key={product.id}
                href={`/productos/${toSlug(product.name)}/${product.id}`}
                className="flex flex-col gap-2"
                prefetch={false}
              >
                <div className="relative w-full max-w-[180px] aspect-square mx-auto">
                  {product.image ? (
                    <ProductImage
                      src={product.image}
                      productId={product.id}
                      fill
                      alt={product.name + product.unit}
                      sizes="(min-width: 1024px) 180px, 32vw"
                      style={{
                        objectFit: "contain",
                      }}
                      placeholder="blur"
                      blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                      className="max-w-none"
                    />
                  ) : (
                    <Image
                      src="/no-product-found.jpg"
                      alt={product.name}
                      fill
                      sizes="(min-width: 1024px) 180px, 32vw"
                      className="max-w-none object-contain"
                    />
                  )}
                </div>
                <div className="px-2 flex flex-col gap-1">
                  <Unit unit={product.unit} />
                  <span className="line-clamp-2">{product.name}</span>
                  <span className="font-bold text-lg">
                    {product.price === null
                      ? "Precio no disponible"
                      : `RD$${formatPrice(product.price)}`}
                  </span>
                  {product.price !== null && product.categoryId !== null ? (
                    <PricePerUnit
                      unit={product.unit}
                      price={product.price}
                      categoryId={product.categoryId}
                      productName={product.name}
                    />
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </ScrollPeek>
      </div>
    </section>
  );
}

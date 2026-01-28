"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { AddToListButton } from "@/components/add-to-list-button";
import { PricePerUnit } from "@/components/price-per-unit";
import { ProductImage } from "@/components/product-image";
import { Unit } from "@/components/unit";
import { Spinner } from "@/components/ui/spinner";
import { toSlug } from "@/lib/utils";
import type {
  CategoryProductsResponse,
  HomePageCategoryProduct,
} from "@/lib/home-page-categories";

const SUPERMARKET_BRAND_NAMES = ["Bravo", "Jumbo Market", "Sirena", "Plaza Lama"];
const PAGE_SIZE = 20;

type CategoryProductsListProps = {
  categoryId: number;
  initialProducts: HomePageCategoryProduct[];
  total: number;
  initialOffset: number;
};

export function CategoryProductsList({
  categoryId,
  initialProducts,
  total,
  initialOffset,
}: CategoryProductsListProps) {
  const [products, setProducts] = useState<HomePageCategoryProduct[]>(initialProducts);
  const [totalCount, setTotalCount] = useState(total);
  const [offset, setOffset] = useState(initialOffset);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const hasMore = products.length < totalCount;

  const appendProducts = useCallback((incoming: HomePageCategoryProduct[]) => {
    if (incoming.length === 0) {
      return;
    }

    setProducts((current) => {
      const seen = new Set(current.map((p) => p.productId));
      const merged = [...current];

      for (const product of incoming) {
        if (!seen.has(product.productId)) {
          seen.add(product.productId);
          merged.push(product);
        }
      }

      return merged;
    });
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      const params = new URLSearchParams();
      params.set("category_id", String(categoryId));
      params.set("offset", String(offset));
      params.set("limit", String(PAGE_SIZE));

      const response = await fetch(`/api/category/products?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as CategoryProductsResponse;

      if (requestId !== requestIdRef.current) {
        return;
      }

      appendProducts(data.products);
      setTotalCount(data.total);
      setOffset(data.nextOffset);
    } catch (error) {
      console.error("[category] Failed to load more products", error);
      setErrorMessage("No se pudieron cargar más productos.");
    } finally {
      if (requestId === requestIdRef.current) {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [appendProducts, categoryId, hasMore, offset]);

  useEffect(() => {
    if (!hasMounted || !sentinelRef.current || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore, hasMounted]);

  return (
    <>
      <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
        {products.map((product) => (
          <CategoryProductCard key={product.productId} product={product} />
        ))}
      </div>
      {hasMore ? (
        <div ref={sentinelRef} className="flex justify-center py-4 px-4">
          {isLoading ? (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Cargando...
            </div>
          ) : null}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="text-center text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}
    </>
  );
}

function CategoryProductCard({ product }: { product: HomePageCategoryProduct }) {
  const numericPrice = Number(product.currentPrice);

  return (
    <div className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px] relative">
      <div className="absolute top-2 right-2 z-10">
        <AddToListButton productId={product.productId} variant="icon" />
      </div>
      <Link
        href={`/productos/${toSlug(product.name)}/${product.productId}`}
        className="flex flex-col gap-2"
        prefetch={false}
      >
        <div className="flex justify-center">
          <div className="h-[220px] w-[220px] relative">
            <ProductImageOrPlaceholder product={product} />
          </div>
        </div>
        <Unit unit={product.unit} />
        <div>
          <BrandName
            name={product.brandName}
            possibleName={product.possibleBrandName}
          />
          {product.name}
        </div>
        <div>
          <div className="font-bold text-lg pt-1">RD${product.currentPrice}</div>
          {Number.isFinite(numericPrice) ? (
            <PricePerUnit
              unit={product.unit}
              price={numericPrice}
              categoryId={0}
              productName={product.name}
            />
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <span className="inline-flex items-center justify-center size-5 rounded-full border text-xs font-medium">
            {product.amountOfShops}
          </span>
          <span>
            {product.amountOfShops === 1 ? "tienda" : "tiendas"}
          </span>
        </div>
      </Link>
    </div>
  );
}

function ProductImageOrPlaceholder({
  product,
}: {
  product: HomePageCategoryProduct;
}) {
  if (!product.image) {
    return (
      <Image
        src="/no-product-found.jpg"
        alt="image product not found"
        fill
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

  return (
    <ProductImage
      src={product.image}
      fill
      alt={product.name + product.unit}
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

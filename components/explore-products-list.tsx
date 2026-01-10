"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AddListButton } from "@/components/add-list";
import { ProductImage } from "@/components/product-image";
import { ProductBrand } from "@/components/product-brand";
import { PricePerUnit } from "@/components/price-per-unit";
import { Unit } from "@/components/unit";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { toSlug } from "@/lib/utils";
import {
  type ExploreProduct,
  type ExploreProductsResponse,
} from "@/types/explore";

const MOBILE_VISIBLE_COUNT = 14;

type ExploreProductsListProps = {
  initialProducts: ExploreProduct[];
  initialPrefetch: ExploreProduct[];
  total: number;
  initialOffset: number;
  query: {
    value: string;
    shop_ids?: string;
    only_shop_products?: string;
    unit_filter?: string;
  };
};

export function ExploreProductsList({
  initialProducts,
  initialPrefetch,
  total,
  initialOffset,
  query,
}: ExploreProductsListProps) {
  const [products, setProducts] = useState(initialProducts);
  const [prefetch, setPrefetch] = useState(initialPrefetch);
  const [totalCount, setTotalCount] = useState(total);
  const [offset, setOffset] = useState(initialOffset);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const hasLoadedMoreRef = useRef(false);
  const hasAdjustedForMobileRef = useRef(false);
  const lastQueryKeyRef = useRef<string | null>(null);

  const queryKey = useMemo(
    () =>
      `${query.value}|${query.shop_ids ?? ""}|${query.only_shop_products ?? ""}|${query.unit_filter ?? ""}`,
    [query.only_shop_products, query.shop_ids, query.unit_filter, query.value]
  );

  useEffect(() => {
    if (lastQueryKeyRef.current === queryKey && lastQueryKeyRef.current !== null) {
      return;
    }

    lastQueryKeyRef.current = queryKey;
    hasLoadedMoreRef.current = false;
    hasAdjustedForMobileRef.current = false;

    const { visible, prefetch: nextPrefetch } = splitForMobile(
      initialProducts,
      initialPrefetch,
      isMobile
    );

    setProducts(visible);
    setPrefetch(nextPrefetch);
    setTotalCount(total);
    setOffset(initialOffset);
    setIsLoading(false);
    setErrorMessage(null);
  }, [initialOffset, initialPrefetch, initialProducts, isMobile, queryKey, total]);

  useEffect(() => {
    if (!isMobile || hasAdjustedForMobileRef.current || hasLoadedMoreRef.current) {
      return;
    }

    setProducts((current) => {
      if (current.length <= MOBILE_VISIBLE_COUNT) {
        hasAdjustedForMobileRef.current = true;
        return current;
      }

      const overflow = current.slice(MOBILE_VISIBLE_COUNT);
      setPrefetch((currentPrefetch) => [...overflow, ...currentPrefetch]);
      hasAdjustedForMobileRef.current = true;
      return current.slice(0, MOBILE_VISIBLE_COUNT);
    });
  }, [isMobile, queryKey]);

  const hasMore = products.length < totalCount;

  const handleShowMore = useCallback(async () => {
    if (!hasMore || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/explore-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value: query.value,
          offset,
          prefetch_ids: prefetch.map((product) => product.id),
          shop_ids: query.shop_ids,
          only_shop_products: query.only_shop_products,
          unit_filter: query.unit_filter,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as ExploreProductsResponse;
      const { visible, prefetch: nextPrefetch } = splitForMobile(
        data.products,
        data.prefetch,
        isMobile
      );

      setProducts((current) => [...current, ...visible]);
      setPrefetch(nextPrefetch);
      setTotalCount(data.total);
      setOffset(data.nextOffset);
      hasLoadedMoreRef.current = true;
    } catch (error) {
      console.error("[explore-products] Failed to load more", error);
      setErrorMessage("No se pudieron cargar más productos.");
    } finally {
      setIsLoading(false);
    }
  }, [
    hasMore,
    isLoading,
    offset,
    prefetch,
    query.only_shop_products,
    query.shop_ids,
    query.unit_filter,
    query.value,
    isMobile,
  ]);

  return (
    <>
      <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
        {products.map((product) => (
          <ExploreProductCard key={product.id} product={product} />
        ))}
      </div>
      {hasMore ? (
        <div className="flex justify-center py-4 px-4">
          <Button
            variant="secondary"
            className="w-full md:w-auto"
            onClick={handleShowMore}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner /> Cargando...
              </>
            ) : (
              "Mostrar más"
            )}
          </Button>
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

function splitForMobile(
  products: ExploreProduct[],
  prefetch: ExploreProduct[],
  isMobile: boolean
) {
  if (!isMobile || products.length <= MOBILE_VISIBLE_COUNT) {
    return { visible: products, prefetch };
  }

  const overflow = products.slice(MOBILE_VISIBLE_COUNT);
  return {
    visible: products.slice(0, MOBILE_VISIBLE_COUNT),
    prefetch: [...overflow, ...prefetch],
  };
}

function ExploreProductCard({ product }: { product: ExploreProduct }) {
  return (
    <div className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px] relative">
      <div className="absolute top-2 right-2 z-10">
        <AddListButton productId={product.id} type="icon" />
      </div>
      <Link
        href={`/product/${toSlug(product.name)}/${product.id}`}
        className="flex flex-col gap-2"
      >
        <div className="flex justify-center">
          <div className="h-[220px] w-[220px] relative">
            <ExploreImage product={product} />
          </div>
        </div>
        <Unit unit={product.unit} />
        <div>
          <ProductBrand
            brand={product.brand}
            possibleBrand={product.possibleBrand}
            type="explore"
          />
          {product.name}
        </div>
        {product.shopLogo ? (
          <Image
            src={`/supermarket-logo/${product.shopLogo}`}
            width={0}
            height={0}
            sizes="100vw"
            className="w-[50px] h-auto"
            alt="logo tienda"
            unoptimized
          />
        ) : null}
        <ProductPrice product={product} />
      </Link>
    </div>
  );
}

function ExploreImage({ product }: { product: ExploreProduct }) {
  if (!product.image) {
    return (
      <Image
        src="/no-product-found.jpg"
        alt="image product not found"
        fill
        unoptimized
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

function ProductPrice({ product }: { product: ExploreProduct }) {
  if (!product.currentPrice) {
    return null;
  }

  const numericPrice = Number(product.currentPrice);

  return (
    <div>
      <div className="font-bold text-lg pt-1">RD${product.currentPrice}</div>
      {Number.isFinite(numericPrice) ? (
        <PricePerUnit
          unit={product.unit}
          price={numericPrice}
          categoryId={product.categoryId}
          productName={product.name}
        />
      ) : null}
    </div>
  );
}

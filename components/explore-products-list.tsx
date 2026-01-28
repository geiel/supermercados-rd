"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { AddToListButton } from "@/components/add-to-list-button";
import { ProductImage } from "@/components/product-image";
import { ProductBrand } from "@/components/product-brand";
import { PricePerUnit } from "@/components/price-per-unit";
import { Unit } from "@/components/unit";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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

type ExplorePageParam = {
  offset: number;
  prefetchIds: number[];
};

export function ExploreProductsList({
  initialProducts,
  initialPrefetch,
  total,
  initialOffset,
  query,
}: ExploreProductsListProps) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const hasAdjustedForMobileRef = useRef(false);

  const queryKeyParts = useMemo(
    () =>
      [
        "explore-products",
        query.value,
        query.shop_ids ?? "",
        query.only_shop_products ?? "",
        query.unit_filter ?? "",
      ] as const,
    [query.only_shop_products, query.shop_ids, query.unit_filter, query.value]
  );

  const initialPage = useMemo(() => {
    const { visible, prefetch } = splitForMobile(
      initialProducts,
      initialPrefetch,
      isMobile
    );

    return {
      products: visible,
      prefetch,
      total,
      nextOffset: initialOffset,
    };
  }, [initialOffset, initialPrefetch, initialProducts, isMobile, total]);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeyParts,
    queryFn: async ({ pageParam }: { pageParam: ExplorePageParam; }) => {
      const response = await fetch("/api/explore-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value: query.value,
          offset: pageParam.offset,
          prefetch_ids: pageParam.prefetchIds,
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

      return {
        ...data,
        products: visible,
        prefetch: nextPrefetch,
      };
    },
    initialPageParam: { offset: 0, prefetchIds: [] },
    initialData: {
      pages: [initialPage],
      pageParams: [{ offset: 0, prefetchIds: [] }],
    },
    getNextPageParam: (lastPage, allPages) => {
      const visibleCount = allPages.reduce(
        (sum, page) => sum + page.products.length,
        0
      );

      if (visibleCount >= lastPage.total) {
        return undefined;
      }

      return {
        offset: lastPage.nextOffset,
        prefetchIds: lastPage.prefetch.map((product) => product.id),
      };
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    hasAdjustedForMobileRef.current = false;
  }, [queryKeyParts]);

  useEffect(() => {
    if (!isMobile || hasAdjustedForMobileRef.current || !data) {
      return;
    }

    if (data.pages.length > 1) {
      hasAdjustedForMobileRef.current = true;
      return;
    }

    const firstPage = data.pages[0];
    const { visible, prefetch } = splitForMobile(
      firstPage.products,
      firstPage.prefetch,
      true
    );

    if (visible.length === firstPage.products.length) {
      hasAdjustedForMobileRef.current = true;
      return;
    }

    queryClient.setQueryData(queryKeyParts, {
      ...data,
      pages: [
        { ...firstPage, products: visible, prefetch },
        ...data.pages.slice(1),
      ],
    });
    hasAdjustedForMobileRef.current = true;
  }, [data, isMobile, queryClient, queryKeyParts]);

  useEffect(() => {
    if (!isFetchNextPageError || !error) {
      return;
    }

    console.error("[explore-products] Failed to load more", error);
  }, [error, isFetchNextPageError]);

  const products = useMemo(
    () => data?.pages.flatMap((page) => page.products) ?? [],
    [data]
  );
  const totalCount =
    data && data.pages.length > 0
      ? data.pages[data.pages.length - 1].total
      : total;
  const hasMore = Boolean(hasNextPage && products.length < totalCount);
  const isEmpty = products.length === 0;

  const handleShowMore = useCallback(() => {
    if (!hasMore || isFetchingNextPage) {
      return;
    }

    void fetchNextPage();
  }, [fetchNextPage, hasMore, isFetchingNextPage]);

  return (
    <>
      {isEmpty ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageSearch />
            </EmptyMedia>
            <EmptyTitle>Productos no encontrados</EmptyTitle>
            <EmptyDescription>
              No se encontraron productos con estos filtros. Ajusta los filtros
              o intenta con otra búsqueda.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
          {products.map((product) => (
            <ExploreProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      {hasMore ? (
        <div className="flex justify-center py-4 px-4">
          <Button
            variant="secondary"
            className="w-full md:w-auto"
            onClick={handleShowMore}
            disabled={isFetchingNextPage}
            aria-busy={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Spinner /> Cargando...
              </>
            ) : (
              "Mostrar más"
            )}
          </Button>
        </div>
      ) : null}
      {isFetchNextPageError ? (
        <div className="text-center text-sm text-destructive">
          No se pudieron cargar más productos.
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
        <AddToListButton productId={product.id} variant="icon" />
      </div>
      <Link
        href={`/productos/${toSlug(product.name)}/${product.id}`}
        className="flex flex-col gap-2"
        prefetch={false}
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

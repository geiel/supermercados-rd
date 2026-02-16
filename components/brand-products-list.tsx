"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, PackageSearch } from "lucide-react";

import { AddToListButton } from "@/components/add-to-list-button";
import {
  BrandExplorerActiveFilters,
  BrandExplorerFilters,
} from "@/components/brand-explorer-filters";
import { GroupExplorerGridSkeleton } from "@/components/group-explorer-skeleton";
import { OfferBadge } from "@/components/offer-badge";
import { Price } from "@/components/price";
import { PricePerUnit } from "@/components/price-per-unit";
import { ProductBrand } from "@/components/product-brand";
import { ProductImage } from "@/components/product-image";
import { Unit } from "@/components/unit";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { toSlug } from "@/lib/utils";
import {
  BRAND_EXPLORER_DEFAULT_SORT,
  BRAND_EXPLORER_DESKTOP_PAGE_SIZE,
  BRAND_EXPLORER_MOBILE_PAGE_SIZE,
  BRAND_EXPLORER_SORT_OPTIONS,
  isBrandExplorerSort,
  type BrandExplorerProduct,
  type BrandExplorerResponse,
  type BrandExplorerSort,
} from "@/types/brand-explorer";

type BrandProductsListProps = {
  brandId: number;
  initialProducts: BrandExplorerProduct[];
  total: number;
  initialOffset: number;
};

export function BrandProductsList({
  brandId,
  initialProducts,
  total,
  initialOffset,
}: BrandProductsListProps) {
  const [products, setProducts] = useState<BrandExplorerProduct[]>(initialProducts);
  const [prefetch, setPrefetch] = useState<BrandExplorerProduct[]>([]);
  const [totalCount, setTotalCount] = useState(total);
  const [offset, setOffset] = useState(initialOffset);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sort, setSort] = useState<BrandExplorerSort>(BRAND_EXPLORER_DEFAULT_SORT);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedMoreRef = useRef(false);
  const hasAdjustedForMobileRef = useRef(false);
  const isLoadingRef = useRef(false);
  const lastListKeyRef = useRef<string | null>(null);
  const lastFilterKeyRef = useRef<string | null>(null);
  const shouldReloadForFiltersRef = useRef(false);
  const requestIdRef = useRef(0);

  const listKey = `brand:${brandId}`;
  const filterKey = useMemo(() => {
    const shopIds = searchParams.get("shop_ids") || "";
    const groupIds = searchParams.get("group_ids") || "";
    const minPrice = searchParams.get("min_price") || "";
    const maxPrice = searchParams.get("max_price") || "";
    const minDrop = searchParams.get("min_drop") || "";
    return `${shopIds}|${groupIds}|${minPrice}|${maxPrice}|${minDrop}`;
  }, [searchParams]);

  const pageSize = isMobile
    ? BRAND_EXPLORER_MOBILE_PAGE_SIZE
    : BRAND_EXPLORER_DESKTOP_PAGE_SIZE;

  const sortLabel = useMemo(() => {
    const match = BRAND_EXPLORER_SORT_OPTIONS.find((option) => option.value === sort);

    return match ? match.label : "Ordenar";
  }, [sort]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (lastListKeyRef.current === listKey && lastListKeyRef.current !== null) {
      return;
    }

    lastListKeyRef.current = listKey;
    lastFilterKeyRef.current = filterKey;
    hasLoadedMoreRef.current = false;
    hasAdjustedForMobileRef.current = false;
    isLoadingRef.current = false;
    requestIdRef.current = 0;

    setProducts(initialProducts);
    setPrefetch([]);
    setTotalCount(total);
    setOffset(initialOffset);
    setIsLoading(false);
    setErrorMessage(null);
    setSort(BRAND_EXPLORER_DEFAULT_SORT);
    setIsSortOpen(false);
  }, [filterKey, initialOffset, initialProducts, listKey, total]);

  useEffect(() => {
    if (lastFilterKeyRef.current === filterKey || lastFilterKeyRef.current === null) {
      lastFilterKeyRef.current = filterKey;
      return;
    }

    lastFilterKeyRef.current = filterKey;
    hasLoadedMoreRef.current = false;
    hasAdjustedForMobileRef.current = false;
    shouldReloadForFiltersRef.current = true;
  }, [filterKey]);

  useEffect(() => {
    if (!isMobile || hasAdjustedForMobileRef.current || hasLoadedMoreRef.current) {
      return;
    }

    setProducts((current) => {
      if (current.length <= BRAND_EXPLORER_MOBILE_PAGE_SIZE) {
        hasAdjustedForMobileRef.current = true;
        return current;
      }

      const overflow = current.slice(BRAND_EXPLORER_MOBILE_PAGE_SIZE);
      setPrefetch((currentPrefetch) => [...overflow, ...currentPrefetch]);
      hasAdjustedForMobileRef.current = true;
      return current.slice(0, BRAND_EXPLORER_MOBILE_PAGE_SIZE);
    });
  }, [isMobile, listKey]);

  const hasMore = products.length < totalCount;
  const isSorting = isLoading && products.length === 0;
  const isEmpty = products.length === 0 && !isLoading;

  const appendProducts = useCallback((incoming: BrandExplorerProduct[]) => {
    if (incoming.length === 0) {
      return;
    }

    setProducts((current) => mergeProducts(current, incoming));
  }, []);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    const shopIds = searchParams.get("shop_ids");
    const groupIds = searchParams.get("group_ids");
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const minDrop = searchParams.get("min_drop");

    if (shopIds) params.set("shop_ids", shopIds);
    if (groupIds) params.set("group_ids", groupIds);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (minDrop) params.set("min_drop", minDrop);

    return params;
  }, [searchParams]);

  const loadPageWithFilters = useCallback(
    async (
      targetOffset: number,
      targetLimit: number,
      targetSort: BrandExplorerSort
    ) => {
      const params = buildFilterParams();
      params.set("offset", String(targetOffset));
      params.set("limit", String(targetLimit));
      params.set("sort", targetSort);

      const response = await fetch(
        `/api/brands/${brandId}/products?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return (await response.json()) as BrandExplorerResponse;
    },
    [brandId, buildFilterParams]
  );

  const loadPage = useCallback(
    async (
      targetOffset: number,
      targetLimit: number,
      targetSort: BrandExplorerSort
    ) => {
      return loadPageWithFilters(targetOffset, targetLimit, targetSort);
    },
    [loadPageWithFilters]
  );

  const loadFirstPage = useCallback(
    async (targetSort: BrandExplorerSort) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      isLoadingRef.current = true;

      setIsLoading(true);
      setErrorMessage(null);
      setProducts([]);
      setPrefetch([]);
      setTotalCount(0);
      setOffset(0);
      hasLoadedMoreRef.current = false;
      hasAdjustedForMobileRef.current = false;

      try {
        const data = await loadPageWithFilters(0, pageSize, targetSort);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setProducts(data.products);
        setTotalCount(data.total);
        setOffset(data.nextOffset);
      } catch (error) {
        Sentry.logger.error("[brand-products] Failed to load products", { error });
        setErrorMessage("No se pudieron cargar mas productos.");
      } finally {
        if (requestId === requestIdRef.current) {
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [loadPageWithFilters, pageSize]
  );

  useEffect(() => {
    if (shouldReloadForFiltersRef.current) {
      shouldReloadForFiltersRef.current = false;
      void loadFirstPage(sort);
    }
  }, [loadFirstPage, sort]);

  const handleSortChange = useCallback(
    (nextSort: BrandExplorerSort) => {
      if (nextSort === sort) {
        setIsSortOpen(false);
        return;
      }

      setSort(nextSort);
      setIsSortOpen(false);
      void loadFirstPage(nextSort);
    },
    [loadFirstPage, sort]
  );

  const handleSelectChange = useCallback(
    (value: string) => {
      if (isBrandExplorerSort(value)) {
        handleSortChange(value);
      }
    },
    [handleSortChange]
  );

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      if (prefetch.length >= pageSize) {
        appendProducts(prefetch.slice(0, pageSize));
        setPrefetch(prefetch.slice(pageSize));
        hasLoadedMoreRef.current = true;
        return;
      }

      const remainingNeeded = pageSize - prefetch.length;
      const data = await loadPage(offset, remainingNeeded, sort);

      if (requestId !== requestIdRef.current) {
        return;
      }

      appendProducts([...prefetch, ...data.products]);
      setPrefetch([]);
      setTotalCount(data.total);
      setOffset(data.nextOffset);
      hasLoadedMoreRef.current = true;
    } catch (error) {
      Sentry.logger.error("[brand-products] Failed to load more", { error });
      setErrorMessage("No se pudieron cargar mas productos.");
    } finally {
      if (requestId === requestIdRef.current) {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [appendProducts, hasMore, loadPage, offset, pageSize, prefetch, sort]);

  useEffect(() => {
    if (!hasMounted || !sentinelRef.current || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void handleLoadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [handleLoadMore, hasMore, hasMounted]);

  return (
    <>
      <div className="flex items-center gap-2 pb-2 lg:hidden">
        <div className="flex-1">
          <BrandExplorerFilters brandId={brandId} variant="mobile" />
        </div>
        <Drawer open={isSortOpen} onOpenChange={setIsSortOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              className="flex-1"
              disabled={isSorting}
              aria-busy={isSorting}
            >
              {isSorting ? (
                <>
                  <Spinner /> Ordenar
                </>
              ) : (
                <>
                  {sortLabel} <ChevronDown />
                </>
              )}
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Ordenar productos</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <RadioGroup value={sort} onValueChange={handleSelectChange}>
                {BRAND_EXPLORER_SORT_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3 py-2 cursor-pointer"
                    onClick={() => handleSortChange(option.value)}
                  >
                    <RadioGroupItem
                      value={option.value}
                      disabled={isSorting}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <span className="text-sm font-medium leading-none flex-1">
                      {option.label}
                    </span>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Cerrar</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
      <div className="hidden lg:flex items-start gap-4 pb-2">
        <div className="flex-1">
          <BrandExplorerActiveFilters brandId={brandId} />
        </div>
        <Select value={sort} onValueChange={handleSelectChange}>
          <SelectTrigger
            size="sm"
            className="w-full md:w-[220px]"
            disabled={isSorting}
            aria-busy={isSorting}
          >
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent align="end">
            {BRAND_EXPLORER_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {products.length === 0 && isLoading ? (
        <GroupExplorerGridSkeleton count={pageSize} />
      ) : isEmpty ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageSearch />
            </EmptyMedia>
            <EmptyTitle>Productos no encontrados</EmptyTitle>
            <EmptyDescription>
              No hay productos con estos filtros. Ajusta los filtros para ver mas
              resultados.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <BrandProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
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
        <div className="text-center text-sm text-destructive">{errorMessage}</div>
      ) : null}
    </>
  );
}

function mergeProducts(
  current: BrandExplorerProduct[],
  incoming: BrandExplorerProduct[]
) {
  const seen = new Set<number>();
  const merged: BrandExplorerProduct[] = [];

  for (const product of [...current, ...incoming]) {
    if (seen.has(product.id)) {
      continue;
    }

    seen.add(product.id);
    merged.push(product);
  }

  return merged;
}

function BrandProductCard({ product }: { product: BrandExplorerProduct }) {
  const dropPercentage = product.productDeal?.dropPercentage;
  const shouldShowDeal =
    dropPercentage !== null &&
    dropPercentage !== undefined &&
    Number(dropPercentage) > 0;

  return (
    <div className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px] relative">
      {shouldShowDeal ? (
        <div className="absolute top-2 left-2 z-10">
          <OfferBadge dropPercentage={dropPercentage} />
        </div>
      ) : null}
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
            <BrandProductImage product={product} />
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
        <div>
          <Price value={product.currentPrice} className="font-bold text-lg pt-1" />
          <PricePerUnit
            unit={product.unit}
            price={Number(product.currentPrice)}
            categoryId={product.categoryId}
            productName={product.name}
          />
        </div>
      </Link>
    </div>
  );
}

function BrandProductImage({ product }: { product: BrandExplorerProduct }) {
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
      productId={product.id}
      fill
      alt={product.name + " " + product.unit}
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

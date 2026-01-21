"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { AddToListButton } from "@/components/add-to-list-button";
import { GroupExplorerGridSkeleton } from "@/components/group-explorer-skeleton";
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
  GROUP_EXPLORER_DEFAULT_SORT,
  GROUP_EXPLORER_DESKTOP_PAGE_SIZE,
  GROUP_EXPLORER_MOBILE_PAGE_SIZE,
  GROUP_EXPLORER_SORT_OPTIONS,
  isGroupExplorerSort,
  type GroupExplorerProduct,
  type GroupExplorerResponse,
  type GroupExplorerSort,
} from "@/types/group-explorer";

type GroupExplorerListProps = {
  humanId: string;
  initialProducts: GroupExplorerProduct[];
  total: number;
  initialOffset: number;
};

export function GroupExplorerList({
  humanId,
  initialProducts,
  total,
  initialOffset,
}: GroupExplorerListProps) {
  const [products, setProducts] = useState<GroupExplorerProduct[]>(
    initialProducts
  );
  const [prefetch, setPrefetch] = useState<GroupExplorerProduct[]>([]);
  const [totalCount, setTotalCount] = useState(total);
  const [offset, setOffset] = useState(initialOffset);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sort, setSort] = useState<GroupExplorerSort>(
    GROUP_EXPLORER_DEFAULT_SORT
  );
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const isMobile = useIsMobile();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedMoreRef = useRef(false);
  const hasAdjustedForMobileRef = useRef(false);
  const isLoadingRef = useRef(false);
  const lastGroupKeyRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const groupKey = humanId;
  const pageSize = isMobile
    ? GROUP_EXPLORER_MOBILE_PAGE_SIZE
    : GROUP_EXPLORER_DESKTOP_PAGE_SIZE;
  const sortLabel = useMemo(() => {
    const match = GROUP_EXPLORER_SORT_OPTIONS.find(
      (option) => option.value === sort
    );

    return match ? match.label : "Ordenar";
  }, [sort]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (lastGroupKeyRef.current === groupKey && lastGroupKeyRef.current !== null) {
      return;
    }

    lastGroupKeyRef.current = groupKey;
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
    setSort(GROUP_EXPLORER_DEFAULT_SORT);
    setIsSortOpen(false);
  }, [groupKey, initialOffset, initialProducts, total]);

  useEffect(() => {
    if (!isMobile || hasAdjustedForMobileRef.current || hasLoadedMoreRef.current) {
      return;
    }

    setProducts((current) => {
      if (current.length <= GROUP_EXPLORER_MOBILE_PAGE_SIZE) {
        hasAdjustedForMobileRef.current = true;
        return current;
      }

      const overflow = current.slice(GROUP_EXPLORER_MOBILE_PAGE_SIZE);
      setPrefetch((currentPrefetch) => [...overflow, ...currentPrefetch]);
      hasAdjustedForMobileRef.current = true;
      return current.slice(0, GROUP_EXPLORER_MOBILE_PAGE_SIZE);
    });
  }, [groupKey, isMobile]);

  const hasMore = products.length < totalCount;
  const isSorting = isLoading && products.length === 0;

  const appendProducts = useCallback((incoming: GroupExplorerProduct[]) => {
    if (incoming.length === 0) {
      return;
    }

    setProducts((current) => mergeProducts(current, incoming));
  }, []);

  const loadPage = useCallback(
    async (
      targetOffset: number,
      targetLimit: number,
      targetSort: GroupExplorerSort
    ) => {
      const response = await fetch(
        `/api/groups/${encodeURIComponent(
          humanId
        )}/products?offset=${targetOffset}&limit=${targetLimit}&sort=${targetSort}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return (await response.json()) as GroupExplorerResponse;
    },
    [humanId]
  );

  const loadFirstPage = useCallback(
    async (targetSort: GroupExplorerSort) => {
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
        const data = await loadPage(0, pageSize, targetSort);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setProducts(data.products);
        setTotalCount(data.total);
        setOffset(data.nextOffset);
      } catch (error) {
        console.error("[group-explorer] Failed to load products", error);
        setErrorMessage("No se pudieron cargar mas productos.");
      } finally {
        if (requestId === requestIdRef.current) {
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [loadPage, pageSize]
  );

  const handleSortChange = useCallback(
    (nextSort: GroupExplorerSort) => {
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
      if (isGroupExplorerSort(value)) {
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
      console.error("[group-explorer] Failed to load more", error);
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
      <div className="flex items-center justify-end pb-2">
        {isMobile ? (
          <Drawer open={isSortOpen} onOpenChange={setIsSortOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                className="w-full"
                disabled={isSorting}
                aria-busy={isSorting}
              >
                {isSorting ? (
                  <>
                    <Spinner /> Ordenar
                  </>
                ) : (
                  <>
                    Ordenar: {sortLabel} <ChevronDown />
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
                  {GROUP_EXPLORER_SORT_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-3 py-2 cursor-pointer"
                      onClick={() => handleSortChange(option.value)}
                    >
                      <RadioGroupItem
                        value={option.value}
                        disabled={isSorting}
                        onClick={(e) => e.stopPropagation()}
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
        ) : (
          <Select value={sort} onValueChange={handleSelectChange}>
            <SelectTrigger
              size="sm"
              className="w-full md:w-[200px]"
              disabled={isSorting}
              aria-busy={isSorting}
            >
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent align="end">
              {GROUP_EXPLORER_SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {products.length === 0 && isLoading ? (
        <GroupExplorerGridSkeleton count={pageSize} />
      ) : (
        <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
          {products.map((product) => (
            <GroupExplorerCard key={product.id} product={product} />
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
        <div className="text-center text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}
    </>
  );
}

function mergeProducts(
  current: GroupExplorerProduct[],
  incoming: GroupExplorerProduct[]
) {
  const seen = new Set<number>();
  const merged: GroupExplorerProduct[] = [];

  for (const product of [...current, ...incoming]) {
    if (seen.has(product.id)) {
      continue;
    }

    seen.add(product.id);
    merged.push(product);
  }

  return merged;
}

function GroupExplorerCard({ product }: { product: GroupExplorerProduct }) {
  return (
    <div className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px] relative">
      <div className="absolute top-2 right-2 z-10">
        <AddToListButton productId={product.id} variant="icon" />
      </div>
      <Link
        href={`/product/${toSlug(product.name)}/${product.id}`}
        className="flex flex-col gap-2"
        prefetch={false}
      >
        <div className="flex justify-center">
          <div className="h-[220px] w-[220px] relative">
            <GroupExplorerImage product={product} />
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
          <div className="font-bold text-lg pt-1">RD${product.currentPrice}</div>
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

function GroupExplorerImage({ product }: { product: GroupExplorerProduct }) {
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

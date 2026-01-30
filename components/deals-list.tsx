"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgePercent, ChevronDown } from "lucide-react";

import { AddToListButton } from "@/components/add-to-list-button";
import { DealsActiveFilters, DealsFilters } from "@/components/deals-filters";
import { PricePerUnit } from "@/components/price-per-unit";
import { ProductImage } from "@/components/product-image";
import { Unit } from "@/components/unit";
import { Badge } from "@/components/ui/badge";
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
import { formatDropPercentage, toSlug } from "@/lib/utils";
import {
  DEALS_DEFAULT_SORT,
  DEALS_DESKTOP_PAGE_SIZE,
  DEALS_MOBILE_PAGE_SIZE,
  DEALS_SORT_OPTIONS,
  type DealItem,
  type DealsResponse,
  type DealsSort,
  isDealsSort,
} from "@/types/deals";

const SUPERMARKET_BRAND_NAMES = ["Bravo", "Jumbo Market", "Sirena", "Plaza Lama"];

type DealsListProps = {
  shopId?: number;
  initialDeals: DealItem[];
  total: number;
  initialOffset: number;
};

export function DealsList({
  shopId,
  initialDeals,
  total,
  initialOffset,
}: DealsListProps) {
  const [deals, setDeals] = useState<DealItem[]>(initialDeals);
  const [prefetch, setPrefetch] = useState<DealItem[]>([]);
  const [totalCount, setTotalCount] = useState(total);
  const [offset, setOffset] = useState(initialOffset);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sort, setSort] = useState<DealsSort>(DEALS_DEFAULT_SORT);
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

  const listKey = typeof shopId === "number" ? `shop:${shopId}` : "all";
  const filterKey = useMemo(() => {
    const shopIds = searchParams.get("shop_ids") || "";
    const shopIdParam = searchParams.get("shop_id") || "";
    const groupIds = searchParams.get("group_ids") || "";
    const minPrice = searchParams.get("min_price") || "";
    const maxPrice = searchParams.get("max_price") || "";
    const minDrop = searchParams.get("min_drop") || "";
    const shopKey = shopIds || shopIdParam;
    return `${shopKey}|${groupIds}|${minPrice}|${maxPrice}|${minDrop}`;
  }, [searchParams]);
  const pageSize = isMobile ? DEALS_MOBILE_PAGE_SIZE : DEALS_DESKTOP_PAGE_SIZE;
  const sortLabel = useMemo(() => {
    const match = DEALS_SORT_OPTIONS.find((option) => option.value === sort);

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

    setDeals(initialDeals);
    setPrefetch([]);
    setTotalCount(total);
    setOffset(initialOffset);
    setIsLoading(false);
    setErrorMessage(null);
    setSort(DEALS_DEFAULT_SORT);
    setIsSortOpen(false);
  }, [filterKey, initialDeals, initialOffset, listKey, total]);

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

    setDeals((current) => {
      if (current.length <= DEALS_MOBILE_PAGE_SIZE) {
        hasAdjustedForMobileRef.current = true;
        return current;
      }

      const overflow = current.slice(DEALS_MOBILE_PAGE_SIZE);
      setPrefetch((currentPrefetch) => [...overflow, ...currentPrefetch]);
      hasAdjustedForMobileRef.current = true;
      return current.slice(0, DEALS_MOBILE_PAGE_SIZE);
    });
  }, [isMobile, listKey]);

  const hasMore = deals.length < totalCount;
  const isSorting = isLoading && deals.length === 0;
  const isEmpty = deals.length === 0 && !isLoading;

  const appendDeals = useCallback((incoming: DealItem[]) => {
    if (incoming.length === 0) {
      return;
    }

    setDeals((current) => mergeDeals(current, incoming));
  }, []);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    const shopIds = searchParams.get("shop_ids");
    const shopIdParam = searchParams.get("shop_id");
    const groupIds = searchParams.get("group_ids");
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const minDrop = searchParams.get("min_drop");

    if (shopIds) {
      params.set("shop_ids", shopIds);
    } else if (shopIdParam) {
      params.set("shop_id", shopIdParam);
    }

    if (groupIds) params.set("group_ids", groupIds);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (minDrop) params.set("min_drop", minDrop);

    return params;
  }, [searchParams]);

  const loadPageWithFilters = useCallback(
    async (targetOffset: number, targetLimit: number, targetSort: DealsSort) => {
      const params = buildFilterParams();
      params.set("offset", String(targetOffset));
      params.set("limit", String(targetLimit));
      params.set("sort", targetSort);

      const response = await fetch(`/api/deals?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return (await response.json()) as DealsResponse;
    },
    [buildFilterParams]
  );

  const loadPage = useCallback(
    async (targetOffset: number, targetLimit: number, targetSort: DealsSort) => {
      return loadPageWithFilters(targetOffset, targetLimit, targetSort);
    },
    [loadPageWithFilters]
  );

  const loadFirstPage = useCallback(
    async (targetSort: DealsSort) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      isLoadingRef.current = true;

      setIsLoading(true);
      setErrorMessage(null);
      setDeals([]);
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

        setDeals(data.deals);
        setTotalCount(data.total);
        setOffset(data.nextOffset);
      } catch (error) {
        console.error("[deals] Failed to load deals", error);
        setErrorMessage("No se pudieron cargar mas ofertas.");
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
    (nextSort: DealsSort) => {
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
      if (isDealsSort(value)) {
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
        appendDeals(prefetch.slice(0, pageSize));
        setPrefetch(prefetch.slice(pageSize));
        hasLoadedMoreRef.current = true;
        return;
      }

      const remainingNeeded = pageSize - prefetch.length;
      const data = await loadPage(offset, remainingNeeded, sort);

      if (requestId !== requestIdRef.current) {
        return;
      }

      appendDeals([...prefetch, ...data.deals]);
      setPrefetch([]);
      setTotalCount(data.total);
      setOffset(data.nextOffset);
      hasLoadedMoreRef.current = true;
    } catch (error) {
      console.error("[deals] Failed to load more deals", error);
      setErrorMessage("No se pudieron cargar mas ofertas.");
    } finally {
      if (requestId === requestIdRef.current) {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [appendDeals, hasMore, loadPage, offset, pageSize, prefetch, sort]);

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
          <DealsFilters variant="mobile" />
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
              <DrawerTitle>Ordenar ofertas</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <RadioGroup value={sort} onValueChange={handleSelectChange}>
                {DEALS_SORT_OPTIONS.map((option) => (
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
      </div>
      <div className="hidden lg:flex items-start gap-4 pb-2">
        <div className="flex-1">
          <DealsActiveFilters />
        </div>
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
            {DEALS_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {deals.length === 0 && isLoading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Spinner /> Cargando...
        </div>
      ) : isEmpty ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BadgePercent />
            </EmptyMedia>
            <EmptyTitle>No hay ofertas con estos filtros</EmptyTitle>
            <EmptyDescription>
              Prueba ajustar los filtros para ver mas resultados.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-4">
          {deals.map((deal) => (
            <DealCard key={deal.productId} deal={deal} />
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

function mergeDeals(current: DealItem[], incoming: DealItem[]) {
  const seen = new Set<number>();
  const merged: DealItem[] = [];

  for (const deal of [...current, ...incoming]) {
    if (seen.has(deal.productId)) {
      continue;
    }

    seen.add(deal.productId);
    merged.push(deal);
  }

  return merged;
}

function DealCard({ deal }: { deal: DealItem }) {
  return (
    <div className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px] relative">
      <div className="absolute top-2 left-2 z-10">
        <Badge variant="destructive">
          -{formatDropPercentage(deal.dropPercentage)}%
        </Badge>
      </div>
      <div className="absolute top-2 right-2 z-10">
        <AddToListButton productId={deal.productId} variant="icon" />
      </div>
      <Link
        href={`/productos/${toSlug(deal.name)}/${deal.productId}`}
        className="flex flex-col gap-2"
        prefetch={false}
      >
        <div className="flex justify-center">
          <div className="h-[220px] w-[220px] relative">
            <DealImage deal={deal} />
          </div>
        </div>
        <Unit unit={deal.unit} />
        <div>
          <BrandName name={deal.brandName} possibleName={deal.possibleBrandName} />
          {deal.name}
        </div>
        <DealPrice deal={deal} />
      </Link>
    </div>
  );
}

function DealImage({ deal }: { deal: DealItem }) {
  if (!deal.image) {
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
      src={deal.image}
      productId={deal.productId}
      fill
      alt={deal.name + deal.unit}
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

function DealPrice({ deal }: { deal: DealItem }) {
  const numericPrice = Number(deal.priceToday);

  return (
    <div>
      <div className="font-bold text-lg pt-1">RD${deal.priceToday}</div>
      {Number.isFinite(numericPrice) && deal.product ? (
        <PricePerUnit
          unit={deal.unit}
          price={numericPrice}
          categoryId={deal.product.categoryId}
          productName={deal.name}
        />
      ) : null}
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

"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Filter, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import {
  DEALS_DISCOUNT_OPTIONS,
  type DealsGroupOption,
  type DealsDiscountOption,
  type DealsPriceStatsResponse,
  type DealsShopOption,
} from "@/types/deals";
import { normalizeTerm } from "./autocomplete";
import { PriceFilterSection } from "@/components/price-filter-section";

type DealsFiltersProps = {
  variant?: "auto" | "mobile" | "desktop";
};

export function DealsFilters({ variant = "auto" }: DealsFiltersProps) {
  if (variant === "mobile") {
    return <MobileFilters />;
  }

  if (variant === "desktop") {
    return <DesktopFilters />;
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileFilters />
      </div>
      <DesktopFilters />
    </>
  );
}

export function DealsActiveFilters({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentShopIds = useMemo(
    () => getShopIdsFromSearchParams(searchParams),
    [searchParams]
  );
  const currentGroupIds = useMemo(
    () => parseCommaSeparatedInts(searchParams.get("group_ids")),
    [searchParams]
  );
  const currentMinPrice = useMemo(
    () => parsePriceParam(searchParams.get("min_price"), { allowZero: true }),
    [searchParams]
  );
  const currentMaxPrice = useMemo(
    () => parsePriceParam(searchParams.get("max_price")),
    [searchParams]
  );
  const currentMinDrop = useMemo(
    () => parseMinDropParam(searchParams.get("min_drop")),
    [searchParams]
  );

  const shouldFetchShops = currentShopIds.length > 0;
  const shouldFetchGroups = currentGroupIds.length > 0;

  const { data: shops } = useQuery<DealsShopOption[]>({
    queryKey: ["deals-shops", "active"],
    queryFn: async () => {
      const res = await fetch("/api/deals/shops");
      if (!res.ok) throw new Error("Failed to fetch shops");
      return res.json();
    },
    enabled: shouldFetchShops,
    staleTime: 60000,
  });

  const { data: groups } = useQuery<DealsGroupOption[]>({
    queryKey: ["deals-groups", "active"],
    queryFn: async () => {
      const res = await fetch("/api/deals/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
    enabled: shouldFetchGroups,
    staleTime: 60000,
  });

  const shopsById = useMemo(() => {
    const map = new Map<number, string>();
    shops?.forEach((shop) => map.set(shop.id, shop.name));
    return map;
  }, [shops]);

  const groupsById = useMemo(() => {
    const map = new Map<number, string>();
    groups?.forEach((group) => map.set(group.id, group.name));
    return map;
  }, [groups]);

  const discountLabel = useMemo(() => {
    if (!currentMinDrop) return null;
    const match = DEALS_DISCOUNT_OPTIONS.find(
      (option) => option.value === currentMinDrop
    );
    return match ? match.label : `${currentMinDrop}% o mas`;
  }, [currentMinDrop]);

  const formatPrice = useCallback((value: number) => {
    return `RD$${value.toLocaleString()}`;
  }, []);

  const priceLabel = useMemo(() => {
    if (currentMinPrice !== null && currentMaxPrice !== null) {
      return `Precio: ${formatPrice(currentMinPrice)} - ${formatPrice(
        currentMaxPrice
      )}`;
    }
    if (currentMinPrice !== null) {
      return `Precio: desde ${formatPrice(currentMinPrice)}`;
    }
    if (currentMaxPrice !== null) {
      return `Precio: hasta ${formatPrice(currentMaxPrice)}`;
    }
    return null;
  }, [currentMaxPrice, currentMinPrice, formatPrice]);

  const pushParams = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [pathname, router, startTransition]
  );

  const handleRemoveShop = useCallback(
    (shopId: number) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextIds = currentShopIds.filter((id) => id !== shopId);

      params.delete("shop_id");
      if (nextIds.length > 0) {
        params.set("shop_ids", nextIds.join(","));
      } else {
        params.delete("shop_ids");
      }

      pushParams(params);
    },
    [currentShopIds, pushParams, searchParams]
  );

  const handleRemoveGroup = useCallback(
    (groupId: number) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextIds = currentGroupIds.filter((id) => id !== groupId);

      if (nextIds.length > 0) {
        params.set("group_ids", nextIds.join(","));
      } else {
        params.delete("group_ids");
      }

      pushParams(params);
    },
    [currentGroupIds, pushParams, searchParams]
  );

  const handleRemovePrice = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("min_price");
    params.delete("max_price");
    pushParams(params);
  }, [pushParams, searchParams]);

  const handleRemoveDiscount = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("min_drop");
    pushParams(params);
  }, [pushParams, searchParams]);

  const hasActiveFilters =
    currentShopIds.length > 0 ||
    currentGroupIds.length > 0 ||
    priceLabel !== null ||
    discountLabel !== null;

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {currentShopIds.map((shopId) => (
        <button
          key={`shop-${shopId}`}
          type="button"
          onClick={() => handleRemoveShop(shopId)}
          className="group flex items-center gap-2 rounded-full border border-muted-foreground/30 bg-muted/40 px-3 py-1 text-sm transition-colors hover:bg-muted-foreground/10"
          aria-label={`Quitar tienda ${shopsById.get(shopId) ?? shopId} del filtro`}
        >
          <span className="max-w-[200px] truncate text-left">
            {shopsById.get(shopId) ?? `Tienda ${shopId}`}
          </span>
          <X className="h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
        </button>
      ))}
      {currentGroupIds.map((groupId) => (
        <button
          key={`group-${groupId}`}
          type="button"
          onClick={() => handleRemoveGroup(groupId)}
          className="group flex items-center gap-2 rounded-full border border-muted-foreground/30 bg-muted/40 px-3 py-1 text-sm transition-colors hover:bg-muted-foreground/10"
          aria-label={`Quitar categoria ${groupsById.get(groupId) ?? groupId} del filtro`}
        >
          <span className="max-w-[200px] truncate text-left">
            {groupsById.get(groupId) ?? `Categoria ${groupId}`}
          </span>
          <X className="h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
        </button>
      ))}
      {discountLabel ? (
        <button
          type="button"
          onClick={handleRemoveDiscount}
          className="group flex items-center gap-2 rounded-full border border-muted-foreground/30 bg-muted/40 px-3 py-1 text-sm transition-colors hover:bg-muted-foreground/10"
          aria-label="Quitar filtro de descuento"
        >
          <span className="max-w-[240px] truncate text-left">
            {discountLabel}
          </span>
          <X className="h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
        </button>
      ) : null}
      {priceLabel ? (
        <button
          type="button"
          onClick={handleRemovePrice}
          className="group flex items-center gap-2 rounded-full border border-muted-foreground/30 bg-muted/40 px-3 py-1 text-sm transition-colors hover:bg-muted-foreground/10"
          aria-label="Quitar filtro de precio"
        >
          <span className="max-w-[240px] truncate text-left">{priceLabel}</span>
          <X className="h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
        </button>
      ) : null}
    </div>
  );
}

function MobileFilters() {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const activeFiltersCount = countActiveFilters(searchParams);

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen} repositionInputs={false}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-full">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex flex-row items-center justify-between border-b pb-4">
          <DrawerTitle>Filtros</DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <DealsActiveFilters className="px-4 pt-3" />
        <div className="p-4 max-h-[calc(100vh-10rem)] overflow-y-auto">
          <FilterSections />
        </div>
        <FilterFooter onClose={() => setIsOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}

function DesktopFilters() {
  return (
    <aside className="w-[280px] shrink-0 hidden lg:block">
      <div className="sticky top-4">
        <ScrollArea className="h-[calc(100vh-6rem)]">
          <FilterSections />
        </ScrollArea>
      </div>
    </aside>
  );
}

function FilterSections() {
  return (
    <div className="space-y-6 py-4 md:pr-4">
      <DiscountFilterSection />
      <DealsPriceFilterSection />
      <CategoryFilterSection />
      <ShopsFilterSection />
    </div>
  );
}

function FilterFooter({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleClearFilters = useCallback(() => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }, [pathname, router, startTransition]);

  const hasFilters = countActiveFilters(searchParams) > 0;

  return (
    <DrawerFooter className="flex-row gap-2 border-t pt-4">
      <Button
        variant="outline"
        className="flex-1"
        onClick={handleClearFilters}
        disabled={!hasFilters || isPending}
      >
        Limpiar filtros
      </Button>
      <Button className="flex-1" onClick={onClose}>
        {isPending ? <Spinner className="mr-2" /> : null}
        Mostrar todos
      </Button>
    </DrawerFooter>
  );
}

// ============ Discount Filter Section ============

function DiscountFilterSection() {
  const [isExpanded, setIsExpanded] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const currentMinDrop = useMemo(
    () => parseMinDropParam(searchParams.get("min_drop")),
    [searchParams]
  );

  const discountsParams = useMemo(
    () =>
      buildFilterParams(searchParams, [
        "shop_ids",
        "group_ids",
        "min_price",
        "max_price",
      ]),
    [searchParams]
  );

  const { data: discounts, isLoading } = useQuery<DealsDiscountOption[]>({
    queryKey: ["deals-discounts", discountsParams],
    queryFn: async () => {
      const url = discountsParams
        ? `/api/deals/discounts?${discountsParams}`
        : "/api/deals/discounts";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch discounts");
      return res.json();
    },
    staleTime: 60000,
  });

  const discountOptions = discounts ?? DEALS_DISCOUNT_OPTIONS.map((option) => ({
    ...option,
    count: 0,
  }));

  const updateDiscount = useCallback(
    (value: number | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value !== null) {
        params.set("min_drop", String(value));
      } else {
        params.delete("min_drop");
      }

      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  return (
    <FilterSection
      title="Descuento"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      badge={currentMinDrop ? 1 : 0}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      ) : discountOptions.length > 0 ? (
        <RadioGroup value={currentMinDrop ? String(currentMinDrop) : ""} className="space-y-2">
          {discountOptions.map((option) => {
            const isSelected = currentMinDrop === option.value;
            const isDisabled = option.count === 0 && !isSelected;

            return (
              <div
                key={option.value}
                className={cn(
                  "flex items-center justify-between cursor-pointer",
                  isDisabled ? "cursor-not-allowed opacity-60" : ""
                )}
                onClick={() => {
                  if (isDisabled) {
                    return;
                  }
                  if (isSelected) {
                    updateDiscount(null);
                  } else {
                    updateDiscount(option.value);
                  }
                }}
                aria-disabled={isDisabled}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value={String(option.value)}
                    disabled={isPending || isDisabled}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-sm">{option.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {option.count}
                </span>
              </div>
            );
          })}
        </RadioGroup>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay descuentos disponibles
        </p>
      )}
    </FilterSection>
  );
}

// ============ Price Filter Section ============

function DealsPriceFilterSection() {
  const [isExpanded, setIsExpanded] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const currentMinPrice = searchParams.get("min_price");
  const currentMaxPrice = searchParams.get("max_price");

  const priceStatsParams = useMemo(
    () => buildFilterParams(searchParams, ["shop_ids", "group_ids", "min_drop"]),
    [searchParams]
  );

  const { data: priceStats, isLoading } = useQuery<DealsPriceStatsResponse>({
    queryKey: ["deals-price-stats", priceStatsParams],
    queryFn: async () => {
      const url = priceStatsParams
        ? `/api/deals/price-stats?${priceStatsParams}`
        : "/api/deals/price-stats";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch price stats");
      return res.json();
    },
    staleTime: 60000,
  });

  const updatePriceRange = useCallback(
    (min: number | null, max: number | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (min !== null && min >= 0) {
        params.set("min_price", String(min));
      } else {
        params.delete("min_price");
      }

      if (max !== null && max > 0) {
        params.set("max_price", String(max));
      } else {
        params.delete("max_price");
      }

      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  return (
    <PriceFilterSection
      title="Precio"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      priceStats={priceStats}
      isLoading={isLoading}
      isPending={isPending}
      currentMinPrice={currentMinPrice}
      currentMaxPrice={currentMaxPrice}
      onRangeChange={updatePriceRange}
      allowZeroMin
    />
  );
}

// ============ Category Filter Section ============

const CATEGORY_PREVIEW_COUNT = 6;

function CategoryFilterSection() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const currentGroupIds = useMemo(() => {
    return new Set(parseCommaSeparatedInts(searchParams.get("group_ids")));
  }, [searchParams]);

  const categoriesParams = useMemo(
    () =>
      buildFilterParams(searchParams, [
        "shop_ids",
        "min_price",
        "max_price",
        "min_drop",
      ]),
    [searchParams]
  );

  const { data: categories, isLoading } = useQuery<DealsGroupOption[]>({
    queryKey: ["deals-groups", categoriesParams],
    queryFn: async () => {
      const url = categoriesParams
        ? `/api/deals/categories?${categoriesParams}`
        : "/api/deals/categories";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
    staleTime: 60000,
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!normalizedQuery) return categories;
    return categories.filter((group) => {
      const cleanName = normalizeTerm(group.name);
      const cleanQuery = normalizeTerm(normalizedQuery);
      return cleanName.toLowerCase().includes(cleanQuery);
    });
  }, [categories, normalizedQuery]);

  const displayedCategories = useMemo(() => {
    if (normalizedQuery) {
      return filteredCategories;
    }
    return showAll
      ? filteredCategories
      : filteredCategories.slice(0, CATEGORY_PREVIEW_COUNT);
  }, [filteredCategories, normalizedQuery, showAll]);

  const hasMore =
    !normalizedQuery && filteredCategories.length > CATEGORY_PREVIEW_COUNT;

  const toggleGroup = useCallback(
    (groupId: number, checked: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextIds = new Set(currentGroupIds);

      if (checked) {
        nextIds.add(groupId);
      } else {
        nextIds.delete(groupId);
      }

      if (nextIds.size > 0) {
        params.set("group_ids", Array.from(nextIds).join(","));
      } else {
        params.delete("group_ids");
      }

      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [currentGroupIds, pathname, router, searchParams, startTransition]
  );

  return (
    <FilterSection
      title="Categoria"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      badge={currentGroupIds.size}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar categoria"
              className="pl-9"
            />
          </div>
          <div className="space-y-2">
            {displayedCategories.map((category) => {
              const isSelected = currentGroupIds.has(category.id);
              const isDisabled = category.count === 0 && !isSelected;

              return (
                <div
                  key={category.id}
                  className={cn(
                    "flex items-center justify-between py-1",
                    isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  )}
                  onClick={() => {
                    if (isDisabled) {
                      return;
                    }
                    toggleGroup(category.id, !isSelected);
                  }}
                  aria-disabled={isDisabled}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isSelected}
                      disabled={isPending || isDisabled}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {category.count}
                  </span>
                </div>
              );
            })}
            {hasMore && (
              <button
                className="text-sm text-primary hover:underline"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll
                  ? "Ver menos"
                  : `Ver todas (${filteredCategories.length})`}
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay categorias disponibles
        </p>
      )}
    </FilterSection>
  );
}

// ============ Shops Filter Section ============

function ShopsFilterSection() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const currentShopIds = useMemo(
    () => new Set(getShopIdsFromSearchParams(searchParams)),
    [searchParams]
  );

  const shopsParams = useMemo(
    () =>
      buildFilterParams(searchParams, [
        "group_ids",
        "min_price",
        "max_price",
        "min_drop",
      ]),
    [searchParams]
  );

  const { data: shops, isLoading } = useQuery<DealsShopOption[]>({
    queryKey: ["deals-shops", shopsParams],
    queryFn: async () => {
      const url = shopsParams ? `/api/deals/shops?${shopsParams}` : "/api/deals/shops";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch shops");
      return res.json();
    },
    staleTime: 60000,
  });

  const toggleShop = useCallback(
    (shopId: number, checked: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextIds = new Set(currentShopIds);

      if (checked) {
        nextIds.add(shopId);
      } else {
        nextIds.delete(shopId);
      }

      params.delete("shop_id");
      if (nextIds.size > 0) {
        params.set("shop_ids", Array.from(nextIds).join(","));
      } else {
        params.delete("shop_ids");
      }

      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [currentShopIds, pathname, router, searchParams, startTransition]
  );

  const displayedShops = showAll ? shops : shops?.slice(0, 5);
  const hasMore = shops && shops.length > 5;

  return (
    <FilterSection
      title="Supermercados"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      badge={currentShopIds.size}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      ) : shops && shops.length > 0 ? (
        <div className="space-y-2">
          {displayedShops?.map((shop) => {
            const isSelected = currentShopIds.has(shop.id);
            const isDisabled = shop.count === 0 && !isSelected;

            return (
              <div
                key={shop.id}
                className={cn(
                  "flex items-center justify-between py-1",
                  isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                )}
                onClick={() => {
                  if (isDisabled) {
                    return;
                  }
                  toggleShop(shop.id, !isSelected);
                }}
                aria-disabled={isDisabled}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isSelected}
                    disabled={isPending || isDisabled}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-sm">{shop.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {shop.count}
                </span>
              </div>
            );
          })}
          {hasMore && (
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Ver menos" : "Ver mas"}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay supermercados disponibles
        </p>
      )}
    </FilterSection>
  );
}

// ============ Shared Components ============

function FilterSection({
  title,
  isExpanded,
  onToggle,
  badge,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b pb-4">
      <button
        className="flex items-center justify-between w-full py-2"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isExpanded ? "rotate-180" : ""
          )}
        />
      </button>
      {isExpanded && <div className="pt-2">{children}</div>}
    </div>
  );
}

// ============ Utilities ============

function parseCommaSeparatedInts(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => parseInt(v.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parsePriceParam(value: string | null, { allowZero = false } = {}) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (allowZero) return parsed >= 0 ? parsed : null;
  return parsed > 0 ? parsed : null;
}

function parseMinDropParam(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 0 ? parsed : null;
}

function parseSingleInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 0 ? parsed : null;
}

function getShopIdsFromSearchParams(searchParams: URLSearchParams): number[] {
  const ids = new Set<number>();
  parseCommaSeparatedInts(searchParams.get("shop_ids")).forEach((id) => ids.add(id));
  const singleId = parseSingleInt(searchParams.get("shop_id"));
  if (typeof singleId === "number") {
    ids.add(singleId);
  }
  return Array.from(ids);
}

function buildFilterParams(
  searchParams: URLSearchParams,
  keys: Array<"shop_ids" | "group_ids" | "min_price" | "max_price" | "min_drop">
): string {
  const params = new URLSearchParams();

  keys.forEach((key) => {
    if (key === "shop_ids") {
      const shopIds = getShopIdsFromSearchParams(searchParams);
      if (shopIds.length > 0) {
        params.set("shop_ids", shopIds.join(","));
      }
      return;
    }

    const value = searchParams.get(key);
    if (value) {
      params.set(key, value);
    }
  });

  return params.toString();
}

function countActiveFilters(searchParams: URLSearchParams): number {
  let count = 0;
  if (getShopIdsFromSearchParams(searchParams).length > 0) count++;
  if (searchParams.get("group_ids")) count++;
  if (searchParams.get("min_drop")) count++;
  if (searchParams.get("min_price") || searchParams.get("max_price")) count++;
  return count;
}

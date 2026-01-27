"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, ResponsiveContainer, Cell } from "recharts";
import { ChevronDown, ChevronRight, Filter, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
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
import type {
  GroupExplorerChildGroup,
  PriceStatsResponse,
  ShopOption,
  UnitOption,
} from "@/types/group-explorer";

type GroupExplorerFiltersProps = {
  humanId: string;
  childGroups: GroupExplorerChildGroup[];
};

export function GroupExplorerFilters({
  humanId,
  childGroups,
  variant = "auto",
}: GroupExplorerFiltersProps & { variant?: "auto" | "mobile" | "desktop" }) {
  if (variant === "mobile") {
    return (
      <MobileFilters
        humanId={humanId}
        childGroups={childGroups}
      />
    );
  }

  if (variant === "desktop") {
    return (
      <DesktopFilters
        humanId={humanId}
        childGroups={childGroups}
      />
    );
  }

  // Auto mode: use CSS to show/hide
  return (
    <>
      {/* Mobile/Tablet: Filter button + drawer (hidden on lg and above) */}
      <div className="lg:hidden">
        <MobileFilters
          humanId={humanId}
          childGroups={childGroups}
        />
      </div>
      {/* Desktop: Sidebar (hidden below lg) */}
      <DesktopFilters
        humanId={humanId}
        childGroups={childGroups}
      />
    </>
  );
}

export function GroupExplorerActiveFilters({
  humanId,
  className,
}: {
  humanId: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentShopIds = useMemo(() => {
    const param = searchParams.get("shop_ids");
    if (!param) return [];
    return Array.from(
      new Set(
        param
          .split(",")
          .map((value) => parseInt(value, 10))
          .filter((value) => !Number.isNaN(value))
      )
    );
  }, [searchParams]);

  const currentUnits = useMemo(() => {
    const param = searchParams.get("units");
    if (!param) return [];
    return Array.from(
      new Set(
        param
          .split(",")
          .map((value) => decodeURIComponent(value))
          .filter((value) => value.length > 0)
      )
    );
  }, [searchParams]);

  const currentMinPrice = useMemo(() => {
    const value = searchParams.get("min_price");
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);

  const currentMaxPrice = useMemo(() => {
    const value = searchParams.get("max_price");
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);

  const shouldFetchShops = currentShopIds.length > 0;
  const shouldFetchUnits = currentUnits.length > 0;

  const { data: shops } = useQuery<ShopOption[]>({
    queryKey: ["group-shops", humanId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${humanId}/shops`);
      if (!res.ok) throw new Error("Failed to fetch shops");
      return res.json();
    },
    enabled: shouldFetchShops,
    staleTime: 60000,
  });

  const { data: units } = useQuery<UnitOption[]>({
    queryKey: ["group-units", humanId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${humanId}/units`);
      if (!res.ok) throw new Error("Failed to fetch units");
      return res.json();
    },
    enabled: shouldFetchUnits,
    staleTime: 60000,
  });

  const shopsById = useMemo(() => {
    const map = new Map<number, string>();
    shops?.forEach((shop) => map.set(shop.id, shop.name));
    return map;
  }, [shops]);

  const unitsByValue = useMemo(() => {
    const map = new Map<string, string>();
    units?.forEach((unit) => map.set(unit.value, unit.label));
    return map;
  }, [units]);

  const formatPrice = useCallback((value: number) => {
    return `RD$${value.toLocaleString()}`;
  }, []);

  const priceLabel = useMemo(() => {
    if (currentMinPrice !== null && currentMaxPrice !== null) {
      return `Precio: ${formatPrice(currentMinPrice)} - ${formatPrice(currentMaxPrice)}`;
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

      if (nextIds.length > 0) {
        params.set("shop_ids", nextIds.join(","));
      } else {
        params.delete("shop_ids");
      }

      pushParams(params);
    },
    [currentShopIds, pushParams, searchParams]
  );

  const handleRemoveUnit = useCallback(
    (unitValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextUnits = currentUnits.filter((unit) => unit !== unitValue);

      if (nextUnits.length > 0) {
        params.set(
          "units",
          nextUnits.map((unit) => encodeURIComponent(unit)).join(",")
        );
      } else {
        params.delete("units");
      }

      pushParams(params);
    },
    [currentUnits, pushParams, searchParams]
  );

  const handleRemovePrice = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("min_price");
    params.delete("max_price");
    pushParams(params);
  }, [pushParams, searchParams]);

  const hasActiveFilters =
    currentShopIds.length > 0 ||
    currentUnits.length > 0 ||
    priceLabel !== null;

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
      {currentUnits.map((unit) => (
        <button
          key={`unit-${unit}`}
          type="button"
          onClick={() => handleRemoveUnit(unit)}
          className="group flex items-center gap-2 rounded-full border border-muted-foreground/30 bg-muted/40 px-3 py-1 text-sm transition-colors hover:bg-muted-foreground/10"
          aria-label={`Quitar unidad ${unitsByValue.get(unit) ?? unit} del filtro`}
        >
          <span className="max-w-[200px] truncate text-left">
            {unitsByValue.get(unit) ?? unit}
          </span>
          <X className="h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
        </button>
      ))}
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

function MobileFilters({
  humanId,
  childGroups,
}: GroupExplorerFiltersProps) {
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
        <GroupExplorerActiveFilters humanId={humanId} className="px-4 pt-3" />
        <div className="p-4 max-h-[calc(100vh-10rem)] overflow-y-auto">
          <FilterSections
            humanId={humanId}
            childGroups={childGroups}
            onNavigate={() => setIsOpen(false)}
          />
        </div>
        <FilterFooter onClose={() => setIsOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}

function DesktopFilters({
  humanId,
  childGroups,
}: Omit<GroupExplorerFiltersProps, "total">) {
  return (
    <aside className="w-[280px] shrink-0 hidden lg:block">
      <div className="sticky top-4">
        <ScrollArea className="h-[calc(100vh-6rem)]">
          <FilterSections
            humanId={humanId}
            childGroups={childGroups}
          />
        </ScrollArea>
      </div>
    </aside>
  );
}

function FilterSections({
  humanId,
  childGroups,
  onNavigate,
}: {
  humanId: string;
  childGroups: GroupExplorerChildGroup[];
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-6 py-4 md:pr-4">
      <PriceFilterSection humanId={humanId} />
      <ShopsFilterSection humanId={humanId} />
      <UnitsFilterSection humanId={humanId} />
      {childGroups.length > 0 && (
        <SubgroupsSection childGroups={childGroups} onNavigate={onNavigate} />
      )}
    </div>
  );
}

function FilterFooter({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleClearFilters = useCallback(() => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }, [pathname, router]);

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

// ============ Price Filter Section ============

function PriceFilterSection({ humanId }: { humanId: string }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const currentMinPrice = searchParams.get("min_price");
  const currentMaxPrice = searchParams.get("max_price");
  const currentMinValue = currentMinPrice || "";
  const currentMaxValue = currentMaxPrice || "";
  const currentPriceKey = `${currentMinValue}|${currentMaxValue}`;
  const priceStatsParams = useMemo(
    () => buildFilterParams(searchParams, ["shop_ids", "units"]),
    [searchParams]
  );

  const [localMin, setLocalMin] = useState(currentMinValue);
  const [localMax, setLocalMax] = useState(currentMaxValue);
  const [isEditingMin, setIsEditingMin] = useState(false);
  const [isEditingMax, setIsEditingMax] = useState(false);
  const [sliderDraft, setSliderDraft] = useState<{
    key: string;
    values: [number, number];
  } | null>(null);

  const { data: priceStats, isLoading } = useQuery<PriceStatsResponse>({
    queryKey: ["group-price-stats", humanId, priceStatsParams],
    queryFn: async () => {
      const url = priceStatsParams
        ? `/api/groups/${humanId}/price-stats?${priceStatsParams}`
        : `/api/groups/${humanId}/price-stats`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch price stats");
      return res.json();
    },
    staleTime: 60000,
  });

  const effectiveSliderValues =
    sliderDraft && sliderDraft.key === currentPriceKey ? sliderDraft.values : null;
  const hasDraftValues =
    effectiveSliderValues !== null || isEditingMin || isEditingMax;
  const displayMin = hasDraftValues ? localMin : currentMinValue;
  const displayMax = hasDraftValues ? localMax : currentMaxValue;

  const syncLocalFromDisplay = useCallback(() => {
    if (effectiveSliderValues) {
      setLocalMin(String(effectiveSliderValues[0]));
      setLocalMax(String(effectiveSliderValues[1]));
      return;
    }
    setLocalMin(currentMinValue);
    setLocalMax(currentMaxValue);
  }, [currentMaxValue, currentMinValue, effectiveSliderValues]);

  const updatePriceRange = useCallback(
    (min: number | null, max: number | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (min !== null && min > 0) {
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
    [pathname, router, searchParams]
  );

  const handleSliderChange = useCallback(
    (values: number[]) => {
      if (values.length === 2 && priceStats) {
        const [min, max] = values;
        setSliderDraft({ key: currentPriceKey, values: [min, max] });
        setLocalMin(String(min));
        setLocalMax(String(max));
      }
    },
    [currentPriceKey, priceStats]
  );

  const handleSliderCommit = useCallback(
    (values: number[]) => {
      if (values.length === 2 && priceStats) {
        const [min, max] = values;
        const actualMin = min === priceStats.min ? null : min;
        const actualMax = max === priceStats.max ? null : max;
        updatePriceRange(actualMin, actualMax);
      }
    },
    [priceStats, updatePriceRange]
  );

  const commitInputs = useCallback(() => {
    const min = localMin ? Number(localMin) : null;
    const max = localMax ? Number(localMax) : null;
    const normalizedMin =
      min !== null && Number.isFinite(min) && min > 0 ? min : null;
    const normalizedMax =
      max !== null && Number.isFinite(max) && max > 0 ? max : null;

    if (priceStats) {
      setSliderDraft({
        key: currentPriceKey,
        values: [
          normalizedMin ?? priceStats.min,
          normalizedMax ?? priceStats.max,
        ],
      });
    }

    updatePriceRange(normalizedMin, normalizedMax);
  }, [currentPriceKey, localMax, localMin, priceStats, updatePriceRange]);

  const handleMinBlur = useCallback(() => {
    setIsEditingMin(false);
    commitInputs();
  }, [commitInputs]);

  const handleMaxBlur = useCallback(() => {
    setIsEditingMax(false);
    commitInputs();
  }, [commitInputs]);

  const handleQuickFilter = useCallback(
    (minPrice: number | null, maxPrice: number | null) => {
      updatePriceRange(minPrice, maxPrice);
    },
    [updatePriceRange]
  );

  const sliderValue = useMemo(() => {
    if (!priceStats) return [0, 100];
    if (effectiveSliderValues) return effectiveSliderValues;
    const min = currentMinPrice ? Number(currentMinPrice) : priceStats.min;
    const max = currentMaxPrice ? Number(currentMaxPrice) : priceStats.max;
    return [min, max];
  }, [currentMinPrice, currentMaxPrice, effectiveSliderValues, priceStats]);

  const activeQuickFilter = useMemo(() => {
    if (!priceStats) return null;
    const min = currentMinPrice ? Number(currentMinPrice) : null;
    const max = currentMaxPrice ? Number(currentMaxPrice) : null;

    for (const qf of priceStats.quickFilters) {
      if (qf.minPrice === min && qf.maxPrice === max) {
        return qf.label;
      }
    }
    return null;
  }, [currentMinPrice, currentMaxPrice, priceStats]);

  const hasPriceFilter = currentMinPrice || currentMaxPrice;

  return (
    <FilterSection
      title="Precio"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      badge={hasPriceFilter ? 1 : 0}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      ) : priceStats && priceStats.buckets.length > 0 ? (
        <div className="space-y-4">
          <div>
            {/* Histogram and Slider */}
            <PriceHistogram
              buckets={priceStats.buckets}
              minValue={sliderValue[0]}
              maxValue={sliderValue[1]}
            />

            {/* Range Slider */}
            <Slider
              value={sliderValue}
              min={priceStats.min}
              max={priceStats.max}
              step={1}
              onValueChange={handleSliderChange}
              onValueCommit={handleSliderCommit}
              disabled={isPending}
            />
          </div>

          {/* Min/Max Inputs */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder={String(priceStats.min)}
              value={displayMin}
              onFocus={() => {
                syncLocalFromDisplay();
                setIsEditingMin(true);
              }}
              onChange={(e) => {
                setLocalMin(e.target.value);
                setIsEditingMin(true);
              }}
              onBlur={handleMinBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleMinBlur();
                }
              }}
              className="h-9"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder={String(priceStats.max)}
              value={displayMax}
              onFocus={() => {
                syncLocalFromDisplay();
                setIsEditingMax(true);
              }}
              onChange={(e) => {
                setLocalMax(e.target.value);
                setIsEditingMax(true);
              }}
              onBlur={handleMaxBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleMaxBlur();
                }
              }}
              className="h-9"
            />
          </div>

          {/* Quick Filters */}
          <RadioGroup
            value={activeQuickFilter || ""}
            className="space-y-2"
          >
            {priceStats.quickFilters.map((qf) => {
              const isActive = activeQuickFilter === qf.label;
              return (
                <div
                  key={qf.label}
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => {
                    // If already selected, clear the filter
                    if (isActive) {
                      updatePriceRange(null, null);
                    } else {
                      handleQuickFilter(qf.minPrice, qf.maxPrice);
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value={qf.label}
                      disabled={isPending}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm">{qf.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {qf.count}
                  </span>
                </div>
              );
            })}
          </RadioGroup>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay datos de precios disponibles
        </p>
      )}
    </FilterSection>
  );
}

function PriceHistogram({
  buckets,
  minValue,
  maxValue,
}: {
  buckets: PriceStatsResponse["buckets"];
  minValue: number;
  maxValue: number;
}) {
  return (
    <div className="h-16">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {buckets.map((bucket, index) => {
              const isInRange =
                bucket.rangeStart >= minValue && bucket.rangeEnd <= maxValue;
              return (
                <Cell
                  key={index}
                  fill={isInRange ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============ Shops Filter Section ============

function ShopsFilterSection({ humanId }: { humanId: string }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const currentShopIds = useMemo(() => {
    const param = searchParams.get("shop_ids");
    if (!param) return new Set<number>();
    return new Set(
      param.split(",").map((v) => parseInt(v, 10)).filter((n) => !isNaN(n))
    );
  }, [searchParams]);

  const shopsParams = useMemo(
    () => buildFilterParams(searchParams, ["units", "min_price", "max_price"]),
    [searchParams]
  );

  const { data: shops, isLoading } = useQuery<ShopOption[]>({
    queryKey: ["group-shops", humanId, shopsParams],
    queryFn: async () => {
      const url = shopsParams
        ? `/api/groups/${humanId}/shops?${shopsParams}`
        : `/api/groups/${humanId}/shops`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch shops");
      return res.json();
    },
    staleTime: 60000,
  });

  const toggleShop = useCallback(
    (shopId: number, checked: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      const newIds = new Set(currentShopIds);

      if (checked) {
        newIds.add(shopId);
      } else {
        newIds.delete(shopId);
      }

      if (newIds.size > 0) {
        params.set("shop_ids", Array.from(newIds).join(","));
      } else {
        params.delete("shop_ids");
      }

      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [currentShopIds, pathname, router, searchParams]
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
              {showAll ? "Ver menos" : "Ver más"}
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

// ============ Units Filter Section ============

function UnitsFilterSection({ humanId }: { humanId: string }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const currentUnits = useMemo(() => {
    const param = searchParams.get("units");
    if (!param) return new Set<string>();
    return new Set(param.split(",").map((v) => decodeURIComponent(v)));
  }, [searchParams]);

  const unitsParams = useMemo(
    () => buildFilterParams(searchParams, ["shop_ids", "min_price", "max_price"]),
    [searchParams]
  );

  const { data: units, isLoading } = useQuery<UnitOption[]>({
    queryKey: ["group-units", humanId, unitsParams],
    queryFn: async () => {
      const url = unitsParams
        ? `/api/groups/${humanId}/units?${unitsParams}`
        : `/api/groups/${humanId}/units`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch units");
      return res.json();
    },
    staleTime: 60000,
  });

  const toggleUnit = useCallback(
    (unit: string, checked: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      const newUnits = new Set(currentUnits);

      if (checked) {
        newUnits.add(unit);
      } else {
        newUnits.delete(unit);
      }

      if (newUnits.size > 0) {
        params.set("units", Array.from(newUnits).map((u) => encodeURIComponent(u)).join(","));
      } else {
        params.delete("units");
      }

      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [currentUnits, pathname, router, searchParams]
  );

  const displayedUnits = showAll ? units : units?.slice(0, 5);
  const hasMore = units && units.length > 5;

  return (
    <FilterSection
      title="Unidad"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      badge={currentUnits.size}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      ) : units && units.length > 0 ? (
        <div className="space-y-2">
          {displayedUnits?.map((unit) => {
            const isSelected = currentUnits.has(unit.value);
            const isDisabled = unit.count === 0 && !isSelected;

            return (
              <div
                key={unit.value}
                className={cn(
                  "flex items-center justify-between py-1",
                  isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                )}
                onClick={() => {
                  if (isDisabled) {
                    return;
                  }
                  toggleUnit(unit.value, !isSelected);
                }}
                aria-disabled={isDisabled}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isSelected}
                    disabled={isPending || isDisabled}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-sm">{unit.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {unit.count}
                </span>
              </div>
            );
          })}
          {hasMore && (
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Ver menos" : "Ver más"}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay unidades disponibles
        </p>
      )}
    </FilterSection>
  );
}

// ============ Subgroups Section ============

function SubgroupsSection({
  childGroups,
  onNavigate,
}: {
  childGroups: GroupExplorerChildGroup[];
  onNavigate?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const searchParams = useSearchParams();

  // Build URL with current filters preserved
  const buildSubgroupUrl = useCallback(
    (humanNameId: string) => {
      const params = new URLSearchParams();

      // Preserve filter params
      const shopIds = searchParams.get("shop_ids");
      const units = searchParams.get("units");
      const minPrice = searchParams.get("min_price");
      const maxPrice = searchParams.get("max_price");

      if (shopIds) params.set("shop_ids", shopIds);
      if (units) params.set("units", units);
      if (minPrice) params.set("min_price", minPrice);
      if (maxPrice) params.set("max_price", maxPrice);

      const query = params.toString();
      return query ? `/groups/${humanNameId}?${query}` : `/groups/${humanNameId}`;
    },
    [searchParams]
  );

  return (
    <FilterSection
      title="Categorías"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
    >
      <div className="space-y-1">
        {childGroups.map((group) => (
          <Button variant="link" className="w-full justify-start" asChild key={group.id}>
            <Link
              href={buildSubgroupUrl(group.humanNameId)}
              className="flex items-center gap-2 py-2 text-sm hover:text-primary transition-colors"
              onClick={onNavigate}
            >
              {group.name}
            </Link>
          </Button>
        ))}
      </div>
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

function buildFilterParams(
  searchParams: URLSearchParams,
  keys: string[]
): string {
  const params = new URLSearchParams();

  keys.forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      params.set(key, value);
    }
  });

  return params.toString();
}

function countActiveFilters(searchParams: URLSearchParams): number {
  let count = 0;
  if (searchParams.get("shop_ids")) count++;
  if (searchParams.get("units")) count++;
  if (searchParams.get("min_price") || searchParams.get("max_price")) count++;
  return count;
}

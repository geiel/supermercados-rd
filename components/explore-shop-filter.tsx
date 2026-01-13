'use client';

import { useQuery } from "@tanstack/react-query";
import type { shopsSelect } from "@/db/schema";
import { ExploreShopFilterClient } from "./explore-shop-filter-client";
import { SelectedShopBadge } from "./selected-shop-badge";
import { ExploreSupermarketToggle } from "./explore-supermarket-toggle";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { ExploreUnitFilter } from "./explore-unit-filter";
import { SelectedUnitBadge } from "./selected-unit-badge";

type ExploreShopFilterProps = {
  selectedShopIds?: number[];
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as shopsSelect[];
};

export function ExploreFilters({ selectedShopIds }: ExploreShopFilterProps) {
  const {
    data: shopsData,
    error,
    isPending,
  } = useQuery({
    queryKey: ["shops"],
    queryFn: () => fetcher("/api/shops"),
    refetchOnWindowFocus: false,
  });

  const shops = shopsData ?? [];

  return (
    <div className="px-2 md:px-0 space-y-2">
      {!isPending && error ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar los supermercados.
        </p>
      ) : null}

      <ScrollArea>
        <div className="flex space-x-2 items-center">
          <ExploreShopFilterClient shops={shops} selectedShopIds={selectedShopIds} />

          <ExploreUnitFilter />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="flex flex-wrap gap-2">
        <SelectedShopBadge shopIds={selectedShopIds} shops={shops} />
        <SelectedUnitBadge />
      </div>
    </div>
  );
}

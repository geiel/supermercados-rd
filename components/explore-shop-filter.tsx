'use client';

import useSWR from "swr";
import type { shopsSelect } from "@/db/schema";
import { ExploreShopFilterClient } from "./explore-shop-filter-client";
import { SelectedShopBadge } from "./selected-shop-badge";
import { ExploreSupermarketToggle } from "./explore-supermarket-toggle";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";

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

export function ExploreShopFilter({ selectedShopIds }: ExploreShopFilterProps) {
  const {
    data: shopsData,
    error,
    isLoading,
  } = useSWR<shopsSelect[]>("/api/shops", fetcher, {
    revalidateOnFocus: false,
  });

  const shops = shopsData ?? [];

  return (
    <div className="px-2 md:px-0 space-y-2">
      {!isLoading && error ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar los supermercados.
        </p>
      ) : null}

      <ScrollArea>
        <div className="flex space-x-2 items-center">
          <ExploreShopFilterClient shops={shops} selectedShopIds={selectedShopIds} />

          <ExploreSupermarketToggle />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <SelectedShopBadge shopIds={selectedShopIds} shops={shops} />
    </div>
  );
}

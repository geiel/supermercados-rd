"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { CompareMode } from "@/lib/list-calculations";
import type { StatsApiResponse } from "@/app/api/list/stats/route";

// ============================================================================
// Types
// ============================================================================

export type UseListStatsOptions = {
    products: number[];
    groups: number[];
    ignoredByGroup: Record<number, number[]>;
    selectedShops?: number[];
    compareMode: CompareMode;
    enabled?: boolean;
};

export type UseListStatsReturn = StatsApiResponse & {
    isLoading: boolean;
    isFetching: boolean;
    refetch: () => Promise<unknown>;
};

// ============================================================================
// Query Key Factory
// ============================================================================

export const listStatsQueryKeys = {
    all: ["list-stats"] as const,
    stats: (options: Omit<UseListStatsOptions, "enabled">) =>
        [
            ...listStatsQueryKeys.all,
            {
                products: options.products,
                groups: options.groups,
                ignoredByGroup: options.ignoredByGroup,
                selectedShops: options.selectedShops,
                compareMode: options.compareMode,
            },
        ] as const,
};

// ============================================================================
// Fetch Function
// ============================================================================

async function fetchListStats(
    options: Omit<UseListStatsOptions, "enabled">
): Promise<StatsApiResponse> {
    const response = await fetch("/api/list/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            products: options.products,
            groups: options.groups,
            ignoredByGroup: options.ignoredByGroup,
            selectedShops: options.selectedShops,
            compareMode: options.compareMode,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch list stats");
    }

    return response.json();
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook to fetch list statistics with TanStack Query.
 *
 * Key features:
 * - Uses `placeholderData: keepPreviousData` to avoid full-page loading on refetch
 * - `isLoading` is true only on first load (no data yet)
 * - `isFetching` is true during background refetch (previous data still visible)
 *
 * @example
 * ```tsx
 * const stats = useListStats({
 *   products: [1, 2, 3],
 *   groups: [10, 20],
 *   ignoredByGroup: { 10: [100, 101] },
 *   selectedShops: [1, 2],
 *   compareMode: "cheapest",
 * });
 *
 * // First load: show skeleton
 * if (stats.isLoading) return <ListSkeleton />;
 *
 * // Background refetch: show data + partial loading indicators
 * return (
 *   <ShopSelector isRecalculating={stats.isFetching} />
 *   <ProductList items={stats.entriesWithShop} />
 * );
 * ```
 */
export function useListStats(options: UseListStatsOptions): UseListStatsReturn {
    const {
        products,
        groups,
        ignoredByGroup,
        selectedShops,
        compareMode,
        enabled = true,
    } = options;

    // Determine if we have any items to fetch
    const hasItems = products.length > 0 || groups.length > 0;

    const queryOptions = {
        products,
        groups,
        ignoredByGroup,
        selectedShops,
        compareMode,
    };

    const query = useQuery({
        queryKey: listStatsQueryKeys.stats(queryOptions),
        queryFn: () => fetchListStats(queryOptions),
        // Keep showing previous data while fetching new data
        placeholderData: keepPreviousData,
        // Don't refetch automatically on window focus
        refetchOnWindowFocus: false,
        // Only enable if we have items to fetch
        enabled: enabled && hasItems,
        // Consider data fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
    });

    // Return empty data while loading or disabled
    const emptyResponse: StatsApiResponse = {
        selectedShopIds: [],
        compareMode,
        entriesWithShop: [],
        entriesWithoutShop: [],
        totalProducts: 0,
        totalPrice: 0,
        cheapestSingleShopIds: [],
        cheapestPairShopIds: [],
        bestValueSingleShopIds: [],
        bestValuePairShopIds: [],
        selectedValueScore: null,
        shopsGrouped: {},
    };

    return {
        ...(query.data ?? emptyResponse),
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        refetch: query.refetch,
    };
}

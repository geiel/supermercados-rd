"use client";

import { useQuery } from "@tanstack/react-query";
import type { shopsSelect } from "@/db/schema";

const SHOPS_QUERY_KEY = ["shops"];

export function useShops() {
    return useQuery<shopsSelect[]>({
        queryKey: SHOPS_QUERY_KEY,
        queryFn: async () => {
            const response = await fetch("/api/list/shops");
            if (!response.ok) {
                throw new Error("Failed to fetch shops");
            }
            return response.json();
        },
        // Shops rarely change, cache indefinitely
        staleTime: Infinity,
    });
}

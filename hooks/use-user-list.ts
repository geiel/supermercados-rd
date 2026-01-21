"use client";

import { useQuery } from "@tanstack/react-query";
import type { ListSelect } from "@/db/schema";

const LIST_QUERY_KEY = ["user-lists"];

export function useUserList(listId?: number) {
    return useQuery<ListSelect[], Error, ListSelect | null>({
        queryKey: LIST_QUERY_KEY,
        queryFn: async () => {
            const response = await fetch("/api/user/lists");
            if (!response.ok) {
                throw new Error("Failed to fetch user lists");
            }
            return response.json() as Promise<ListSelect[]>;
        },
        select: (lists) => (listId ? lists.find((list) => list.id === listId) ?? null : null),
        enabled: !!listId,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

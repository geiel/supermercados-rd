"use client";

import { useQuery } from "@tanstack/react-query";
import type { ListSelect } from "@/db/schema";

const USER_LIST_QUERY_KEY = ["user-list"];

export function useUserList(listId?: number) {
    return useQuery<ListSelect | null>({
        queryKey: [...USER_LIST_QUERY_KEY, listId],
        queryFn: async () => {
            if (!listId) return null;
            
            const response = await fetch("/api/user/lists");
            if (!response.ok) {
                throw new Error("Failed to fetch user lists");
            }
            
            const lists: ListSelect[] = await response.json();
            return lists.find((list) => list.id === listId) ?? null;
        },
        enabled: !!listId,
        staleTime: 30 * 1000, // 30 seconds
    });
}

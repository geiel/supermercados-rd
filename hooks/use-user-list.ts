"use client";

import { useQuery } from "@tanstack/react-query";
import type { ListSelect } from "@/db/schema";
import { useUser } from "./use-user";

const LIST_QUERY_KEY = ["user-lists"];

export function useUserList(listId?: number) {
    const { user } = useUser();

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
        enabled: !!listId && !!user,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

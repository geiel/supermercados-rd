"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "./use-user";
import type { listItemsSelect, listGroupItemsSelect } from "@/db/schema";
import {
    // Products
    getProductsSnapshot,
    getProductsServerSnapshot,
    subscribeProducts,
    addLocalProduct,
    removeLocalProduct,
    // Groups
    getGroupsSnapshot,
    getGroupsServerSnapshot,
    subscribeGroups,
    addLocalGroup,
    removeLocalGroup,
    // Ignored
    getIgnoredSnapshot,
    getIgnoredServerSnapshot,
    subscribeIgnored,
    ignoreLocalProduct,
    restoreLocalProduct,
} from "@/lib/local-list-store";

// ============================================================================
// Types
// ============================================================================

type UseListItemsOptions = {
    listId?: number;
};

type UseListItemsReturn = {
    // Data
    products: number[];
    groups: number[];
    ignoredByGroup: Record<number, number[]>;

    // State
    isLoading: boolean;
    isLocalMode: boolean;

    // Mutations
    addProduct: (productId: number) => void;
    removeProduct: (productId: number) => void;
    addGroup: (groupId: number) => void;
    removeGroup: (groupId: number) => void;
    ignoreProduct: (groupId: number, productId: number) => void;
    restoreProduct: (groupId: number, productId: number) => void;
};

// ============================================================================
// Query Keys
// ============================================================================

const LIST_ITEMS_QUERY_KEY = ["list-items"];
const LIST_GROUP_ITEMS_QUERY_KEY = ["list-group-items"];

// ============================================================================
// Local Mode Hook
// ============================================================================

function useLocalListItems(): UseListItemsReturn {
    // Subscribe to shared localStorage store
    const products = useSyncExternalStore(
        subscribeProducts,
        getProductsSnapshot,
        getProductsServerSnapshot
    );

    const groups = useSyncExternalStore(
        subscribeGroups,
        getGroupsSnapshot,
        getGroupsServerSnapshot
    );

    const ignoredByGroup = useSyncExternalStore(
        subscribeIgnored,
        getIgnoredSnapshot,
        getIgnoredServerSnapshot
    );

    return {
        products,
        groups,
        ignoredByGroup,
        isLoading: false,
        isLocalMode: true,
        addProduct: addLocalProduct,
        removeProduct: removeLocalProduct,
        addGroup: addLocalGroup,
        removeGroup: removeLocalGroup,
        ignoreProduct: ignoreLocalProduct,
        restoreProduct: restoreLocalProduct,
    };
}

// ============================================================================
// Database Mode Hook
// ============================================================================

function useDatabaseListItems(listId?: number): UseListItemsReturn {
    const queryClient = useQueryClient();

    // Fetch list items from database
    const itemsQuery = useQuery<listItemsSelect[]>({
        queryKey: LIST_ITEMS_QUERY_KEY,
        queryFn: async () => {
            const response = await fetch(`/api/user/lists/items`);
            if (!response.ok) throw new Error("Failed to fetch list items");
            return response.json();
        },
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled: !!listId,
    });

    // Fetch group items from database
    const groupItemsQuery = useQuery<listGroupItemsSelect[]>({
        queryKey: LIST_GROUP_ITEMS_QUERY_KEY,
        queryFn: async () => {
            const response = await fetch(`/api/user/lists/groups`);
            if (!response.ok) throw new Error("Failed to fetch group items");
            return response.json();
        },
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled: !!listId,
    });

    // Derive data from queries
    const listItems = useMemo(
        () => (listId ? itemsQuery.data?.filter((item) => item.listId === listId) ?? [] : []),
        [itemsQuery.data, listId]
    );

    const listGroupItems = useMemo(
        () =>
            listId ? groupItemsQuery.data?.filter((item) => item.listId === listId) ?? [] : [],
        [groupItemsQuery.data, listId]
    );

    const products = useMemo(
        () => listItems.map((item) => item.productId),
        [listItems]
    );

    const groups = useMemo(
        () => listGroupItems.map((item) => item.groupId),
        [listGroupItems]
    );

    const ignoredByGroup = useMemo(() => {
        const result: Record<number, number[]> = {};
        for (const item of listGroupItems) {
            const ignored = (item.ignoredProducts ?? [])
                .map((id) => Number(id))
                .filter(Number.isFinite);
            if (ignored.length > 0) {
                result[item.groupId] = ignored;
            }
        }
        return result;
    }, [listGroupItems]);

    // Add product mutation
    const addProductMutation = useMutation({
        mutationFn: async (productId: number) => {
            if (!listId) throw new Error("listId is required");
            const response = await fetch("/api/user/lists/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId, productId }),
            });
            if (!response.ok) throw new Error("Failed to add product");
            return response.json();
        },
        onSuccess: (newItem) => {
            queryClient.setQueryData<listItemsSelect[]>(
                LIST_ITEMS_QUERY_KEY,
                (old) => (old ? [...old, newItem] : [newItem])
            );
        },
    });

    // Remove product mutation
    const removeProductMutation = useMutation({
        mutationFn: async (productId: number) => {
            if (!listId) throw new Error("listId is required");
            const response = await fetch("/api/user/lists/items", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId, productId }),
            });
            if (!response.ok) throw new Error("Failed to remove product");
        },
        onMutate: async (productId) => {
            await queryClient.cancelQueries({ queryKey: LIST_ITEMS_QUERY_KEY });
            queryClient.setQueryData<listItemsSelect[]>(
                LIST_ITEMS_QUERY_KEY,
                (old) =>
                    old?.filter(
                        (item) => !(item.productId === productId && item.listId === listId)
                    ) ?? []
            );
        },
    });

    // Add group mutation
    const addGroupMutation = useMutation({
        mutationFn: async (groupId: number) => {
            if (!listId) throw new Error("listId is required");
            const response = await fetch("/api/user/lists/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId, groupId }),
            });
            if (!response.ok) throw new Error("Failed to add group");
            return response.json();
        },
        onSuccess: (newItem) => {
            queryClient.setQueryData<listGroupItemsSelect[]>(
                LIST_GROUP_ITEMS_QUERY_KEY,
                (old) => (old ? [...old, newItem] : [newItem])
            );
        },
    });

    // Remove group mutation
    const removeGroupMutation = useMutation({
        mutationFn: async (groupId: number) => {
            if (!listId) throw new Error("listId is required");
            const response = await fetch("/api/user/lists/groups", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId, groupId }),
            });
            if (!response.ok) throw new Error("Failed to remove group");
        },
        onMutate: async (groupId) => {
            await queryClient.cancelQueries({ queryKey: LIST_GROUP_ITEMS_QUERY_KEY });
            queryClient.setQueryData<listGroupItemsSelect[]>(
                LIST_GROUP_ITEMS_QUERY_KEY,
                (old) =>
                    old?.filter((item) => !(item.groupId === groupId && item.listId === listId)) ??
                    []
            );
        },
    });

    // Ignore product mutation
    const ignoreProductMutation = useMutation({
        mutationFn: async ({ groupId, productId }: { groupId: number; productId: number }) => {
            const groupItem = listGroupItems.find((item) => item.groupId === groupId);
            if (!groupItem) throw new Error("Group item not found");

            const currentIgnored = (groupItem.ignoredProducts ?? []).map((id) => Number(id));
            const newIgnored = [...currentIgnored, productId];

            const response = await fetch("/api/user/lists/groups", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: groupItem.id, ignoredProducts: newIgnored }),
            });
            if (!response.ok) throw new Error("Failed to ignore product");
            return { groupId, productId, newIgnored };
        },
        onMutate: async ({ groupId, productId }) => {
            await queryClient.cancelQueries({ queryKey: LIST_GROUP_ITEMS_QUERY_KEY });
            queryClient.setQueryData<listGroupItemsSelect[]>(
                LIST_GROUP_ITEMS_QUERY_KEY,
                (old) =>
                    old?.map((item) => {
                        if (item.groupId !== groupId || item.listId !== listId) return item;
                        const currentIgnored = item.ignoredProducts ?? [];
                        return {
                            ...item,
                            ignoredProducts: [...currentIgnored, String(productId)],
                        };
                    }) ?? []
            );
        },
    });

    // Restore product mutation
    const restoreProductMutation = useMutation({
        mutationFn: async ({ groupId, productId }: { groupId: number; productId: number }) => {
            const groupItem = listGroupItems.find((item) => item.groupId === groupId);
            if (!groupItem) throw new Error("Group item not found");

            const currentIgnored = (groupItem.ignoredProducts ?? []).map((id) => Number(id));
            const newIgnored = currentIgnored.filter((id) => id !== productId);

            const response = await fetch("/api/user/lists/groups", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: groupItem.id, ignoredProducts: newIgnored }),
            });
            if (!response.ok) throw new Error("Failed to restore product");
            return { groupId, productId, newIgnored };
        },
        onMutate: async ({ groupId, productId }) => {
            await queryClient.cancelQueries({ queryKey: LIST_GROUP_ITEMS_QUERY_KEY });
            queryClient.setQueryData<listGroupItemsSelect[]>(
                LIST_GROUP_ITEMS_QUERY_KEY,
                (old) =>
                    old?.map((item) => {
                        if (item.groupId !== groupId || item.listId !== listId) return item;
                        const currentIgnored = item.ignoredProducts ?? [];
                        return {
                            ...item,
                            ignoredProducts: currentIgnored.filter(
                                (id) => Number(id) !== productId
                            ),
                        };
                    }) ?? []
            );
        },
    });

    return {
        products,
        groups,
        ignoredByGroup,
        isLoading: itemsQuery.isLoading || groupItemsQuery.isLoading,
        isLocalMode: false,
        addProduct: (productId) => {
            if (!listId) {
                console.warn("listId is required to add a product");
                return;
            }
            addProductMutation.mutate(productId);
        },
        removeProduct: (productId) => {
            if (!listId) {
                console.warn("listId is required to remove a product");
                return;
            }
            removeProductMutation.mutate(productId);
        },
        addGroup: (groupId) => {
            if (!listId) {
                console.warn("listId is required to add a group");
                return;
            }
            addGroupMutation.mutate(groupId);
        },
        removeGroup: (groupId) => {
            if (!listId) {
                console.warn("listId is required to remove a group");
                return;
            }
            removeGroupMutation.mutate(groupId);
        },
        ignoreProduct: (groupId, productId) => {
            if (!listId) {
                console.warn("listId is required to ignore a product");
                return;
            }
            ignoreProductMutation.mutate({ groupId, productId });
        },
        restoreProduct: (groupId, productId) => {
            if (!listId) {
                console.warn("listId is required to restore a product");
                return;
            }
            restoreProductMutation.mutate({ groupId, productId });
        },
    };
}

// ============================================================================
// Main Hook
// ============================================================================

export function useListItems(options: UseListItemsOptions = {}): UseListItemsReturn {
    const { listId } = options;
    const { user, isLoading: isUserLoading } = useUser();

    // Determine mode: guest = local, logged in = database
    const isLocalMode = !user;

    // Use the appropriate implementation
    const localResult = useLocalListItems();
    const dbResult = useDatabaseListItems(listId);

    // Return based on mode
    if (isUserLoading) {
        return {
            products: [],
            groups: [],
            ignoredByGroup: {},
            isLoading: true,
            isLocalMode: true,
            addProduct: () => {},
            removeProduct: () => {},
            addGroup: () => {},
            removeGroup: () => {},
            ignoreProduct: () => {},
            restoreProduct: () => {},
        };
    }

    if (isLocalMode) {
        return localResult;
    }

    return dbResult;
}

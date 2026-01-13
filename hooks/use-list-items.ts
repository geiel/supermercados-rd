"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "./use-user";
import type { listItemsSelect, listGroupItemsSelect } from "@/db/schema";

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
// Local Storage - Products
// ============================================================================

const LOCAL_STORAGE_KEY = "shopping-list";
const SERVER_SNAPSHOT: number[] = [];
let cachedSnapshot: number[] = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function readProductsFromStorage(): number[] {
    if (typeof window === "undefined") return SERVER_SNAPSHOT;
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function getProductsSnapshot(): number[] {
    return cachedSnapshot;
}

function getProductsServerSnapshot(): number[] {
    return SERVER_SNAPSHOT;
}

function subscribeProducts(callback: () => void): () => void {
    listeners.add(callback);
    if (typeof window !== "undefined") {
        cachedSnapshot = readProductsFromStorage();
    }
    return () => listeners.delete(callback);
}

function updateProductsCache() {
    cachedSnapshot = readProductsFromStorage();
    for (const listener of listeners) {
        listener();
    }
}

// ============================================================================
// Local Storage - Groups
// ============================================================================

const LOCAL_STORAGE_GROUPS_KEY = "shopping-list-groups";
const SERVER_SNAPSHOT_GROUPS: number[] = [];
let cachedSnapshotGroups: number[] = SERVER_SNAPSHOT_GROUPS;
const listenersGroups = new Set<() => void>();

function readGroupsFromStorage(): number[] {
    if (typeof window === "undefined") return SERVER_SNAPSHOT_GROUPS;
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_GROUPS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function getGroupsSnapshot(): number[] {
    return cachedSnapshotGroups;
}

function getGroupsServerSnapshot(): number[] {
    return SERVER_SNAPSHOT_GROUPS;
}

function subscribeGroups(callback: () => void): () => void {
    listenersGroups.add(callback);
    if (typeof window !== "undefined") {
        cachedSnapshotGroups = readGroupsFromStorage();
    }
    return () => listenersGroups.delete(callback);
}

function updateGroupsCache() {
    cachedSnapshotGroups = readGroupsFromStorage();
    for (const listener of listenersGroups) {
        listener();
    }
}

// ============================================================================
// Local Storage - Ignored Products
// ============================================================================

const LOCAL_STORAGE_IGNORED_KEY = "shopping-list-ignored";
const SERVER_SNAPSHOT_IGNORED: Record<number, number[]> = {};
let cachedSnapshotIgnored: Record<number, number[]> = SERVER_SNAPSHOT_IGNORED;
const listenersIgnored = new Set<() => void>();

function readIgnoredFromStorage(): Record<number, number[]> {
    if (typeof window === "undefined") return SERVER_SNAPSHOT_IGNORED;
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_IGNORED_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

function getIgnoredSnapshot(): Record<number, number[]> {
    return cachedSnapshotIgnored;
}

function getIgnoredServerSnapshot(): Record<number, number[]> {
    return SERVER_SNAPSHOT_IGNORED;
}

function subscribeIgnored(callback: () => void): () => void {
    listenersIgnored.add(callback);
    if (typeof window !== "undefined") {
        cachedSnapshotIgnored = readIgnoredFromStorage();
    }
    return () => listenersIgnored.delete(callback);
}

function updateIgnoredCache() {
    cachedSnapshotIgnored = readIgnoredFromStorage();
    for (const listener of listenersIgnored) {
        listener();
    }
}

// ============================================================================
// Query Keys
// ============================================================================

const LIST_ITEMS_QUERY_KEY = ["list-items"];
const LIST_GROUP_ITEMS_QUERY_KEY = ["list-group-items"];

// ============================================================================
// Local Mode Hook
// ============================================================================

function useLocalListItems(): UseListItemsReturn {
    // Subscribe to localStorage
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

    // Product mutations
    const addProduct = useCallback((productId: number) => {
        const current = readProductsFromStorage();
        if (!current.includes(productId)) {
            const updated = [...current, productId];
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
            updateProductsCache();
        }
    }, []);

    const removeProduct = useCallback((productId: number) => {
        const current = readProductsFromStorage();
        const updated = current.filter((id) => id !== productId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        updateProductsCache();
    }, []);

    // Group mutations
    const addGroup = useCallback((groupId: number) => {
        const current = readGroupsFromStorage();
        if (!current.includes(groupId)) {
            const updated = [...current, groupId];
            localStorage.setItem(LOCAL_STORAGE_GROUPS_KEY, JSON.stringify(updated));
            updateGroupsCache();
        }
    }, []);

    const removeGroup = useCallback((groupId: number) => {
        const current = readGroupsFromStorage();
        const updated = current.filter((id) => id !== groupId);
        localStorage.setItem(LOCAL_STORAGE_GROUPS_KEY, JSON.stringify(updated));
        updateGroupsCache();

        // Also clear ignored products for this group
        const currentIgnored = readIgnoredFromStorage();
        if (currentIgnored[groupId]) {
            const updatedIgnored = { ...currentIgnored };
            delete updatedIgnored[groupId];
            localStorage.setItem(LOCAL_STORAGE_IGNORED_KEY, JSON.stringify(updatedIgnored));
            updateIgnoredCache();
        }
    }, []);

    // Ignored product mutations
    const ignoreProduct = useCallback((groupId: number, productId: number) => {
        const current = readIgnoredFromStorage();
        const groupIgnored = current[groupId] ?? [];
        if (!groupIgnored.includes(productId)) {
            const updated = {
                ...current,
                [groupId]: [...groupIgnored, productId],
            };
            localStorage.setItem(LOCAL_STORAGE_IGNORED_KEY, JSON.stringify(updated));
            updateIgnoredCache();
        }
    }, []);

    const restoreProduct = useCallback((groupId: number, productId: number) => {
        const current = readIgnoredFromStorage();
        const groupIgnored = current[groupId] ?? [];
        const updated = {
            ...current,
            [groupId]: groupIgnored.filter((id) => id !== productId),
        };
        if (updated[groupId].length === 0) {
            delete updated[groupId];
        }
        localStorage.setItem(LOCAL_STORAGE_IGNORED_KEY, JSON.stringify(updated));
        updateIgnoredCache();
    }, []);

    return {
        products,
        groups,
        ignoredByGroup,
        isLoading: false,
        isLocalMode: true,
        addProduct,
        removeProduct,
        addGroup,
        removeGroup,
        ignoreProduct,
        restoreProduct,
    };
}

// ============================================================================
// Database Mode Hook
// ============================================================================

function useDatabaseListItems(listId: number): UseListItemsReturn {
    const queryClient = useQueryClient();

    // Fetch list items from database
    const itemsQuery = useQuery<listItemsSelect[]>({
        queryKey: [...LIST_ITEMS_QUERY_KEY, listId],
        queryFn: async () => {
            const response = await fetch(`/api/user/lists/items`);
            if (!response.ok) throw new Error("Failed to fetch list items");
            const allItems: listItemsSelect[] = await response.json();
            return allItems.filter((item) => item.listId === listId);
        },
    });

    // Fetch group items from database
    const groupItemsQuery = useQuery<listGroupItemsSelect[]>({
        queryKey: [...LIST_GROUP_ITEMS_QUERY_KEY, listId],
        queryFn: async () => {
            const response = await fetch(`/api/user/lists/groups`);
            if (!response.ok) throw new Error("Failed to fetch group items");
            const allItems: listGroupItemsSelect[] = await response.json();
            return allItems.filter((item) => item.listId === listId);
        },
    });

    // Derive data from queries
    const products = useMemo(
        () => itemsQuery.data?.map((item) => item.productId) ?? [],
        [itemsQuery.data]
    );

    const groups = useMemo(
        () => groupItemsQuery.data?.map((item) => item.groupId) ?? [],
        [groupItemsQuery.data]
    );

    const ignoredByGroup = useMemo(() => {
        const result: Record<number, number[]> = {};
        for (const item of groupItemsQuery.data ?? []) {
            const ignored = (item.ignoredProducts ?? [])
                .map((id) => Number(id))
                .filter(Number.isFinite);
            if (ignored.length > 0) {
                result[item.groupId] = ignored;
            }
        }
        return result;
    }, [groupItemsQuery.data]);

    // Add product mutation
    const addProductMutation = useMutation({
        mutationFn: async (productId: number) => {
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
                [...LIST_ITEMS_QUERY_KEY, listId],
                (old) => (old ? [...old, newItem] : [newItem])
            );
        },
    });

    // Remove product mutation
    const removeProductMutation = useMutation({
        mutationFn: async (productId: number) => {
            const response = await fetch("/api/user/lists/items", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId, productId }),
            });
            if (!response.ok) throw new Error("Failed to remove product");
        },
        onMutate: async (productId) => {
            await queryClient.cancelQueries({ queryKey: [...LIST_ITEMS_QUERY_KEY, listId] });
            queryClient.setQueryData<listItemsSelect[]>(
                [...LIST_ITEMS_QUERY_KEY, listId],
                (old) => old?.filter((item) => item.productId !== productId) ?? []
            );
        },
    });

    // Add group mutation
    const addGroupMutation = useMutation({
        mutationFn: async (groupId: number) => {
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
                [...LIST_GROUP_ITEMS_QUERY_KEY, listId],
                (old) => (old ? [...old, newItem] : [newItem])
            );
        },
    });

    // Remove group mutation
    const removeGroupMutation = useMutation({
        mutationFn: async (groupId: number) => {
            const response = await fetch("/api/user/lists/groups", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId, groupId }),
            });
            if (!response.ok) throw new Error("Failed to remove group");
        },
        onMutate: async (groupId) => {
            await queryClient.cancelQueries({ queryKey: [...LIST_GROUP_ITEMS_QUERY_KEY, listId] });
            queryClient.setQueryData<listGroupItemsSelect[]>(
                [...LIST_GROUP_ITEMS_QUERY_KEY, listId],
                (old) => old?.filter((item) => item.groupId !== groupId) ?? []
            );
        },
    });

    // Ignore product mutation
    const ignoreProductMutation = useMutation({
        mutationFn: async ({ groupId, productId }: { groupId: number; productId: number }) => {
            const groupItem = groupItemsQuery.data?.find((item) => item.groupId === groupId);
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
            await queryClient.cancelQueries({ queryKey: [...LIST_GROUP_ITEMS_QUERY_KEY, listId] });
            queryClient.setQueryData<listGroupItemsSelect[]>(
                [...LIST_GROUP_ITEMS_QUERY_KEY, listId],
                (old) =>
                    old?.map((item) => {
                        if (item.groupId !== groupId) return item;
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
            const groupItem = groupItemsQuery.data?.find((item) => item.groupId === groupId);
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
            await queryClient.cancelQueries({ queryKey: [...LIST_GROUP_ITEMS_QUERY_KEY, listId] });
            queryClient.setQueryData<listGroupItemsSelect[]>(
                [...LIST_GROUP_ITEMS_QUERY_KEY, listId],
                (old) =>
                    old?.map((item) => {
                        if (item.groupId !== groupId) return item;
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
        addProduct: (productId) => addProductMutation.mutate(productId),
        removeProduct: (productId) => removeProductMutation.mutate(productId),
        addGroup: (groupId) => addGroupMutation.mutate(groupId),
        removeGroup: (groupId) => removeGroupMutation.mutate(groupId),
        ignoreProduct: (groupId, productId) => ignoreProductMutation.mutate({ groupId, productId }),
        restoreProduct: (groupId, productId) => restoreProductMutation.mutate({ groupId, productId }),
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
    const dbResult = useDatabaseListItems(listId ?? 0);

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

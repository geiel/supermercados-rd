"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "./use-user";
import type { ListSelect, listItemsSelect, listGroupItemsSelect } from "@/db/schema";

// ============================================================================
// Types
// ============================================================================

type UseAddToListReturn = {
    // Check if item is in a list (for local mode, checks the single local list)
    hasProduct: (productId: number) => boolean;
    hasGroup: (groupId: number) => boolean;

    // Check if item is in a specific list (for logged-in users)
    isProductInList: (productId: number, listId: number) => boolean;
    isGroupInList: (groupId: number, listId: number) => boolean;

    // Mutations
    // For guests: listId is ignored
    // For logged-in: listId is required
    addProduct: (productId: number, listId?: number) => void;
    removeProduct: (productId: number, listId?: number) => void;
    addGroup: (groupId: number, listId?: number) => void;
    removeGroup: (groupId: number, listId?: number) => void;
    toggleProduct: (productId: number, listId?: number) => void;
    toggleGroup: (groupId: number, listId?: number) => void;

    // For logged-in users: available lists
    lists: ListSelect[] | undefined;
    isLoadingLists: boolean;

    // Create a new list (for logged-in users only)
    createList: (name: string) => Promise<ListSelect | undefined>;
    isCreatingList: boolean;

    // State
    isLocalMode: boolean;
    isLoading: boolean;
    hasAnyGroup: boolean;
};

// ============================================================================
// Local Storage - Products
// ============================================================================

const LOCAL_STORAGE_KEY = "shopping-list";
const SERVER_SNAPSHOT: number[] = [];
let cachedSnapshot: number[] = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let productsInitialized = false;

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

function initProductsListener() {
    if (productsInitialized || typeof window === "undefined") return;
    productsInitialized = true;
    
    // Initialize cache from storage
    cachedSnapshot = readProductsFromStorage();
    
    // Listen for storage events (cross-tab sync)
    window.addEventListener("storage", (e) => {
        if (e.key === LOCAL_STORAGE_KEY) {
            updateProductsCache();
        }
    });
}

function subscribeProducts(callback: () => void): () => void {
    initProductsListener();
    listeners.add(callback);
    
    // Sync cache with storage on each new subscription
    const currentStorage = readProductsFromStorage();
    if (JSON.stringify(currentStorage) !== JSON.stringify(cachedSnapshot)) {
        cachedSnapshot = currentStorage;
        // Notify all listeners of the change
        queueMicrotask(() => {
            for (const listener of listeners) {
                listener();
            }
        });
    }
    
    return () => listeners.delete(callback);
}

function updateProductsCache() {
    const newSnapshot = readProductsFromStorage();
    // Only update if actually changed
    if (JSON.stringify(newSnapshot) !== JSON.stringify(cachedSnapshot)) {
        cachedSnapshot = newSnapshot;
        for (const listener of listeners) {
            listener();
        }
    }
}

// ============================================================================
// Local Storage - Groups
// ============================================================================

const LOCAL_STORAGE_GROUPS_KEY = "shopping-list-groups";
const SERVER_SNAPSHOT_GROUPS: number[] = [];
let cachedSnapshotGroups: number[] = SERVER_SNAPSHOT_GROUPS;
const listenersGroups = new Set<() => void>();
let groupsInitialized = false;

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

function initGroupsListener() {
    if (groupsInitialized || typeof window === "undefined") return;
    groupsInitialized = true;
    
    // Initialize cache from storage
    cachedSnapshotGroups = readGroupsFromStorage();
    
    // Listen for storage events (cross-tab sync)
    window.addEventListener("storage", (e) => {
        if (e.key === LOCAL_STORAGE_GROUPS_KEY) {
            updateGroupsCache();
        }
    });
}

function subscribeGroups(callback: () => void): () => void {
    initGroupsListener();
    listenersGroups.add(callback);
    
    // Sync cache with storage on each new subscription
    const currentStorage = readGroupsFromStorage();
    if (JSON.stringify(currentStorage) !== JSON.stringify(cachedSnapshotGroups)) {
        cachedSnapshotGroups = currentStorage;
        // Notify all listeners of the change
        queueMicrotask(() => {
            for (const listener of listenersGroups) {
                listener();
            }
        });
    }
    
    return () => listenersGroups.delete(callback);
}

function updateGroupsCache() {
    const newSnapshot = readGroupsFromStorage();
    // Only update if actually changed
    if (JSON.stringify(newSnapshot) !== JSON.stringify(cachedSnapshotGroups)) {
        cachedSnapshotGroups = newSnapshot;
        for (const listener of listenersGroups) {
            listener();
        }
    }
}

// ============================================================================
// Query Keys
// ============================================================================

const LIST_QUERY_KEY = ["user-lists"];
const LIST_ITEMS_QUERY_KEY = ["list-items"];
const LIST_GROUP_ITEMS_QUERY_KEY = ["list-group-items"];

// ============================================================================
// Local Mode Hook
// ============================================================================

function useLocalAddToList(): UseAddToListReturn {
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

    const hasProduct = useCallback(
        (productId: number) => products.includes(productId),
        [products]
    );

    const hasGroup = useCallback(
        (groupId: number) => groups.includes(groupId),
        [groups]
    );

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

    const toggleProduct = useCallback(
        (productId: number) => {
            if (hasProduct(productId)) {
                removeProduct(productId);
            } else {
                addProduct(productId);
            }
        },
        [hasProduct, addProduct, removeProduct]
    );

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
    }, []);

    const toggleGroup = useCallback(
        (groupId: number) => {
            if (hasGroup(groupId)) {
                removeGroup(groupId);
            } else {
                addGroup(groupId);
            }
        },
        [hasGroup, addGroup, removeGroup]
    );

    return {
        hasProduct,
        hasGroup,
        isProductInList: hasProduct,
        isGroupInList: hasGroup,
        addProduct,
        removeProduct,
        addGroup,
        removeGroup,
        toggleProduct,
        toggleGroup,
        lists: undefined,
        isLoadingLists: false,
        createList: async () => undefined,
        isCreatingList: false,
        isLocalMode: true,
        isLoading: false,
        hasAnyGroup: groups.length > 0,
    };
}

// ============================================================================
// Database Mode Hook
// ============================================================================

function useDatabaseAddToList(enabled: boolean): UseAddToListReturn {
    const queryClient = useQueryClient();

    // Fetch user's lists - only when user is logged in
    const listsQuery = useQuery<ListSelect[]>({
        queryKey: LIST_QUERY_KEY,
        queryFn: async () => {
            const response = await fetch("/api/user/lists");
            if (!response.ok) throw new Error("Failed to fetch lists");
            return response.json();
        },
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled,
    });

    // Fetch all list items (products) - only when user is logged in
    const itemsQuery = useQuery<listItemsSelect[]>({
        queryKey: LIST_ITEMS_QUERY_KEY,
        queryFn: async () => {
            const response = await fetch("/api/user/lists/items");
            if (!response.ok) throw new Error("Failed to fetch list items");
            return response.json();
        },
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled,
    });

    // Fetch all list group items - only when user is logged in
    const groupItemsQuery = useQuery<listGroupItemsSelect[]>({
        queryKey: LIST_GROUP_ITEMS_QUERY_KEY,
        queryFn: async () => {
            const response = await fetch("/api/user/lists/groups");
            if (!response.ok) throw new Error("Failed to fetch group items");
            return response.json();
        },
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled,
    });

    // Check if product is in any list
    const hasProduct = useCallback(
        (productId: number) => {
            return itemsQuery.data?.some((item) => item.productId === productId) ?? false;
        },
        [itemsQuery.data]
    );

    // Check if group is in any list
    const hasGroup = useCallback(
        (groupId: number) => {
            return groupItemsQuery.data?.some((item) => item.groupId === groupId) ?? false;
        },
        [groupItemsQuery.data]
    );

    // Check if product is in a specific list
    const isProductInList = useCallback(
        (productId: number, listId: number) => {
            return (
                itemsQuery.data?.some(
                    (item) => item.productId === productId && item.listId === listId
                ) ?? false
            );
        },
        [itemsQuery.data]
    );

    // Check if group is in a specific list
    const isGroupInList = useCallback(
        (groupId: number, listId: number) => {
            return (
                groupItemsQuery.data?.some(
                    (item) => item.groupId === groupId && item.listId === listId
                ) ?? false
            );
        },
        [groupItemsQuery.data]
    );

    // Create list mutation
    const createListMutation = useMutation({
        mutationFn: async (name: string) => {
            const response = await fetch("/api/user/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (!response.ok) throw new Error("Failed to create list");
            return response.json() as Promise<ListSelect>;
        },
        onSuccess: (newList) => {
            queryClient.setQueryData<ListSelect[]>(LIST_QUERY_KEY, (old) =>
                old ? [...old, newList] : [newList]
            );
        },
    });

    // Add product mutation with optimistic update
    const addProductMutation = useMutation({
        mutationFn: async ({ productId, listId }: { productId: number; listId: number }) => {
            const response = await fetch("/api/user/lists/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId, productId }),
            });
            if (!response.ok) throw new Error("Failed to add product");
            return response.json() as Promise<listItemsSelect>;
        },
        onMutate: async ({ productId, listId }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: LIST_ITEMS_QUERY_KEY });
            // Snapshot previous value
            const previousItems = queryClient.getQueryData<listItemsSelect[]>(LIST_ITEMS_QUERY_KEY);
            // Optimistically update
            queryClient.setQueryData<listItemsSelect[]>(LIST_ITEMS_QUERY_KEY, (old) =>
                old ? [...old, { id: -1, listId, productId, amount: null }] : [{ id: -1, listId, productId, amount: null }]
            );
            return { previousItems };
        },
        onError: (_err, _variables, context) => {
            // Rollback on error
            if (context?.previousItems) {
                queryClient.setQueryData(LIST_ITEMS_QUERY_KEY, context.previousItems);
            }
        },
        onSuccess: (newItem) => {
            // Replace optimistic item with real one
            queryClient.setQueryData<listItemsSelect[]>(LIST_ITEMS_QUERY_KEY, (old) =>
                old?.map((item) =>
                    item.id === -1 && item.productId === newItem.productId && item.listId === newItem.listId
                        ? newItem
                        : item
                ) ?? [newItem]
            );
        },
    });

    // Remove product mutation with optimistic update
    const removeProductMutation = useMutation({
        mutationFn: async ({ productId, listId }: { productId: number; listId: number }) => {
            const response = await fetch("/api/user/lists/items", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId, productId }),
            });
            if (!response.ok) throw new Error("Failed to remove product");
            return { productId, listId };
        },
        onMutate: async ({ productId, listId }) => {
            await queryClient.cancelQueries({ queryKey: LIST_ITEMS_QUERY_KEY });
            const previousItems = queryClient.getQueryData<listItemsSelect[]>(LIST_ITEMS_QUERY_KEY);
            // Optimistically remove
            queryClient.setQueryData<listItemsSelect[]>(LIST_ITEMS_QUERY_KEY, (old) =>
                old?.filter((item) => !(item.productId === productId && item.listId === listId)) ?? []
            );
            return { previousItems };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData(LIST_ITEMS_QUERY_KEY, context.previousItems);
            }
        },
    });

    // Add group mutation with optimistic update
    const addGroupMutation = useMutation({
        mutationFn: async ({ groupId, listId }: { groupId: number; listId: number }) => {
            const response = await fetch("/api/user/lists/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId, groupId }),
            });
            if (!response.ok) throw new Error("Failed to add group");
            return response.json() as Promise<listGroupItemsSelect>;
        },
        onMutate: async ({ groupId, listId }) => {
            await queryClient.cancelQueries({ queryKey: LIST_GROUP_ITEMS_QUERY_KEY });
            const previousItems = queryClient.getQueryData<listGroupItemsSelect[]>(LIST_GROUP_ITEMS_QUERY_KEY);
            // Optimistically add
            queryClient.setQueryData<listGroupItemsSelect[]>(LIST_GROUP_ITEMS_QUERY_KEY, (old) =>
                old ? [...old, { id: -1, listId, groupId, amount: null, ignoredProducts: [] }] : [{ id: -1, listId, groupId, amount: null, ignoredProducts: [] }]
            );
            return { previousItems };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData(LIST_GROUP_ITEMS_QUERY_KEY, context.previousItems);
            }
        },
        onSuccess: (newItem) => {
            queryClient.setQueryData<listGroupItemsSelect[]>(LIST_GROUP_ITEMS_QUERY_KEY, (old) =>
                old?.map((item) =>
                    item.id === -1 && item.groupId === newItem.groupId && item.listId === newItem.listId
                        ? newItem
                        : item
                ) ?? [newItem]
            );
        },
    });

    // Remove group mutation with optimistic update
    const removeGroupMutation = useMutation({
        mutationFn: async ({ groupId, listId }: { groupId: number; listId: number }) => {
            const response = await fetch("/api/user/lists/groups", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId, groupId }),
            });
            if (!response.ok) throw new Error("Failed to remove group");
            return { groupId, listId };
        },
        onMutate: async ({ groupId, listId }) => {
            await queryClient.cancelQueries({ queryKey: LIST_GROUP_ITEMS_QUERY_KEY });
            const previousItems = queryClient.getQueryData<listGroupItemsSelect[]>(LIST_GROUP_ITEMS_QUERY_KEY);
            // Optimistically remove
            queryClient.setQueryData<listGroupItemsSelect[]>(LIST_GROUP_ITEMS_QUERY_KEY, (old) =>
                old?.filter((item) => !(item.groupId === groupId && item.listId === listId)) ?? []
            );
            return { previousItems };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData(LIST_GROUP_ITEMS_QUERY_KEY, context.previousItems);
            }
        },
    });

    // Get the listId for a product (to know which list to remove from)
    const getProductListId = useCallback(
        (productId: number) => {
            const item = itemsQuery.data?.find((i) => i.productId === productId);
            return item?.listId;
        },
        [itemsQuery.data]
    );

    // Get the listId for a group (to know which list to remove from)
    const getGroupListId = useCallback(
        (groupId: number) => {
            const item = groupItemsQuery.data?.find((i) => i.groupId === groupId);
            return item?.listId;
        },
        [groupItemsQuery.data]
    );

    return {
        hasProduct,
        hasGroup,
        isProductInList,
        isGroupInList,
        addProduct: (productId, listId) => {
            if (listId === undefined) {
                console.warn("listId is required for logged-in users");
                return;
            }
            addProductMutation.mutate({ productId, listId });
        },
        removeProduct: (productId, listId) => {
            const targetListId = listId ?? getProductListId(productId);
            if (targetListId === undefined) {
                console.warn("Could not determine listId for product removal");
                return;
            }
            removeProductMutation.mutate({ productId, listId: targetListId });
        },
        addGroup: (groupId, listId) => {
            if (listId === undefined) {
                console.warn("listId is required for logged-in users");
                return;
            }
            addGroupMutation.mutate({ groupId, listId });
        },
        removeGroup: (groupId, listId) => {
            const targetListId = listId ?? getGroupListId(groupId);
            if (targetListId === undefined) {
                console.warn("Could not determine listId for group removal");
                return;
            }
            removeGroupMutation.mutate({ groupId, listId: targetListId });
        },
        toggleProduct: (productId, listId) => {
            if (listId !== undefined) {
                if (isProductInList(productId, listId)) {
                    removeProductMutation.mutate({ productId, listId });
                } else {
                    addProductMutation.mutate({ productId, listId });
                }
            } else {
                // If no listId provided, remove from wherever it exists
                const existingListId = getProductListId(productId);
                if (existingListId !== undefined) {
                    removeProductMutation.mutate({ productId, listId: existingListId });
                }
            }
        },
        toggleGroup: (groupId, listId) => {
            if (listId !== undefined) {
                if (isGroupInList(groupId, listId)) {
                    removeGroupMutation.mutate({ groupId, listId });
                } else {
                    addGroupMutation.mutate({ groupId, listId });
                }
            } else {
                const existingListId = getGroupListId(groupId);
                if (existingListId !== undefined) {
                    removeGroupMutation.mutate({ groupId, listId: existingListId });
                }
            }
        },
        lists: listsQuery.data,
        isLoadingLists: listsQuery.isLoading,
        createList: (name) => createListMutation.mutateAsync(name),
        isCreatingList: createListMutation.isPending,
        isLocalMode: false,
        isLoading: itemsQuery.isLoading || groupItemsQuery.isLoading,
        hasAnyGroup: (groupItemsQuery.data?.length ?? 0) > 0,
    };
}

// ============================================================================
// Main Hook
// ============================================================================

export function useAddToList(): UseAddToListReturn {
    const { user, isLoading: isUserLoading } = useUser();

    const isLocalMode = !user;

    const localResult = useLocalAddToList();
    const dbResult = useDatabaseAddToList(!!user);

    if (isUserLoading) {
        return {
            hasProduct: () => false,
            hasGroup: () => false,
            isProductInList: () => false,
            isGroupInList: () => false,
            addProduct: () => {},
            removeProduct: () => {},
            addGroup: () => {},
            removeGroup: () => {},
            toggleProduct: () => {},
            toggleGroup: () => {},
            lists: undefined,
            isLoadingLists: true,
            createList: async () => undefined,
            isCreatingList: false,
            isLocalMode: true,
            isLoading: true,
            hasAnyGroup: false,
        };
    }

    if (isLocalMode) {
        return localResult;
    }

    return dbResult;
}

"use client";

// ============================================================================
// Shared Local Storage Store for List Items
// This module provides a single source of truth for localStorage-based list data
// Both use-add-to-list.ts and use-list-items.ts use this module
// ============================================================================

// ============================================================================
// Products Store
// ============================================================================

const LOCAL_STORAGE_KEY = "shopping-list";
const SERVER_SNAPSHOT: number[] = [];
let cachedProducts: number[] = SERVER_SNAPSHOT;
const productListeners = new Set<() => void>();
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

function initProductsListener() {
    if (productsInitialized || typeof window === "undefined") return;
    productsInitialized = true;

    // Initialize cache from storage
    cachedProducts = readProductsFromStorage();

    // Listen for storage events (cross-tab sync)
    window.addEventListener("storage", (e) => {
        if (e.key === LOCAL_STORAGE_KEY) {
            updateProductsCache();
        }
    });
}

export function getProductsSnapshot(): number[] {
    return cachedProducts;
}

export function getProductsServerSnapshot(): number[] {
    return SERVER_SNAPSHOT;
}

export function subscribeProducts(callback: () => void): () => void {
    initProductsListener();
    productListeners.add(callback);

    // Sync cache with storage on each new subscription
    const currentStorage = readProductsFromStorage();
    if (JSON.stringify(currentStorage) !== JSON.stringify(cachedProducts)) {
        cachedProducts = currentStorage;
        // Notify all listeners of the change
        queueMicrotask(() => {
            for (const listener of productListeners) {
                listener();
            }
        });
    }

    return () => productListeners.delete(callback);
}

export function updateProductsCache() {
    const newSnapshot = readProductsFromStorage();
    // Only update if actually changed
    if (JSON.stringify(newSnapshot) !== JSON.stringify(cachedProducts)) {
        cachedProducts = newSnapshot;
        for (const listener of productListeners) {
            listener();
        }
    }
}

export function addLocalProduct(productId: number) {
    const current = readProductsFromStorage();
    if (!current.includes(productId)) {
        const updated = [...current, productId];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        updateProductsCache();
    }
}

export function removeLocalProduct(productId: number) {
    const current = readProductsFromStorage();
    const updated = current.filter((id) => id !== productId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    updateProductsCache();
}

// ============================================================================
// Groups Store
// ============================================================================

const LOCAL_STORAGE_GROUPS_KEY = "shopping-list-groups";
const SERVER_SNAPSHOT_GROUPS: number[] = [];
let cachedGroups: number[] = SERVER_SNAPSHOT_GROUPS;
const groupListeners = new Set<() => void>();
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

function initGroupsListener() {
    if (groupsInitialized || typeof window === "undefined") return;
    groupsInitialized = true;

    // Initialize cache from storage
    cachedGroups = readGroupsFromStorage();

    // Listen for storage events (cross-tab sync)
    window.addEventListener("storage", (e) => {
        if (e.key === LOCAL_STORAGE_GROUPS_KEY) {
            updateGroupsCache();
        }
    });
}

export function getGroupsSnapshot(): number[] {
    return cachedGroups;
}

export function getGroupsServerSnapshot(): number[] {
    return SERVER_SNAPSHOT_GROUPS;
}

export function subscribeGroups(callback: () => void): () => void {
    initGroupsListener();
    groupListeners.add(callback);

    // Sync cache with storage on each new subscription
    const currentStorage = readGroupsFromStorage();
    if (JSON.stringify(currentStorage) !== JSON.stringify(cachedGroups)) {
        cachedGroups = currentStorage;
        // Notify all listeners of the change
        queueMicrotask(() => {
            for (const listener of groupListeners) {
                listener();
            }
        });
    }

    return () => groupListeners.delete(callback);
}

export function updateGroupsCache() {
    const newSnapshot = readGroupsFromStorage();
    // Only update if actually changed
    if (JSON.stringify(newSnapshot) !== JSON.stringify(cachedGroups)) {
        cachedGroups = newSnapshot;
        for (const listener of groupListeners) {
            listener();
        }
    }
}

export function addLocalGroup(groupId: number) {
    const current = readGroupsFromStorage();
    if (!current.includes(groupId)) {
        const updated = [...current, groupId];
        localStorage.setItem(LOCAL_STORAGE_GROUPS_KEY, JSON.stringify(updated));
        updateGroupsCache();
    }
}

export function removeLocalGroup(groupId: number) {
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
}

// ============================================================================
// Ignored Products Store
// ============================================================================

const LOCAL_STORAGE_IGNORED_KEY = "shopping-list-ignored";
const SERVER_SNAPSHOT_IGNORED: Record<number, number[]> = {};
let cachedIgnored: Record<number, number[]> = SERVER_SNAPSHOT_IGNORED;
const ignoredListeners = new Set<() => void>();
let ignoredInitialized = false;

function readIgnoredFromStorage(): Record<number, number[]> {
    if (typeof window === "undefined") return SERVER_SNAPSHOT_IGNORED;
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_IGNORED_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

function initIgnoredListener() {
    if (ignoredInitialized || typeof window === "undefined") return;
    ignoredInitialized = true;

    // Initialize cache from storage
    cachedIgnored = readIgnoredFromStorage();

    // Listen for storage events (cross-tab sync)
    window.addEventListener("storage", (e) => {
        if (e.key === LOCAL_STORAGE_IGNORED_KEY) {
            updateIgnoredCache();
        }
    });
}

export function getIgnoredSnapshot(): Record<number, number[]> {
    return cachedIgnored;
}

export function getIgnoredServerSnapshot(): Record<number, number[]> {
    return SERVER_SNAPSHOT_IGNORED;
}

export function subscribeIgnored(callback: () => void): () => void {
    initIgnoredListener();
    ignoredListeners.add(callback);

    // Sync cache with storage on each new subscription
    const currentStorage = readIgnoredFromStorage();
    if (JSON.stringify(currentStorage) !== JSON.stringify(cachedIgnored)) {
        cachedIgnored = currentStorage;
        // Notify all listeners of the change
        queueMicrotask(() => {
            for (const listener of ignoredListeners) {
                listener();
            }
        });
    }

    return () => ignoredListeners.delete(callback);
}

export function updateIgnoredCache() {
    const newSnapshot = readIgnoredFromStorage();
    // Only update if actually changed
    if (JSON.stringify(newSnapshot) !== JSON.stringify(cachedIgnored)) {
        cachedIgnored = newSnapshot;
        for (const listener of ignoredListeners) {
            listener();
        }
    }
}

export function ignoreLocalProduct(groupId: number, productId: number) {
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
}

export function restoreLocalProduct(groupId: number, productId: number) {
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
}

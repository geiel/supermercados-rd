"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Info, Loader2, Pencil, ShoppingCart, Smartphone, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ProductItems } from "@/components/products-items";
import { EditListDialog } from "@/components/edit-list-dialog";
import { LoginDialog } from "@/components/login-dialog";
import { useListItems } from "@/hooks/use-list-items";
import { useListStats } from "@/hooks/use-list-stats";
import { useShops } from "@/hooks/use-shops";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserList } from "@/hooks/use-user-list";
import { updateListSelectedShops } from "@/lib/compare";
import type { CompareMode } from "@/lib/list-calculations";
import type { shopsSelect } from "@/db/schema";

// ============================================================================
// Local Storage Keys
// ============================================================================

const LOCAL_SHOPS_KEY = "shopping-list-shops";

function getLocalSelectedShops(): number[] {
    if (typeof window === "undefined") return [];
    try {
        const stored = localStorage.getItem(LOCAL_SHOPS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function setLocalSelectedShops(shopIds: number[]) {
    localStorage.setItem(LOCAL_SHOPS_KEY, JSON.stringify(shopIds));
}

// ============================================================================
// Types
// ============================================================================

type ListPageProps = {
    /** For logged users - the list ID */
    listId?: number;
    /** List name to display */
    listName?: string;
};

// ============================================================================
// Main List Page Component
// ============================================================================

export function ListPage({ listId, listName = "Lista de compras" }: ListPageProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const isMobile = useIsMobile();

    // 1. Get shops (cached)
    const { data: shops, isLoading: isLoadingShops } = useShops();

    // 2. Get items from unified hook
    const listItems = useListItems({ listId });

    // 3. Get user list data (for logged-in users to get saved selectedShops)
    const { data: userList, isLoading: isLoadingUserList } = useUserList(listId);

    // State for selected shops
    const [selectedShops, setSelectedShops] = useState<number[]>([]);
    const [hasInitializedShops, setHasInitializedShops] = useState(false);

    // Track which drawer/dialog is open (by rowKey)
    const [openRowKey, setOpenRowKey] = useState<string | null>(null);

    // Track loading states for individual items
    const [loadingProductIds, setLoadingProductIds] = useState<Set<number>>(new Set());
    const [loadingGroupIds, setLoadingGroupIds] = useState<Set<number>>(new Set());

    // Edit list dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    // Login dialog state (for local mode)
    const [loginDialogOpen, setLoginDialogOpen] = useState(false);

    // Get compare mode from URL
    const compareMode: CompareMode = searchParams.get("compare") === "value" ? "value" : "cheapest";

    // 4. Get stats (depends on items)
    const stats = useListStats({
        products: listItems.products,
        groups: listItems.groups,
        ignoredByGroup: listItems.ignoredByGroup,
        selectedShops: selectedShops.length > 0 ? selectedShops : undefined,
        compareMode,
        enabled: hasInitializedShops && !listItems.isLoading,
    });

    // Initialize selected shops from database (logged-in) or localStorage (guest)
    useEffect(() => {
        if (hasInitializedShops) return;

        if (listItems.isLocalMode) {
            // Guest user: load from localStorage
            const stored = getLocalSelectedShops();
            if (stored.length > 0) {
                setSelectedShops(stored);
            }
            setHasInitializedShops(true);
        } else if (!isLoadingUserList) {
            // Logged-in user: load from database
            if (userList?.selectedShops && userList.selectedShops.length > 0) {
                // Convert string[] from DB to number[]
                const shopIds = userList.selectedShops
                    .map((id) => Number(id))
                    .filter(Number.isFinite);
                if (shopIds.length > 0) {
                    setSelectedShops(shopIds);
                }
            }
            setHasInitializedShops(true);
        }
    }, [listItems.isLocalMode, isLoadingUserList, userList, hasInitializedShops]);

    // Handlers
    const handleCompareModeChange = useCallback((nextValue: string) => {
        const nextMode: CompareMode = nextValue === "value" ? "value" : "cheapest";
        const params = new URLSearchParams(searchParams.toString());

        if (nextMode === "cheapest") {
            params.delete("compare");
        } else {
            params.set("compare", nextMode);
        }

        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [searchParams, router, pathname]);

    const handleShopSelectionChange = useCallback((nextShops: number[], nextCompareMode: CompareMode) => {
        setSelectedShops(nextShops);
        if (listItems.isLocalMode) {
            setLocalSelectedShops(nextShops);
        } else if (listId) {
            // Save to database for logged-in users
            updateListSelectedShops(listId, nextShops);
        }
        
        // Update compare mode if it changed
        if (nextCompareMode !== compareMode) {
            handleCompareModeChange(nextCompareMode);
        }
    }, [listItems.isLocalMode, listId, compareMode, handleCompareModeChange]);

    const handleDeleteProduct = useCallback(async (productId: number) => {
        setLoadingProductIds((prev) => new Set([...prev, productId]));
        listItems.removeProduct(productId);
        // Wait for stats to update, then close drawer and clear loading
        await stats.refetch();
        setOpenRowKey(null);
        setLoadingProductIds((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
        });
    }, [listItems, stats]);

    const handleDeleteGroup = useCallback(async (groupId: number) => {
        setLoadingGroupIds((prev) => new Set([...prev, groupId]));
        listItems.removeGroup(groupId);
        // Wait for stats to update, then close drawer and clear loading
        await stats.refetch();
        setOpenRowKey(null);
        setLoadingGroupIds((prev) => {
            const next = new Set(prev);
            next.delete(groupId);
            return next;
        });
    }, [listItems, stats]);

    const handleIgnoreProduct = useCallback(async (groupId: number, productId: number) => {
        setLoadingProductIds((prev) => new Set([...prev, productId]));
        listItems.ignoreProduct(groupId, productId);
        // Wait for stats to update, then clear loading
        await stats.refetch();
        setLoadingProductIds((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
        });
    }, [listItems, stats]);

    const handleRestoreProduct = useCallback(async (groupId: number, productId: number) => {
        setLoadingProductIds((prev) => new Set([...prev, productId]));
        listItems.restoreProduct(groupId, productId);
        // Wait for stats to update, then clear loading
        await stats.refetch();
        setLoadingProductIds((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
        });
    }, [listItems, stats]);

    // Handle list deletion - navigate back to lists page
    const handleListDeleted = useCallback(() => {
        router.push("/lists");
    }, [router]);

    const displayName = userList?.name ?? listName;

    // Empty list state
    if (listItems.products.length === 0 && listItems.groups.length === 0 && !listItems.isLoading) {
        return (
            <div className="container mx-auto pb-4 px-2 max-w-4xl">
                {/* Header */}
                <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                        <div className="font-bold text-2xl">{displayName}</div>
                        {listId && userList && (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setEditDialogOpen(true)}
                                aria-label="Editar lista"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Info banner for local storage (guest users) */}
                {listItems.isLocalMode && (
                    <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
                        <div className="flex-1 space-y-2">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                Esta lista se guarda solo en este dispositivo. Para acceder desde cualquier dispositivo, inicia sesión.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-amber-300 bg-white text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
                                onClick={() => setLoginDialogOpen(true)}
                            >
                                Iniciar sesión
                            </Button>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                <Empty className="mt-8">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ShoppingCart />
                        </EmptyMedia>
                        <EmptyTitle>Tu lista está vacía</EmptyTitle>
                        <EmptyDescription>
                            Agrega productos desde las ofertas o el explorador.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>

                {/* Login Dialog (for local mode) */}
                {listItems.isLocalMode && (
                    <LoginDialog
                        open={loginDialogOpen}
                        onOpenChange={setLoginDialogOpen}
                        hideTrigger
                        customTitle="Sincroniza tus listas"
                        customDescription="Inicia sesión para acceder a tus listas desde cualquier dispositivo."
                    />
                )}

                {/* Edit List Dialog */}
                {listId && userList && (
                    <EditListDialog
                        list={userList}
                        open={editDialogOpen}
                        onOpenChange={setEditDialogOpen}
                        onDeleted={handleListDeleted}
                    />
                )}
            </div>
        );
    }

    // First load skeleton
    if (listItems.isLoading || isLoadingShops || isLoadingUserList || (stats.isLoading && !stats.entriesWithShop.length)) {
        return <ListSkeleton />;
    }

    // No shops available
    if (!shops || shops.length === 0) {
        return (
            <div className="container mx-auto pb-4 px-2 max-w-4xl">
                <div className="text-center py-8 text-muted-foreground">
                    Error al cargar las tiendas.
                </div>
            </div>
        );
    }
    const shopsGroupedKeys = Object.keys(stats.shopsGrouped);
    const isRecalculating = stats.isFetching;

    return (
        <div className="container mx-auto pb-4 px-2 max-w-4xl">
            <div className="flex flex-1 flex-col">
                {/* Header */}
                <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                        <div className="font-bold text-2xl">{displayName}</div>
                        {/* Edit button - only for logged users with a list */}
                        {listId && userList && (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setEditDialogOpen(true)}
                                aria-label="Editar lista"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <div>
                        <ShopSelector
                            shops={shops}
                            selectedShops={selectedShops}
                            cheapestSingleShopIds={stats.cheapestSingleShopIds}
                            cheapestPairShopIds={stats.cheapestPairShopIds}
                            bestValueSingleShopIds={stats.bestValueSingleShopIds}
                            bestValuePairShopIds={stats.bestValuePairShopIds}
                            onSelectionChange={handleShopSelectionChange}
                            isMobile={isMobile}
                            isRecalculating={isRecalculating}
                        />
                    </div>
                </div>

                {/* Info banner for local storage (guest users) */}
                {listItems.isLocalMode && (
                    <div className="mt-2 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
                        <div className="flex-1 space-y-2">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                Esta lista se guarda solo en este dispositivo. Para acceder desde cualquier dispositivo, inicia sesión.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-amber-300 bg-white text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
                                onClick={() => setLoginDialogOpen(true)}
                            >
                                Iniciar sesión
                            </Button>
                        </div>
                    </div>
                )}

                {/* Controls and Summary */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Tabs value={compareMode} onValueChange={handleCompareModeChange}>
                        <TabsList>
                            <TabsTrigger value="cheapest" disabled={isRecalculating}>
                                Mas barato
                            </TabsTrigger>
                            <TabsTrigger value="value" disabled={isRecalculating}>
                                Mejor valor
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="flex flex-wrap items-center gap-3">
                        <div>
                            Total <span className="font-bold">RD${stats.totalPrice.toFixed(2)}</span>
                        </div>

                        <div>
                            Productos <span className="font-bold">{stats.totalProducts}</span>
                        </div>

                        {compareMode === "value" && stats.selectedValueScore !== null ? (
                            <div className="flex items-center">
                                <div>
                                    Índice de eficiencia{" "}
                                    <span className="font-bold">{stats.selectedValueScore.toFixed(1)}</span>
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label="Cómo funciona el índice de eficiencia"
                                        >
                                            <Info className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="text-sm">
                                        Más alto = mejor valor. <br /> Explora cómo funciona.{" "}
                                        <Link href="/value-score" className="underline">
                                            Leer más
                                        </Link>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Loading overlay for mode/shop changes */}
                {isRecalculating && stats.entriesWithShop.length > 0 && (
                    <div className="py-2 text-center text-muted-foreground text-sm">
                        <Loader2 className="inline-block h-4 w-4 animate-spin mr-2" />
                        Recalculando...
                    </div>
                )}

                {/* Product List by Shop */}
                {shopsGroupedKeys.map((shop) => {
                    const items = stats.shopsGrouped[shop];
                    if (!items || items.length === 0) return null;

                    const shopTotalPrice = items.reduce((acc, entry) => {
                        const unitPrice = entry.product.shopCurrentPrices[0]?.currentPrice;
                        const quantity = entry.amount && entry.amount > 0 ? entry.amount : 1;
                        return acc + (unitPrice ? Number(unitPrice) : 0) * quantity;
                    }, 0);

                    return (
                        <section key={shop}>
                            <div className="py-4 flex justify-between items-center">
                                <div>
                                    <Image
                                        src={`/supermarket-logo/${items[0].product.shopCurrentPrices[0]?.shop.logo}`}
                                        width={0}
                                        height={0}
                                        className="w-[50px] h-auto"
                                        alt="Supermarket logo"
                                        unoptimized
                                    />
                                </div>
                                <div className="font-bold">RD${shopTotalPrice.toFixed(2)}</div>
                            </div>
                            <ProductItems
                                items={items as never}
                                openRowKey={openRowKey}
                                onOpenChange={setOpenRowKey}
                                onLocalDeleteProduct={handleDeleteProduct}
                                onLocalDeleteGroup={handleDeleteGroup}
                                onLocalIgnoreProduct={handleIgnoreProduct}
                                onLocalRestoreProduct={handleRestoreProduct}
                                loadingProductIds={loadingProductIds}
                                loadingGroupIds={loadingGroupIds}
                            />
                        </section>
                    );
                })}

                {/* Products not available in selected shops */}
                {stats.entriesWithoutShop.length > 0 ? (
                    <section>
                        <div className="py-4">No disponible en las tiendas seleccionadas</div>
                        <ProductItems
                            items={stats.entriesWithoutShop as never}
                            openRowKey={openRowKey}
                            onOpenChange={setOpenRowKey}
                            onLocalDeleteProduct={handleDeleteProduct}
                            onLocalDeleteGroup={handleDeleteGroup}
                            onLocalIgnoreProduct={handleIgnoreProduct}
                            onLocalRestoreProduct={handleRestoreProduct}
                            loadingProductIds={loadingProductIds}
                            loadingGroupIds={loadingGroupIds}
                        />
                    </section>
                ) : null}
            </div>

            {/* Edit List Dialog */}
            {listId && userList && (
                <EditListDialog
                    list={userList}
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    onDeleted={handleListDeleted}
                />
            )}

            {/* Login Dialog (for local mode) */}
            {listItems.isLocalMode && (
                <LoginDialog
                    open={loginDialogOpen}
                    onOpenChange={setLoginDialogOpen}
                    hideTrigger
                    customTitle="Sincroniza tus listas"
                    customDescription="Inicia sesión para acceder a tus listas desde cualquier dispositivo."
                />
            )}
        </div>
    );
}

// ============================================================================
// Skeleton Component
// ============================================================================

function ListSkeleton() {
    return (
        <div className="container mx-auto pb-4 px-2 max-w-4xl">
            <div className="flex flex-1 flex-col gap-4">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-10 rounded-md" />
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Skeleton className="h-10 w-64" />
                    <div className="flex gap-3">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-24" />
                    </div>
                </div>

                {/* Shop section */}
                <div className="py-4 flex justify-between items-center">
                    <Skeleton className="h-12 w-12" />
                    <Skeleton className="h-6 w-20" />
                </div>

                {/* Product items */}
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// Shop Selector Component
// ============================================================================

type ShopSelectorProps = {
    shops: shopsSelect[];
    selectedShops: number[];
    cheapestSingleShopIds: number[];
    cheapestPairShopIds: number[];
    bestValueSingleShopIds: number[];
    bestValuePairShopIds: number[];
    onSelectionChange: (shopIds: number[], compareMode: CompareMode) => void;
    isMobile: boolean;
    isRecalculating?: boolean;
};

function ShopSelector({
    shops,
    selectedShops,
    cheapestSingleShopIds,
    cheapestPairShopIds,
    bestValueSingleShopIds,
    bestValuePairShopIds,
    onSelectionChange,
    isMobile,
    isRecalculating,
}: ShopSelectorProps) {
    const [open, setOpen] = useState(false);

    const content = (
        <ShopSelectorList
            shops={shops}
            selectedShops={selectedShops}
            cheapestSingleShopIds={cheapestSingleShopIds}
            cheapestPairShopIds={cheapestPairShopIds}
            bestValueSingleShopIds={bestValueSingleShopIds}
            bestValuePairShopIds={bestValuePairShopIds}
            onSelectionChange={(nextShops, nextCompareMode) => {
                onSelectionChange(nextShops, nextCompareMode);
                setOpen(false);
            }}
        />
    );

    const triggerButton = (
        <Button className="relative" variant="outline" size="icon">
            {(isRecalculating || selectedShops.length > 0) && (
                <div className="absolute top-[-5px] right-[-5px]">
                    {isRecalculating ? (
                        <Badge className="h-5 min-w-5 rounded-full px-1" variant="destructive">
                            <Loader2 className="h-3 w-3 animate-spin" />
                        </Badge>
                    ) : (
                        <Badge className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums" variant="destructive">
                            {selectedShops.length}
                        </Badge>
                    )}
                </div>
            )}
            <Store />
        </Button>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Selecciona supermercado</DrawerTitle>
                    </DrawerHeader>
                    {content}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{triggerButton}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Selecciona supermercado</DialogTitle>
                </DialogHeader>
                {content}
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// Shop Selector List
// ============================================================================

type ShopSelectorListProps = {
    shops: shopsSelect[];
    selectedShops: number[];
    cheapestSingleShopIds: number[];
    cheapestPairShopIds: number[];
    bestValueSingleShopIds: number[];
    bestValuePairShopIds: number[];
    onSelectionChange: (shopIds: number[], compareMode: CompareMode) => void;
};

const areSameSelection = (left: number[], right: number[]) => {
    if (left.length !== right.length) return false;
    const rightSet = new Set(right);
    return left.every((id) => rightSet.has(id));
};

function ShopSelectorList({
    shops,
    selectedShops: initialSelectedShops,
    cheapestSingleShopIds,
    cheapestPairShopIds,
    bestValueSingleShopIds,
    bestValuePairShopIds,
    onSelectionChange,
}: ShopSelectorListProps) {
    const searchParams = useSearchParams();
    const [selectedShops, setSelectedShops] = useState<number[]>(initialSelectedShops);

    const currentCompareMode: CompareMode = searchParams.get("compare") === "value" ? "value" : "cheapest";
    const [pendingCompareMode, setPendingCompareMode] = useState<CompareMode>(currentCompareMode);

    useEffect(() => {
        setPendingCompareMode(currentCompareMode);
    }, [currentCompareMode]);

    const activeSingleShopIds = pendingCompareMode === "value" ? bestValueSingleShopIds : cheapestSingleShopIds;
    const activePairShopIds = pendingCompareMode === "value" ? bestValuePairShopIds : cheapestPairShopIds;
    const canSelectSingle = activeSingleShopIds.length > 0;
    const canSelectPair = activePairShopIds.length > 0;
    const isSingleSelected = canSelectSingle && areSameSelection(selectedShops, activeSingleShopIds);
    const isPairSelected = canSelectPair && areSameSelection(selectedShops, activePairShopIds);

    const getPreferredCount = () => {
        if (isPairSelected) return "pair";
        if (isSingleSelected) return "single";
        return selectedShops.length > 1 ? "pair" : "single";
    };

    const applySelectionForMode = (nextMode: CompareMode) => {
        const nextSingle = nextMode === "value" ? bestValueSingleShopIds : cheapestSingleShopIds;
        const nextPair = nextMode === "value" ? bestValuePairShopIds : cheapestPairShopIds;
        const preferredCount = getPreferredCount();

        if (preferredCount === "pair" && nextPair.length > 0) {
            setSelectedShops(nextPair);
            return;
        }

        if (nextSingle.length > 0) {
            setSelectedShops(nextSingle);
        }
    };

    const shopAmount = selectedShops.length === 0 ? shops.length : selectedShops.length;

    return (
        <div className="grid grid-cols-2 justify-items-stretch gap-4 p-4 md:p-0">
            <div className="col-span-2 flex flex-col">
                <div className="flex flex-wrap md:flex-nowrap items-center justify-end md:justify-between gap-2">
                    <div className="flex items-center rounded-full border border-border bg-muted/50 p-1">
                        <Toggle
                            type="button"
                            variant="default"
                            className="h-9 rounded-full px-3 text-xs font-semibold text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
                            pressed={pendingCompareMode === "cheapest"}
                            onPressedChange={(pressed) => {
                                if (!pressed) return;
                                setPendingCompareMode("cheapest");
                                applySelectionForMode("cheapest");
                            }}
                        >
                            Mas barato
                        </Toggle>
                        <Toggle
                            type="button"
                            variant="default"
                            className="h-9 rounded-full px-3 text-xs font-semibold text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
                            pressed={pendingCompareMode === "value"}
                            onPressedChange={(pressed) => {
                                if (!pressed) return;
                                setPendingCompareMode("value");
                                applySelectionForMode("value");
                            }}
                        >
                            Mejor valor
                        </Toggle>
                    </div>
                    <div className="flex items-center rounded-full border border-border bg-muted/50 p-1">
                        <Toggle
                            type="button"
                            variant="default"
                            className="h-9 rounded-full px-3 text-xs font-semibold text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
                            disabled={!canSelectSingle}
                            pressed={isSingleSelected}
                            onPressedChange={(pressed) => {
                                if (!pressed || !canSelectSingle) return;
                                setSelectedShops(activeSingleShopIds);
                            }}
                        >
                            1 tienda
                        </Toggle>
                        <Toggle
                            type="button"
                            variant="default"
                            className="h-9 rounded-full px-3 text-xs font-semibold text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
                            disabled={!canSelectPair}
                            pressed={isPairSelected}
                            onPressedChange={(pressed) => {
                                if (!pressed || !canSelectPair) return;
                                setSelectedShops(activePairShopIds);
                            }}
                        >
                            2 tiendas
                        </Toggle>
                    </div>
                </div>
            </div>

            <Separator className="col-span-2" />

            {shops.map((shop) => (
                <Toggle
                    key={shop.id}
                    variant="outline"
                    className="h-[50px]"
                    pressed={selectedShops.includes(shop.id)}
                    onPressedChange={(pressed) => {
                        setSelectedShops((current) =>
                            pressed ? [...current, shop.id] : current.filter((id) => id !== shop.id)
                        );
                    }}
                >
                    <Image
                        src={`/supermarket-logo/${shop.logo}`}
                        width={0}
                        height={0}
                        className="w-[60px] h-auto"
                        alt="Supermarket logo"
                        unoptimized
                    />
                </Toggle>
            ))}

            <Button
                className="col-span-2 min-w-[200px]"
                aria-label={`Comparar ${shopAmount} Tiendas`}
                onClick={() => onSelectionChange(selectedShops, pendingCompareMode)}
            >
                Comparar {shopAmount} Tiendas
            </Button>
        </div>
    );
}

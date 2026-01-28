"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Info, Loader2, Eye, Store, FileX } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useListStats } from "@/hooks/use-list-stats";
import { useShops } from "@/hooks/use-shops";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CompareMode } from "@/lib/list-calculations";
import type { shopsSelect, listItemsSelect, listGroupItemsSelect } from "@/db/schema";

// ============================================================================
// Types
// ============================================================================

type SharedListData = {
    id: number;
    name: string;
    selectedShops: string[];
    updatedAt: string;
    items: listItemsSelect[];
    groupItems: listGroupItemsSelect[];
    owner?: {
        id: string;
        name?: string;
    };
};

type SharedListPageProps = {
    listId: number;
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return "hace unos segundos";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `hace ${diffInMinutes} ${diffInMinutes === 1 ? "minuto" : "minutos"}`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `hace ${diffInHours} ${diffInHours === 1 ? "hora" : "horas"}`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `hace ${diffInDays} ${diffInDays === 1 ? "día" : "días"}`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
        return `hace ${diffInWeeks} ${diffInWeeks === 1 ? "semana" : "semanas"}`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `hace ${diffInMonths} ${diffInMonths === 1 ? "mes" : "meses"}`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `hace ${diffInYears} ${diffInYears === 1 ? "año" : "años"}`;
}

function formatAbsoluteDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate();
    const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============================================================================
// Main Shared List Page Component
// ============================================================================

export function SharedListPage({ listId }: SharedListPageProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const isMobile = useIsMobile();

    // Fetch shared list data
    const { data: sharedList, isLoading: isLoadingList, error } = useQuery<SharedListData>({
        queryKey: ["shared-list", listId],
        queryFn: async () => {
            const response = await fetch(`/api/shared/${listId}`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Lista no encontrada");
                }
                throw new Error("Error al cargar la lista");
            }
            return response.json();
        },
        retry: false, // Don't retry on 404 errors
    });

    // Get shops (cached)
    const { data: shops, isLoading: isLoadingShops } = useShops();

    // State for selected shops
    const [selectedShops, setSelectedShops] = useState<number[]>([]);
    const [hasInitializedShops, setHasInitializedShops] = useState(false);

    // Get compare mode from URL
    const compareMode: CompareMode = searchParams.get("compare") === "value" ? "value" : "cheapest";

    // Extract product and group IDs from shared list data
    const productIds = sharedList?.items.map((item) => item.productId) ?? [];
    const groupIds = sharedList?.groupItems.map((item) => item.groupId) ?? [];
    const ignoredByGroup: Record<number, number[]> = {};
    sharedList?.groupItems.forEach((item) => {
        if (item.ignoredProducts && item.ignoredProducts.length > 0) {
            ignoredByGroup[item.groupId] = item.ignoredProducts.map(Number);
        }
    });

    // Get stats (depends on items)
    const stats = useListStats({
        products: productIds,
        groups: groupIds,
        ignoredByGroup,
        selectedShops: selectedShops.length > 0 ? selectedShops : undefined,
        compareMode,
        enabled: hasInitializedShops && !isLoadingList && !!sharedList,
    });

    // Initialize selected shops from shared list data
    useEffect(() => {
        if (hasInitializedShops || !sharedList) return;

        if (sharedList.selectedShops && sharedList.selectedShops.length > 0) {
            const shopIds = sharedList.selectedShops
                .map((id) => Number(id))
                .filter(Number.isFinite);
            if (shopIds.length > 0) {
                setSelectedShops(shopIds);
            }
        }
        setHasInitializedShops(true);
    }, [sharedList, hasInitializedShops]);

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
        
        // Update compare mode if it changed
        if (nextCompareMode !== compareMode) {
            handleCompareModeChange(nextCompareMode);
        }
    }, [compareMode, handleCompareModeChange]);

    // Error state
    if (error) {
        return (
            <div className="container mx-auto pb-4 px-2 max-w-4xl">
                <Empty className="mt-8">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FileX />
                        </EmptyMedia>
                        <EmptyTitle>Lista no encontrada</EmptyTitle>
                        <EmptyDescription>
                            Esta lista no existe o no está disponible para compartir.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </div>
        );
    }

    // Loading state
    if (isLoadingList || isLoadingShops || !sharedList || (stats.isLoading && !stats.entriesWithShop.length)) {
        return <SharedListSkeleton />;
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
            {/* Owner profile card */}
            {sharedList.owner && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border bg-card p-4">
                    <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-lg">
                            {sharedList.owner.name ? getInitials(sharedList.owner.name) : "?"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-medium">
                            {sharedList.owner.name || "Usuario"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            Actualizado el {formatAbsoluteDate(sharedList.updatedAt)}
                        </span>
                    </div>
                </div>
            )}

            {/* Read-only banner (only if no owner or owner hidden) */}
            {!sharedList.owner && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
                    <Eye className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-500" />
                    <div className="flex-1">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            Estás viendo una lista compartida en modo lectura.
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Última actualización: {formatRelativeTime(sharedList.updatedAt)}
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-1 flex-col gap-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    {/* Left side: Title and stats */}
                    <div className="flex flex-col gap-1">
                        <h1 className="font-bold text-2xl">{sharedList.name}</h1>
                        <div className="text-muted-foreground">
                            {stats.totalProducts} productos · <span className="font-bold text-foreground">RD${stats.totalPrice.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Right side: Shop selector button */}
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

                {/* Tabs and value score */}
                <div className="flex flex-col items-end gap-1">
                    <Tabs value={compareMode} onValueChange={handleCompareModeChange}>
                        <TabsList>
                            <TabsTrigger value="cheapest" disabled={isRecalculating}>
                                Más barato
                            </TabsTrigger>
                            <TabsTrigger value="value" disabled={isRecalculating}>
                                Mejor valor
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {compareMode === "value" && stats.selectedValueScore !== null ? (
                        <div className="flex items-center text-sm">
                            <span className="text-muted-foreground">Índice de eficiencia</span>{" "}
                            <span className="font-bold ml-1">{stats.selectedValueScore.toFixed(1)}</span>
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
                                    />
                                </div>
                                <div className="font-bold">RD${shopTotalPrice.toFixed(2)}</div>
                            </div>
                            <ProductItems
                                items={items as never}
                                readOnly
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
                            readOnly
                        />
                    </section>
                ) : null}
            </div>
        </div>
    );
}

// ============================================================================
// Skeleton Component
// ============================================================================

function SharedListSkeleton() {
    return (
        <div className="container mx-auto pb-4 px-2 max-w-4xl">
            <div className="flex flex-1 flex-col gap-3">
                {/* Banner skeleton */}
                <Skeleton className="h-16 w-full rounded-lg" />

                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-36 rounded-md" />
                </div>

                {/* Tabs */}
                <Skeleton className="h-10 w-48" />

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
        <Button className="relative" variant="outline">
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
            <span>Supermercados</span>
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

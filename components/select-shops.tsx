"use client";

import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "./ui/drawer";
import { Button } from "./ui/button";
import { Store } from "lucide-react";
import { shopsSelect } from "@/db/schema";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Toggle } from "./ui/toggle";
import { updateListSelectedShops } from "@/lib/compare";
import { Spinner } from "./ui/spinner";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SelectShopsProps = { 
    shops: shopsSelect[], 
    listId: number, 
    initialSelectedShops: number[]
    cheapestSingleShopIds: number[]
    cheapestPairShopIds: number[]
    bestValueSingleShopIds: number[]
    bestValuePairShopIds: number[]
}

type CompareMode = "cheapest" | "value";

const areSameSelection = (left: number[], right: number[]) => {
    if (left.length !== right.length) {
        return false;
    }

    const rightSet = new Set(right);
    return left.every((id) => rightSet.has(id));
};

export function SelectShops({
    shops,
    listId,
    initialSelectedShops,
    cheapestSingleShopIds,
    cheapestPairShopIds,
    bestValueSingleShopIds,
    bestValuePairShopIds,
}: SelectShopsProps) {
    const [open, setOpen] = React.useState(false)
    const isMobile = useIsMobile()

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    <Button className="relative" variant="outline" size="icon">
                        <div className="absolute top-[-5px] right-[-5px] z-50">
                            <Badge className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums" variant="destructive">{initialSelectedShops.length}</Badge>
                        </div>
                        <Store />
                    </Button>
                </DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Selecciona supermercado</DrawerTitle>
                    </DrawerHeader>
                    <SupermarketsList
                        shops={shops}
                        listId={listId}
                        initialSelectedShops={initialSelectedShops}
                        cheapestSingleShopIds={cheapestSingleShopIds}
                        cheapestPairShopIds={cheapestPairShopIds}
                        bestValueSingleShopIds={bestValueSingleShopIds}
                        bestValuePairShopIds={bestValuePairShopIds}
                        onClose={() => setOpen(false)}
                    />
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="relative" variant="outline" size="icon">
                    <div className="absolute top-[-5px] right-[-5px] z-50">
                        <Badge className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums" variant="destructive">{initialSelectedShops.length}</Badge>
                    </div>
                    <Store />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Selecciona supermercado</DialogTitle>
                </DialogHeader>
                <SupermarketsList
                    shops={shops}
                    listId={listId}
                    initialSelectedShops={initialSelectedShops}
                    cheapestSingleShopIds={cheapestSingleShopIds}
                    cheapestPairShopIds={cheapestPairShopIds}
                    bestValueSingleShopIds={bestValueSingleShopIds}
                    bestValuePairShopIds={bestValuePairShopIds}
                    onClose={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    )
}

function SupermarketsList({
    shops,
    listId,
    initialSelectedShops,
    cheapestSingleShopIds,
    cheapestPairShopIds,
    bestValueSingleShopIds,
    bestValuePairShopIds,
    onClose
}: SelectShopsProps & { onClose: () => void }) {
    const [selectedShops, setSelectedShops] = React.useState<number[]>(initialSelectedShops);
    const [loading, setLoading] = React.useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const lastInitialSelectionRef = React.useRef<number[]>(initialSelectedShops);

    const currentCompareMode: CompareMode =
        searchParams.get("compare") === "value" ? "value" : "cheapest";
    const [pendingCompareMode, setPendingCompareMode] =
        React.useState<CompareMode>(currentCompareMode);

    React.useEffect(() => {
        if (!areSameSelection(initialSelectedShops, lastInitialSelectionRef.current)) {
            lastInitialSelectionRef.current = initialSelectedShops;
            setSelectedShops(initialSelectedShops);
        }
    }, [initialSelectedShops]);

    React.useEffect(() => {
        setPendingCompareMode(currentCompareMode);
    }, [currentCompareMode]);

    const shopAmount = selectedShops.length === 0 ? 6 : selectedShops.length;
    const activeSingleShopIds =
        pendingCompareMode === "value" ? bestValueSingleShopIds : cheapestSingleShopIds;
    const activePairShopIds =
        pendingCompareMode === "value" ? bestValuePairShopIds : cheapestPairShopIds;
    const canSelectSingle = activeSingleShopIds.length > 0;
    const canSelectPair = activePairShopIds.length > 0;
    const isSingleSelected =
        canSelectSingle && areSameSelection(selectedShops, activeSingleShopIds);
    const isPairSelected =
        canSelectPair && areSameSelection(selectedShops, activePairShopIds);

    const getPreferredCount = () => {
        if (isPairSelected) {
            return "pair";
        }

        if (isSingleSelected) {
            return "single";
        }

        return selectedShops.length > 1 ? "pair" : "single";
    };

    const commitCompareMode = (nextMode: CompareMode) => {
        const params = new URLSearchParams(searchParams.toString());

        if (nextMode === "cheapest") {
            params.delete("compare");
        } else {
            params.set("compare", nextMode);
        }

        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    const applySelectionForMode = (nextMode: CompareMode) => {
        const nextSingle =
            nextMode === "value" ? bestValueSingleShopIds : cheapestSingleShopIds;
        const nextPair =
            nextMode === "value" ? bestValuePairShopIds : cheapestPairShopIds;
        const preferredCount = getPreferredCount();

        if (preferredCount === "pair" && nextPair.length > 0) {
            setSelectedShops(nextPair);
            return;
        }

        if (nextSingle.length > 0) {
            setSelectedShops(nextSingle);
        }
    };

    return (
        <div className="grid grid-cols-2 justify-items-stretch gap-4 p-4 md:p-0">
            <div className="col-span-2 flex flex-col">
                <div className="flex flex-wrap md:flex-nowrap items-center justify-end md:justify-between gap-2">
                    <div className="flex items-center rounded-full border border-border bg-muted/50 p-1">
                        <Toggle
                            type="button"
                            variant="default"
                            className="h-9 rounded-full px-3 text-xs font-semibold text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
                            disabled={loading}
                            pressed={pendingCompareMode === "cheapest"}
                            onPressedChange={(pressed) => {
                                if (!pressed || loading) {
                                    return;
                                }

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
                            disabled={loading}
                            pressed={pendingCompareMode === "value"}
                            onPressedChange={(pressed) => {
                                if (!pressed || loading) {
                                    return;
                                }

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
                            disabled={loading || !canSelectSingle}
                            pressed={isSingleSelected}
                            onPressedChange={(pressed) => {
                                if (!pressed || loading || !canSelectSingle) {
                                    return;
                                }

                                setSelectedShops(activeSingleShopIds);
                            }}
                        >
                            1 tienda
                        </Toggle>
                        <Toggle
                            type="button"
                            variant="default"
                            className="h-9 rounded-full px-3 text-xs font-semibold text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
                            disabled={loading || !canSelectPair}
                            pressed={isPairSelected}
                            onPressedChange={(pressed) => {
                                if (!pressed || loading || !canSelectPair) {
                                    return;
                                }

                                setSelectedShops(activePairShopIds);
                            }}
                        >
                            2 tiendas
                        </Toggle>
                    </div>
                </div>
            </div>

            <Separator className="col-span-2" />
            
            {shops.map(shop => (
                <Toggle
                    key={shop.id}
                    variant="outline"
                    className="h-[50px]"
                    pressed={selectedShops.includes(shop.id)}
                    onPressedChange={(pressed) => {
                        setSelectedShops((current) => {
                            return pressed
                                ? [...current, shop.id]
                                : current.filter((id) => id !== shop.id);
                        });
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
                disabled={loading}
                className="col-span-2 min-w-[200px]"
                aria-label={`Comparar ${shopAmount} Tiendas`}
                onClick={async () => {
                setLoading(true);
                await updateListSelectedShops(listId, selectedShops);
                commitCompareMode(pendingCompareMode);
                setLoading(false);
                onClose();
            }}>
                {loading ? (
                    <Spinner />
                ) : (
                    <>Comparar {shopAmount} Tiendas</>
                )}
            </Button>
        </div>
    )
}

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

type SelectShopsProps = { 
    shops: shopsSelect[], 
    listId: number, 
    initialSelectedShops: number[]
    cheapestShopIds: number[]
    bestPairShopIds: number[]
}

export function SelectShops({ shops, listId, initialSelectedShops, cheapestShopIds, bestPairShopIds }: SelectShopsProps) {
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
                        cheapestShopIds={cheapestShopIds}
                        bestPairShopIds={bestPairShopIds}
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
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Selecciona supermercado</DialogTitle>
                </DialogHeader>
                <SupermarketsList
                    shops={shops}
                    listId={listId}
                    initialSelectedShops={initialSelectedShops}
                    cheapestShopIds={cheapestShopIds}
                    bestPairShopIds={bestPairShopIds}
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
    cheapestShopIds,
    bestPairShopIds,
    onClose
}: SelectShopsProps & { onClose: () => void }) {
    const [selectedShops, setSelectedShops] = React.useState<number[]>(initialSelectedShops);
    const [loading, setLoading] = React.useState(false);

    const shopAmount = selectedShops.length === 0 ? 6 : selectedShops.length;
    const canSelectCheapest = cheapestShopIds.length > 0;
    const canSelectBestPair = bestPairShopIds.length > 0;

    return (
        <div className="grid grid-cols-2 justify-items-stretch gap-4 p-4 md:p-0">
            <div className="col-span-2 grid grid-cols-2 gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    disabled={loading || !canSelectCheapest}
                    onClick={() => setSelectedShops(cheapestShopIds)}
                >
                    Seleccionar mas barato
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    disabled={loading || !canSelectBestPair}
                    onClick={() => setSelectedShops(bestPairShopIds)}
                >
                    Seleccionar 2 mejores
                </Button>
            </div>
            {shops.map(shop => (
                <Toggle key={shop.id} variant="outline" className="h-[50px]" pressed={selectedShops.includes(shop.id)} onPressedChange={(pressed) => {
                    if (pressed) {
                        setSelectedShops([...selectedShops, shop.id]);
                    } else {
                        setSelectedShops(selectedShops.filter(id => id !== shop.id));
                    }
                }}>
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
            <Button disabled={loading} className="col-span-2" onClick={async () => {
                setLoading(true);
                await updateListSelectedShops(listId, selectedShops);
                setLoading(false);
                onClose();
            }}>
                {loading ? <Spinner /> : null}
                Comparar {shopAmount} Tiendas
            </Button>
        </div>
    )
}

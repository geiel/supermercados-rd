"use client";

import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerTrigger } from "./ui/drawer";
import { Button } from "./ui/button";
import { Store } from "lucide-react";
import { shopsSelect } from "@/db/schema";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Toggle } from "./ui/toggle";
import { updateListSelectedShops } from "@/lib/compare";

type SelectShopsProps = { 
    shops: shopsSelect[], 
    listId: number, 
    initialSelectedShops: number[] 
}

export function SelectShops({ shops, listId, initialSelectedShops }: SelectShopsProps) {
    const [open, setOpen] = React.useState(false)
    const isMobile = useIsMobile()

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Store />
                    </Button>
                </DrawerTrigger>
                <DrawerContent>
                    <SupermarketsList shops={shops} listId={listId} initialSelectedShops={initialSelectedShops} onClose={() => setOpen(false)} />
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                    <Store />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Selecciona supermercado</DialogTitle>
                </DialogHeader>
                <SupermarketsList shops={shops} listId={listId} initialSelectedShops={initialSelectedShops} onClose={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    )
}

function SupermarketsList({ shops, listId, initialSelectedShops, onClose }: SelectShopsProps & { onClose: () => void }) {
    const [selectedShops, setSelectedShops] = React.useState<number[]>(initialSelectedShops);

    return (
        <div className="grid grid-cols-2 justify-items-stretch gap-4">
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
            <Button className="col-span-2" onClick={async () => {
                await updateListSelectedShops(listId, selectedShops);
                onClose();
            }}>Comparar</Button>
        </div>
    )
}
"use client";

import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import { useContext, useTransition } from "react";
import { ListContext } from "./list-provider";
import { addProductToUserList } from "@/lib/compare";


export function AddListButton({ productId }: { productId: number }) {
    const listItems = useContext(ListContext);
    const [isPending, startTransition] = useTransition();

    if (listItems.listItems?.some(item => item.productId === productId)) {
        return (
            <Button size="icon-sm" disabled>
                <Plus />
            </Button>
        );
    }
    
    return (
        <Button size="icon-sm" variant="outline" disabled={isPending} onClick={() => {
            startTransition(async () => {
                await addProductToUserList(productId);
                listItems.mutate();
            })
        }}>
            <Plus />
        </Button>
    );
}
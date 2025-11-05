"use client";

import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import { useContext, useTransition } from "react";
import { ListContext } from "./list-provider";
import { addProductToUserList } from "@/lib/compare";
import { Spinner } from "./ui/spinner";
import { toast } from "sonner";

type AddListButtonType = "icon" | "button";

export function AddListButton({ productId, type }: { productId: number; type: AddListButtonType }) {
    const context = useContext(ListContext);
    const [isPending, startTransition] = useTransition();

    if (context.isLoading) {
        return null;
    }

    if (context.listItems?.some(item => item.productId === productId)) {
        return (
            <Button size={type === "button" ? "sm" : "icon-sm"} disabled>
                <Plus /> {type === "button" ? 'Lista' : null}
            </Button>
        );
    }
    
    return (
        <Button size={type === "button" ? "sm" : "icon-sm"} variant="outline" disabled={isPending} onClick={() => {
            startTransition(async () => {
                const { error } = await addProductToUserList(productId);

                if (error) {
                    toast.error(error)
                    return;
                }

                await context.mutate();
            })
        }}>
            {isPending ? <Spinner /> : <Plus />} {type === "button" ? 'Lista' : null}
        </Button>
    );
}
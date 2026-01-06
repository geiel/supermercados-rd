"use client";

import { Check, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { useContext, useTransition } from "react";
import { ListContext } from "./list-provider";
import { addProductToUserList, deleteItem } from "@/lib/compare";
import { Spinner } from "./ui/spinner";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type AddListButtonType = "icon" | "button";

export function AddListButton({ productId, type }: { productId: number; type: AddListButtonType }) {
    const context = useContext(ListContext);
    const [isAdding, startAddTransition] = useTransition();
    const [isRemoving, startRemoveTransition] = useTransition();
    const router = useRouter();

    if (context.isLoading) {
        return null;
    }

    const listItem = context.listItems?.find(item => item.productId === productId);

    if (listItem) {
        return (
            <Button
                size={type === "button" ? "sm" : "icon-sm"}
                className="bg-[#CE1126] hover:bg-[#CE1126]/60"
                disabled={isRemoving}
                onClick={() => {
                    startRemoveTransition(async () => {
                        const { error } = await deleteItem(listItem.id);

                        if (error) {
                            toast.error(error);
                            return;
                        }

                        await context.mutate();
                        toast('Removido de la lista');
                    });
                }}
            >
                {isRemoving ? <Spinner /> : <Check />} {type === "button" ? 'Lista' : null}
            </Button>
        );
    }
    
    return (
        <Button size={type === "button" ? "sm" : "icon-sm"} variant="outline" disabled={isAdding} onClick={() => {
            startAddTransition(async () => {
                const { error } = await addProductToUserList(productId);

                if (error) {
                    toast.error(error)
                    return;
                }

                await context.mutate();
                toast('Agregado a la lista', {
                    action: {
                        label: "Ver",
                        onClick: () => router.push("/lists")
                    }
                })
            })
        }}>
            {isAdding ? <Spinner /> : <Plus />} {type === "button" ? 'Lista' : null}
        </Button>
    );
}

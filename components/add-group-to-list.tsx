"use client";

import { useContext, useState, useTransition } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { ListGroupContext } from "@/components/list-provider";
import { addGroupToUserList, deleteGroupItem } from "@/lib/compare";

type GroupInfo = {
    id: number;
    name: string;
    humanId: string;
};

export function AddGroupToListButton({ groups }: { groups: GroupInfo[] }) {
    const [pendingAddGroupIds, setPendingAddGroupIds] = useState<Set<number>>(new Set());
    const [pendingRemoveGroupIds, setPendingRemoveGroupIds] = useState<Set<number>>(new Set());
    const [open, setOpen] = useState(false);
    const [, startTransition] = useTransition();
    const isMobile = useIsMobile();
    const router = useRouter();
    const { listGroupItems, mutate: mutateGroupItems, isLoading: isLoadingGroupItems } = useContext(ListGroupContext);

    if (!groups || groups.length === 0) {
        return null;
    }

    const groupItemByGroupId = new Map(listGroupItems?.map((item) => [item.groupId, item]) ?? []);

    const handleAddGroup = (group: GroupInfo) => {
        if (pendingAddGroupIds.has(group.id) || pendingRemoveGroupIds.has(group.id)) {
            return;
        }

        setPendingAddGroupIds((current) => {
            const next = new Set(current);
            next.add(group.id);
            return next;
        });

        startTransition(async () => {
            try {
                const { error } = await addGroupToUserList(group.humanId);
                if (error) {
                    toast.error(error);
                    return;
                }

                await mutateGroupItems();
                toast("Agregado a la lista", {
                    action: {
                        label: "Ver",
                        onClick: () => router.push("/lists"),
                    },
                });
            } finally {
                setPendingAddGroupIds((current) => {
                    const next = new Set(current);
                    next.delete(group.id);
                    return next;
                });
            }
        });
    };

    const handleRemoveGroup = (group: GroupInfo, listGroupItemId: number) => {
        if (pendingAddGroupIds.has(group.id) || pendingRemoveGroupIds.has(group.id)) {
            return;
        }

        setPendingRemoveGroupIds((current) => {
            const next = new Set(current);
            next.add(group.id);
            return next;
        });

        startTransition(async () => {
            try {
                const { error } = await deleteGroupItem(listGroupItemId);
                if (error) {
                    toast.error(error);
                    return;
                }

                await mutateGroupItems();
                toast("Removido de la lista");
            } finally {
                setPendingRemoveGroupIds((current) => {
                    const next = new Set(current);
                    next.delete(group.id);
                    return next;
                });
            }
        });
    };

    const renderSingleButton = (group: GroupInfo) => {
        const groupListItem = groupItemByGroupId.get(group.id);
        const isPendingAdd = pendingAddGroupIds.has(group.id);
        const isPendingRemove = pendingRemoveGroupIds.has(group.id);
        const isPending = isPendingAdd || isPendingRemove;
        const isDisabled = isPending || isLoadingGroupItems;

        if (groupListItem) {
            return (
                <Button
                    size="sm"
                    className="bg-[#CE1126] hover:bg-[#CE1126]/60"
                    disabled={isDisabled}
                    onClick={() => handleRemoveGroup(group, groupListItem.id)}
                >
                    {isPendingRemove ? <Spinner /> : <Check />} Categoría
                </Button>
            );
        }

        return (
            <Button
                size="sm"
                variant="outline"
                disabled={isDisabled}
                onClick={() => handleAddGroup(group)}
            >
                {isPendingAdd ? <Spinner /> : <Plus />} Categoría
            </Button>
        );
    };

    if (groups.length === 1) {
        return renderSingleButton(groups[0]);
    }

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    <Button size="sm" variant="outline">
                        <Plus /> Categorías <ChevronDown />
                    </Button>
                </DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Agregar categoría</DrawerTitle>
                    </DrawerHeader>
                    <div className="grid gap-2 px-4 pb-4">
                        {groups.map((group) => {
                            const groupListItem = groupItemByGroupId.get(group.id);
                            const isPendingAdd = pendingAddGroupIds.has(group.id);
                            const isPendingRemove = pendingRemoveGroupIds.has(group.id);
                            const isPending = isPendingAdd || isPendingRemove;
                            const isDisabled = isPending || isLoadingGroupItems;
                            const actionLabel = groupListItem ? "Quitar" : "Agregar";

                            if (groupListItem) {
                                return (
                                    <Button
                                        key={group.id}
                                        variant="ghost"
                                        className="w-full justify-between"
                                        onClick={() => handleRemoveGroup(group, groupListItem.id)}
                                        disabled={isDisabled}
                                    >
                                        <span className="flex items-center gap-2">
                                            {isPendingRemove ? <Spinner /> : <Check />}
                                            {group.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{actionLabel}</span>
                                    </Button>
                                );
                            }

                            return (
                                <Button
                                    key={group.id}
                                    variant="ghost"
                                    className="w-full justify-between"
                                    onClick={() => handleAddGroup(group)}
                                    disabled={isDisabled}
                                >
                                    <span className="flex items-center gap-2">
                                        {isPendingAdd ? <Spinner /> : <Plus />}
                                        {group.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{actionLabel}</span>
                                </Button>
                            );
                        })}
                    </div>
                    <DrawerFooter className="pt-0">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Cerrar
                        </Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                    <Plus /> Categorías <ChevronDown />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
                <DropdownMenuLabel>Agregar categoría</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {groups.map((group) => {
                    const groupListItem = groupItemByGroupId.get(group.id);
                    const isPendingAdd = pendingAddGroupIds.has(group.id);
                    const isPendingRemove = pendingRemoveGroupIds.has(group.id);
                    const isPending = isPendingAdd || isPendingRemove;
                    const isDisabled = isPending || isLoadingGroupItems;

                    if (groupListItem) {
                        return (
                            <DropdownMenuItem
                                key={group.id}
                                onSelect={() => handleRemoveGroup(group, groupListItem.id)}
                                disabled={isDisabled}
                                aria-label={`Remover ${group.name} de la lista`}
                            >
                                {isPendingRemove ? <Spinner /> : <Check />}
                                {group.name}
                                <DropdownMenuShortcut>Quitar</DropdownMenuShortcut>
                            </DropdownMenuItem>
                        );
                    }

                    return (
                        <DropdownMenuItem
                            key={group.id}
                            onSelect={() => handleAddGroup(group)}
                            disabled={isDisabled}
                            aria-label={`Agregar ${group.name} a la lista`}
                        >
                            {isPendingAdd ? <Spinner /> : <Plus />}
                            {group.name}
                            <DropdownMenuShortcut>Agregar</DropdownMenuShortcut>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

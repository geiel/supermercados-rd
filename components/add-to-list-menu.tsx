"use client";

import { useContext, useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { ListContext, ListGroupContext } from "@/components/list-provider";
import {
    addGroupToUserList,
    addProductToUserList,
    deleteGroupItem,
    deleteItem,
} from "@/lib/compare";

type GroupInfo = {
    id: number;
    name: string;
    humanId: string;
};

const getDescriptionText = (groupCount: number) => {
    if (groupCount <= 0) {
        return "Agrega el producto a tu lista";
    }

    if (groupCount === 1) {
        return "Agrega el producto o la categoría a tu lista";
    }

    return "Agrega el producto o las categorías a tu lista";
};

export function AddToListMenuButton({
    productId,
    groups,
}: {
    productId: number;
    groups: GroupInfo[];
}) {
    const [pendingAddGroupIds, setPendingAddGroupIds] = useState<Set<number>>(new Set());
    const [pendingRemoveGroupIds, setPendingRemoveGroupIds] = useState<Set<number>>(new Set());
    const [open, setOpen] = useState(false);
    const [, startGroupTransition] = useTransition();
    const [isAddingProduct, startAddTransition] = useTransition();
    const [isRemovingProduct, startRemoveTransition] = useTransition();
    const isMobile = useIsMobile();
    const router = useRouter();
    const { listItems, mutate: mutateListItems, isLoading: isLoadingListItems } = useContext(ListContext);
    const { listGroupItems, mutate: mutateGroupItems, isLoading: isLoadingGroupItems } = useContext(ListGroupContext);
    const toastPositionOption = isMobile ? { position: "top-center" as const } : {};

    const productListItem = listItems?.find((item) => item.productId === productId);
    const groupItemByGroupId = new Map(listGroupItems?.map((item) => [item.groupId, item]) ?? []);
    const groupCount = groups?.length ?? 0;
    const hasGroups = groupCount > 0;
    const descriptionText = getDescriptionText(groupCount);

    const isProductPending = isAddingProduct || isRemovingProduct;
    const isProductDisabled = isProductPending || isLoadingListItems;

    const handleAddProduct = () => {
        if (isProductDisabled) {
            return;
        }

        startAddTransition(async () => {
            const { error } = await addProductToUserList(productId);

            if (error) {
                toast.error(error);
                return;
            }

            await mutateListItems();
            toast("Producto agregado a la lista", {
                action: {
                    label: "Ver",
                    onClick: () => router.push("/lists"),
                },
                ...toastPositionOption,
            });
        });
    };

    const handleRemoveProduct = () => {
        if (!productListItem || isProductDisabled) {
            return;
        }

        startRemoveTransition(async () => {
            const { error } = await deleteItem(productListItem.id);

            if (error) {
                toast.error(error);
                return;
            }

            await mutateListItems();
            toast("Removido de la lista", toastPositionOption);
        });
    };

    const handleProductAction = () => {
        if (productListItem) {
            handleRemoveProduct();
            return;
        }

        handleAddProduct();
    };

    const handleAddGroup = (group: GroupInfo) => {
        if (pendingAddGroupIds.has(group.id) || pendingRemoveGroupIds.has(group.id)) {
            return;
        }

        setPendingAddGroupIds((current) => {
            const next = new Set(current);
            next.add(group.id);
            return next;
        });

        startGroupTransition(async () => {
            try {
                const { error } = await addGroupToUserList(group.humanId);
                if (error) {
                    toast.error(error);
                    return;
                }

                await mutateGroupItems();
                toast("Categoría agregada a la lista", {
                    action: {
                        label: "Ver",
                        onClick: () => router.push("/lists"),
                    },
                    ...toastPositionOption,
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

        startGroupTransition(async () => {
            try {
                const { error } = await deleteGroupItem(listGroupItemId);
                if (error) {
                    toast.error(error);
                    return;
                }

                await mutateGroupItems();
                toast("Removido de la lista", toastPositionOption);
            } finally {
                setPendingRemoveGroupIds((current) => {
                    const next = new Set(current);
                    next.delete(group.id);
                    return next;
                });
            }
        });
    };

    const productActionLabel = productListItem ? "Quitar" : "Agregar";
    const productAriaLabel = productListItem
        ? "Quitar producto actual de la lista"
        : "Agregar producto actual a la lista";
    const productIcon = isLoadingListItems || isProductPending
        ? <Spinner />
        : productListItem
            ? <Check />
            : <Plus />;

    if (!hasGroups) {
        return (
            <Button
                size="sm"
                variant={productListItem ? "default" : "outline"}
                className={productListItem ? "bg-[#CE1126] hover:bg-[#CE1126]/60" : undefined}
                disabled={isProductDisabled}
                onClick={handleProductAction}
                aria-label={productAriaLabel}
            >
                {productIcon} Lista
            </Button>
        );
    }

    const renderGroupDrawerItems = () => {
        if (!hasGroups) {
            return null;
        }

        return groups.map((group) => {
            const groupListItem = groupItemByGroupId.get(group.id);
            const isPendingAdd = pendingAddGroupIds.has(group.id);
            const isPendingRemove = pendingRemoveGroupIds.has(group.id);
            const isPending = isPendingAdd || isPendingRemove;
            const isDisabled = isPending || isLoadingGroupItems;
            const actionLabel = groupListItem ? "Quitar" : "Agregar";
            const icon = isPending ? <Spinner /> : groupListItem ? <Check /> : <Plus />;

            return (
                <Button
                    key={group.id}
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() =>
                        groupListItem
                            ? handleRemoveGroup(group, groupListItem.id)
                            : handleAddGroup(group)
                    }
                    disabled={isDisabled}
                >
                    <span className="flex items-center gap-2">
                        {icon}
                        {group.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{actionLabel}</span>
                </Button>
            );
        });
    };

    const renderGroupDropdownItems = () => {
        if (!hasGroups) {
            return null;
        }

        return groups.map((group) => {
            const groupListItem = groupItemByGroupId.get(group.id);
            const isPendingAdd = pendingAddGroupIds.has(group.id);
            const isPendingRemove = pendingRemoveGroupIds.has(group.id);
            const isPending = isPendingAdd || isPendingRemove;
            const isDisabled = isPending || isLoadingGroupItems;
            const actionLabel = groupListItem ? "Quitar" : "Agregar";
            const icon = isPending ? <Spinner /> : groupListItem ? <Check /> : <Plus />;

            return (
                <DropdownMenuItem
                    key={group.id}
                    onSelect={(event) => {
                        event.preventDefault();
                        if (groupListItem) {
                            handleRemoveGroup(group, groupListItem.id);
                        } else {
                            handleAddGroup(group);
                        }
                    }}
                    disabled={isDisabled}
                    aria-label={
                        groupListItem
                            ? `Quitar ${group.name} de la lista`
                            : `Agregar ${group.name} a la lista`
                    }
                >
                    {icon}
                    {group.name}
                    <DropdownMenuShortcut>{actionLabel}</DropdownMenuShortcut>
                </DropdownMenuItem>
            );
        });
    };

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    <Button size="sm" variant="outline">
                        <Plus /> Lista
                    </Button>
                </DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Agregar a la lista</DrawerTitle>
                        <DrawerDescription>{descriptionText}</DrawerDescription>
                    </DrawerHeader>
                    <div className="grid gap-2 px-4 pb-4">
                        <Button
                            variant="ghost"
                            className="w-full justify-between"
                            onClick={handleProductAction}
                            disabled={isProductDisabled}
                        >
                            <span className="flex items-center gap-2">
                                {productIcon}
                                Producto actual
                            </span>
                            <span className="text-xs text-muted-foreground">{productActionLabel}</span>
                        </Button>
                        {renderGroupDrawerItems()}
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
                    <Plus /> Lista
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    {descriptionText}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onSelect={(event) => {
                        event.preventDefault();
                        handleProductAction();
                    }}
                    disabled={isProductDisabled}
                    aria-label={productAriaLabel}
                >
                    {productIcon}
                    Producto actual
                    <DropdownMenuShortcut>{productActionLabel}</DropdownMenuShortcut>
                </DropdownMenuItem>
                {hasGroups ? (
                    <>
                        <DropdownMenuSeparator />
                        {renderGroupDropdownItems()}
                    </>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

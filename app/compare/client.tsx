"use client"

import { PricePerUnit } from "@/components/price-per-unit";
import { ProductImage } from "@/components/product-image";
import { SelectionActionBar } from "@/components/selection-action-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productsSelect, productsShopsPrices, shopsSelect } from "@/db/schema";
import { useRef, useState } from "react";

export type Props = {
    shops: shopsSelect[],
    productPrices: Array<productsSelect 
        & { shopCurrentPrices: productsShopsPrices[] }>
    totalsByShopId: Map<number, number>
}

export function CompareProducts({ shops, productPrices, totalsByShopId }: Props) {
    type SelectionType = "group" | "product";
    type SelectionKey = `${SelectionType}:${number}`;

    const getSelectionKey = (type: SelectionType, id: number) =>
        `${type}:${id}` as SelectionKey;
    const getSelectedProductIds = (selected: Set<SelectionKey>) => {
        const ids = new Set<number>();
        selected.forEach((key) => {
            if (!key.startsWith("product:")) {
                return;
            }

            const id = Number(key.split(":")[1]);
            if (!Number.isNaN(id)) {
                ids.add(id);
            }
        });

        return ids;
    };

    const [selectedProductsIds, setSelectedProductsIds] = useState<Set<SelectionKey>>(new Set());
    const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<{ groupId: number; groupName: string }>();
    const [userGroups, setUserGroups] = useState([
        {
            id: 1,
            name: "Platano verde",
            productsIds: [1025, 2072],
        }
    ]);

    type ProductWithPrices = productsSelect & { shopCurrentPrices: productsShopsPrices[] };
    type GroupDefinition = { id: number; name: string; productsIds: number[] };
    type GroupWithProducts = GroupDefinition & { products: ProductWithPrices[] };
    type RowItem =
        | { type: "group"; group: GroupWithProducts }
        | { type: "product"; product: ProductWithPrices };

    const productsById = new Map<number, ProductWithPrices>();
    productPrices.forEach((product) => {
        productsById.set(product.id, product);
    });

    const groupsWithProducts: GroupWithProducts[] = userGroups
        .map((group) => ({
            ...group,
            products: group.productsIds
                .map((id) => productsById.get(id))
                .filter((product): product is ProductWithPrices => Boolean(product)),
        }))
        .filter((group) => group.products.length > 0);

    const productIdToGroup = new Map<number, number>();
    groupsWithProducts.forEach((group, index) => {
        group.products.forEach((product) => {
            productIdToGroup.set(product.id, index);
        });
    });

    const addedGroupIndexes = new Set<number>();
    const rows = productPrices.reduce<RowItem[]>((acc, product) => {
        const groupIndex = productIdToGroup.get(product.id);
        if (groupIndex !== undefined) {
            if (!addedGroupIndexes.has(groupIndex)) {
                acc.push({ type: "group", group: groupsWithProducts[groupIndex] });
                addedGroupIndexes.add(groupIndex);
            }
            return acc;
        }

        acc.push({ type: "product", product });
        return acc;
    }, []);

    const getCheapestPriceForShop = (products: ProductWithPrices[], shopId: number) => {
        let cheapest:
            | {
                  price: number;
                  raw: productsShopsPrices;
                  product: ProductWithPrices;
              }
            | null = null;

        for (const product of products) {
            const shopPrice = product.shopCurrentPrices.find(
                (price) => price.shopId === shopId
            );

            if (!shopPrice?.currentPrice) {
                continue;
            }

            const numericPrice = Number(shopPrice.currentPrice);
            if (Number.isNaN(numericPrice)) {
                continue;
            }

            if (!cheapest || numericPrice < cheapest.price) {
                cheapest = { price: numericPrice, raw: shopPrice, product };
            }
        }

        return cheapest;
    };

    const displayTotalsByShopId = new Map<number, number>(
        shops.map((shop) => [shop.id, 0])
    );

    rows.forEach((row) => {
        if (row.type === "group") {
            shops.forEach((shop) => {
                const cheapest = getCheapestPriceForShop(row.group.products, shop.id);
                if (!cheapest) {
                    return;
                }

                displayTotalsByShopId.set(
                    shop.id,
                    (displayTotalsByShopId.get(shop.id) ?? 0) + cheapest.price
                );
            });

            return;
        }

        shops.forEach((shop) => {
            const shopPrice = row.product.shopCurrentPrices.find(
                (price) => price.shopId === shop.id
            );

            if (!shopPrice?.currentPrice) {
                return;
            }

            const numericPrice = Number(shopPrice.currentPrice);
            if (Number.isNaN(numericPrice)) {
                return;
            }

            displayTotalsByShopId.set(
                shop.id,
                (displayTotalsByShopId.get(shop.id) ?? 0) + numericPrice
            );
        });
    });

    return (
        <div className="p-0 md:p-4 md:flex md:gap-2 relative">
            <ScrollArea className="h-[93vh] border rounded-sm">
                <div>
                    <div
                        data-slot="table-container"
                        className="relative w-full"
                    >
                        <Table>
                            <TableHeader className="sticky top-0 z-30 bg-background">
                                <TableRow>
                                    <TableHead>
                                        <span className="sr-only">Seleccionar</span>
                                    </TableHead>
                                    <TableHead>
                                        <div className="w-[150px]">
                                            Producto
                                        </div>
                                    </TableHead>
                                    <TableHead>
                                        <span className="sr-only">Nombre</span>
                                    </TableHead>
                                    {shops.map((shop) => (
                                        <TableHead key={shop.id}>{shop.name}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => {
                                    if (row.type === "group") {
                                        const group = row.group;
                                        const groupKey = `group-${group.id}-${group.name}-${group.productsIds.join("-")}`;
                                        const selectionKey = getSelectionKey("group", group.id);
                                        return (
                                            <TableRow key={groupKey}>
                                                <TableCell className="p-4">
                                                    <Checkbox 
                                                        checked={selectedProductsIds.has(selectionKey)}
                                                        onCheckedChange={() => {
                                                            const newSet = new Set(selectedProductsIds);
                                                            if (newSet.has(selectionKey)) {
                                                                setSelectedGroup(undefined);
                                                                newSet.delete(selectionKey);
                                                            } else {
                                                                setSelectedGroup({ groupId: group.id, groupName: group.name });
                                                                newSet.add(selectionKey);
                                                            }

                                                            setSelectedProductsIds(newSet);
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="grid grid-cols-2">
                                                        {group.products.map((product) => (
                                                            <div key={product.id} className="relative h-[52px] w-[52px]">
                                                                {product.image ? (
                                                                    <ProductImage
                                                                        src={product.image}
                                                                        fill
                                                                        sizes="52px"
                                                                        style={{
                                                                            objectFit: "contain",
                                                                        }}
                                                                        alt={product.name + product.unit}
                                                                        placeholder="blur"
                                                                        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                                                                        className="w-none"
                                                                    />
                                                                ) : null}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <div className="font-semibold">
                                                            {group.name}
                                                        </div>
                                                        <Badge variant="secondary">Grupo</Badge>
                                                    </div>
                                                </TableCell>
                                                {shops.map((shop) => {
                                                    const cheapest = getCheapestPriceForShop(group.products, shop.id);

                                                    if (!cheapest) {
                                                        return (
                                                            <TableCell key={shop.id}></TableCell>
                                                        );
                                                    }

                                                    return (
                                                        <TableCell key={shop.id}>
                                                            <div className="font-bold text-base">RD${cheapest.raw.currentPrice}</div>
                                                            <PricePerUnit
                                                                price={cheapest.price}
                                                                unit={cheapest.product.unit}
                                                                categoryId={cheapest.product.categoryId}
                                                            />
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        );
                                    }

                                    const product = row.product;
                                    const selectionKey = getSelectionKey("product", product.id);
                                    return (
                                        <TableRow key={product.id}>
                                            <TableCell className="p-4">
                                                <Checkbox 
                                                    checked={selectedProductsIds.has(selectionKey)}
                                                    onCheckedChange={() => {
                                                        const newSet = new Set(selectedProductsIds);
                                                        if (newSet.has(selectionKey)) {
                                                            newSet.delete(selectionKey);
                                                        } else {
                                                            newSet.add(selectionKey);
                                                        }

                                                        setSelectedProductsIds(newSet);
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="relative h-[60px] w-[60px]">
                                                    {product.image ? (
                                                        <ProductImage
                                                            src={product.image}
                                                            fill
                                                            sizes="60px"
                                                            style={{
                                                            objectFit: "contain",
                                                            }}
                                                            alt={product.name + product.unit}
                                                            placeholder="blur"
                                                            blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                                                            className="max-w-none" />
                                                    ): null}
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-break-spaces">
                                                    {product.name} {product.unit}
                                            </TableCell>
                                            {shops.map((shop) => {
                                                const shopPrice = product.shopCurrentPrices.find(
                                                    (price) => price.shopId === shop.id
                                                );

                                                if (!shopPrice?.currentPrice) {
                                                    return (
                                                        <TableCell key={shop.id}></TableCell>
                                                    );
                                                }

                                                return (
                                                    <TableCell key={shop.id}>
                                                        <div className="font-bold text-base">RD${shopPrice.currentPrice}</div>
                                                        <PricePerUnit price={Number(shopPrice.currentPrice)} unit={product.unit} categoryId={product.categoryId} />
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell>Total</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    {shops.map((shop) => {
                                        const total =
                                            displayTotalsByShopId.get(shop.id) ??
                                            totalsByShopId.get(shop.id) ??
                                            0;
                                        return (
                                            <TableCell key={shop.id}>RD${total.toFixed(2)}</TableCell>
                                        );
                                    })}
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <SelectionActionBar 
                selectedCount={selectedProductsIds.size} 
                onGroup={(addToGroup) => {
                    if (addToGroup) {
                        if (!selectedGroup) {
                            return;
                        }

                        const selectedProductIds = getSelectedProductIds(selectedProductsIds);
                        if (selectedProductIds.size === 0) {
                            return;
                        }

                        setUserGroups((currentGroups) =>
                            currentGroups.map((group) => {
                                if (group.id !== selectedGroup.groupId) {
                                    return group;
                                }

                                const mergedProductIds = new Set(group.productsIds);
                                selectedProductIds.forEach((id) => mergedProductIds.add(id));

                                return {
                                    ...group,
                                    productsIds: Array.from(mergedProductIds),
                                };
                            })
                        );

                        setSelectedProductsIds(new Set());
                        setSelectedGroup(undefined);
                        return;
                    }

                    setIsGroupDialogOpen(true);
                }} 
                onClear={() => {
                    setSelectedProductsIds(new Set());
                    setSelectedGroup(undefined);
                }}
                addToGroup={selectedGroup}
            />
            <GroupDialog
                open={isGroupDialogOpen}
                onOpenChange={setIsGroupDialogOpen}
                onCreateGroup={(name) => {
                    const trimmedName = name.trim();
                    if (!trimmedName) {
                        return;
                    }

                    const selectedProductIds = Array.from(
                        getSelectedProductIds(selectedProductsIds)
                    );

                    if (selectedProductIds.length === 0) {
                        return;
                    }

                    setUserGroups((groups) => {
                        const nextId =
                            groups.length > 0
                                ? Math.max(...groups.map((group) => group.id)) + 1
                                : 1;

                        return [
                            ...groups,
                            {
                                id: nextId,
                                name: trimmedName,
                                productsIds: selectedProductIds,
                            },
                        ];
                    });

                    setSelectedProductsIds(new Set());
                    setSelectedGroup(undefined);
                    setIsGroupDialogOpen(false);
                }}
            />
        </div>
    )
}


function GroupDialog({ open, onOpenChange, onCreateGroup }: { 
    open: boolean, 
    onOpenChange: (open: boolean) => void, 
    onCreateGroup: (name: string) => void 
}) {
    const [groupName, setGroupName] = useState("")
    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setGroupName("");
        }

        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Comparar estos productos juntos</DialogTitle>
                    <DialogDescription>Agrupa productos que consideras intercambiables.</DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Label htmlFor="group-name" className="text-foreground">
                        Nombre del grupo
                    </Label>
                    <Input
                        id="group-name"
                        placeholder="ej. Plátano verde"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="bg-secondary border-border"
                    />
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={() => onCreateGroup(groupName)} disabled={!groupName.trim()}>
                        Crear grupo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

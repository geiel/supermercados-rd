"use client"

import { PricePerUnit } from "@/components/price-per-unit";
import { ProductImage } from "@/components/product-image";
import { SelectionActionBar } from "@/components/selection-action-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listItemsSelect, productsSelect, productsShopsPrices, shopsSelect } from "@/db/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import { addProductToUserList, deleteItem } from "@/lib/compare";
import { toSlug } from "@/lib/utils";
import { ExternalLink, MoreVertical, Search, Trash2, Ungroup } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";

type ProductWithPrices = productsSelect & { shopCurrentPrices: productsShopsPrices[] };
type GroupSource = "user" | "official";
type GroupDefinition = { id: number; name: string; productsIds: number[]; source: GroupSource };
type GroupWithProducts = GroupDefinition & { products: ProductWithPrices[] };
type RowItem =
    | { type: "group"; group: GroupWithProducts }
    | { type: "product"; product: ProductWithPrices };
const USER_GROUPS_STORAGE_KEY = "compare:userGroups";

export type Props = {
    shops: shopsSelect[],
    productPrices: Array<productsSelect 
        & { shopCurrentPrices: productsShopsPrices[] }>
    totalsByShopId: Map<number, number>
    listItems: listItemsSelect[]
    officialGroups: GroupWithProducts[]
}

export function CompareProducts({ shops, productPrices, totalsByShopId, listItems, officialGroups }: Props) {
    type SelectionType = "group" | "product";
    type SelectionKey = `${SelectionType}:${string}`;

    const getSelectionKey = (type: SelectionType, id: string | number) =>
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
    const getGroupKey = (group: GroupWithProducts) =>
        `${group.source}:${group.id}`;

    const router = useRouter();
    const [selectedProductsIds, setSelectedProductsIds] = useState<Set<SelectionKey>>(new Set());
    const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<{ groupId: number; groupName: string }>();
    const [localProductPrices, setLocalProductPrices] = useState(productPrices);
    const [localListItems, setLocalListItems] = useState(listItems);
    const [pendingAddedProductIds, setPendingAddedProductIds] = useState<Set<number>>(new Set());
    const [isGroupsStorageReady, setIsGroupsStorageReady] = useState(false);
    const [userGroups, setUserGroups] = useState<GroupDefinition[]>([]);

    useEffect(() => {
        setLocalProductPrices(productPrices);
    }, [productPrices]);

    useEffect(() => {
        setLocalListItems(listItems);
    }, [listItems]);

    useEffect(() => {
        let storedGroups: GroupDefinition[] | null = null;

        try {
            const raw = localStorage.getItem(USER_GROUPS_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    storedGroups = parsed
                        .filter((group) => group && typeof group === "object")
                        .map((group): GroupDefinition => {
                            const id = Number((group as { id?: number }).id);
                            const name = String((group as { name?: string }).name ?? "").trim();
                            const productsIds = Array.isArray(
                                (group as { productsIds?: unknown }).productsIds
                            )
                                ? (group as { productsIds: unknown[] }).productsIds
                                      .map((value) => Number(value))
                                      .filter((value) => Number.isFinite(value))
                                : [];

                            return {
                                id,
                                name,
                                productsIds,
                                source: "user",
                            };
                        })
                        .filter((group) => Number.isFinite(group.id) && group.id > 0 && group.name.length > 0);
                }
            }
        } catch {
            storedGroups = null;
        }

        if (storedGroups && storedGroups.length > 0) {
            setUserGroups(storedGroups);
        }

        setIsGroupsStorageReady(true);
    }, []);

    useEffect(() => {
        if (!isGroupsStorageReady) {
            return;
        }

        try {
            localStorage.setItem(USER_GROUPS_STORAGE_KEY, JSON.stringify(userGroups));
        } catch {
            return;
        }
    }, [userGroups, isGroupsStorageReady]);

    useEffect(() => {
        setPendingAddedProductIds((current) => {
            if (current.size === 0) {
                return current;
            }

            const next = new Set(current);
            localListItems.forEach((item) => next.delete(item.productId));
            return next;
        });
    }, [localListItems]);

    const productsById = new Map<number, ProductWithPrices>();
    localProductPrices.forEach((product) => {
        productsById.set(product.id, product);
    });

    const listItemByProductId = new Map<number, listItemsSelect>();
    localListItems.forEach((item) => {
        listItemByProductId.set(item.productId, item);
    });

    const userGroupsWithProducts: GroupWithProducts[] = userGroups
        .map((group) => ({
            ...group,
            products: group.productsIds
                .map((id) => productsById.get(id))
                .filter((product): product is ProductWithPrices => Boolean(product)),
        }))
        .filter((group) => group.products.length > 0);

    const officialGroupsWithProducts = officialGroups.filter(
        (group) => group.products.length > 0
    );

    const combinedGroups = [
        ...officialGroupsWithProducts,
        ...userGroupsWithProducts,
    ];

    const groupByKey = new Map<string, GroupWithProducts>();
    combinedGroups.forEach((group) => {
        groupByKey.set(getGroupKey(group), group);
    });

    const productIdToGroupKey = new Map<number, string>();
    combinedGroups.forEach((group) => {
        const groupKey = getGroupKey(group);
        group.products.forEach((product) => {
            if (!productIdToGroupKey.has(product.id)) {
                productIdToGroupKey.set(product.id, groupKey);
            }
        });
    });

    const addedGroupKeys = new Set<string>();
    const rows = localProductPrices.reduce<RowItem[]>((acc, product) => {
        const groupKey = productIdToGroupKey.get(product.id);
        if (groupKey) {
            if (!addedGroupKeys.has(groupKey)) {
                const group = groupByKey.get(groupKey);
                if (group) {
                    acc.push({ type: "group", group });
                    addedGroupKeys.add(groupKey);
                }
            }
            return acc;
        }

        acc.push({ type: "product", product });
        return acc;
    }, []);

    combinedGroups.forEach((group) => {
        const groupKey = getGroupKey(group);
        if (!addedGroupKeys.has(groupKey)) {
            rows.push({ type: "group", group });
            addedGroupKeys.add(groupKey);
        }
    });

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
    type CheapestPick = NonNullable<ReturnType<typeof getCheapestPriceForShop>>;

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

    const handleRemoveProducts = async (productIds: number[]) => {
        const itemIds = productIds
            .map((id) => listItemByProductId.get(id)?.id)
            .filter((id): id is number => typeof id === "number");

        if (itemIds.length === 0) {
            return;
        }

        const removeSet = new Set(productIds);
        const prevProductPrices = localProductPrices;
        const prevListItems = localListItems;

        setLocalProductPrices((current) =>
            current.filter((product) => !removeSet.has(product.id))
        );
        setLocalListItems((current) =>
            current.filter((item) => !removeSet.has(item.productId))
        );
        setSelectedProductsIds(new Set());
        setSelectedGroup(undefined);

        try {
            const results = await Promise.all(itemIds.map((id) => deleteItem(id)));
            const hasError = results.some((result) =>
                Boolean((result as { error?: unknown }).error)
            );

            if (hasError) {
                setLocalProductPrices(prevProductPrices);
                setLocalListItems(prevListItems);
            }
        } catch {
            setLocalProductPrices(prevProductPrices);
            setLocalListItems(prevListItems);
        } finally {
            router.refresh();
        }
    };

    const handleViewProduct = (product: ProductWithPrices) => {
        router.push(`/product/${toSlug(product.name)}/${product.id}`);
    };

    const handleUngroup = (group: GroupWithProducts) => {
        if (group.source !== "user") {
            return;
        }

        setUserGroups((groups) => groups.filter((item) => item.id !== group.id));
        if (selectedGroup?.groupId === group.id) {
            setSelectedGroup(undefined);
        }

        const selectionKey = getSelectionKey("group", getGroupKey(group));
        setSelectedProductsIds((current) => {
            if (!current.has(selectionKey)) {
                return current;
            }
            const next = new Set(current);
            next.delete(selectionKey);
            return next;
        });
    };

    const handleAddProductFromSearch = async (product: ProductWithPrices) => {
        if (pendingAddedProductIds.has(product.id)) {
            return;
        }

        if (localListItems.some((item) => item.productId === product.id)) {
            return;
        }

        setPendingAddedProductIds((current) => new Set(current).add(product.id));
        setLocalProductPrices((current) => {
            if (current.some((item) => item.id === product.id)) {
                return current;
            }
            return [...current, product];
        });

        try {
            const { error } = await addProductToUserList(product.id);
            if (error) {
                setPendingAddedProductIds((current) => {
                    const next = new Set(current);
                    next.delete(product.id);
                    return next;
                });
                setLocalProductPrices((current) =>
                    current.filter((item) => item.id !== product.id)
                );
                return;
            }
        } catch {
            setPendingAddedProductIds((current) => {
                const next = new Set(current);
                next.delete(product.id);
                return next;
            });
            setLocalProductPrices((current) =>
                current.filter((item) => item.id !== product.id)
            );
            return;
        }

        router.refresh();
    };

    const excludedProductIds = new Set<number>([
        ...localListItems.map((item) => item.productId),
        ...pendingAddedProductIds,
    ]);

    return (
        <div>
            <div className="relative">
                <ScrollArea className="h-[calc(100dvh_-_70px)]">
                    <div className="flex gap-4">
                        <div className="min-w-0 flex-1">
                            <div className="m-2 flex items-center gap-2 rounded-sm border bg-muted/30 px-3 py-2 text-sm text-muted-foreground w-fit">
                                <Checkbox checked disabled className="pointer-events-none" />
                                <span>Selecciona los productos que consideras intercambiables para agruparlos</span>
                            </div>
                            <div className="mb-32 px-2">
                                <div
                                    data-slot="table-container"
                                    className="relative w-full"
                                >
                                    <Table>
                                        <TableHeader className="sticky top-0 z-30 bg-background">
                                            <TableRow>
                                                <TableHead>
                                                    <div className="w-[50px]">
                                                        <span className="sr-only">Seleccionar</span>
                                                    </div>
                                                </TableHead>
                                                <TableHead>
                                                    <div className="w-[150px]">
                                                        Producto
                                                    </div>
                                                </TableHead>
                                                <TableHead>
                                                    <div className="w-[150px]">
                                                        <span className="sr-only">Nombre</span>
                                                    </div>
                                                </TableHead>
                                                {shops.map((shop) => (
                                                    <TableHead key={shop.id}>
                                                        <div className="grid grid-rows-2 place-items-center">
                                                            <div>
                                                                <Image
                                                                    src={`/supermarket-logo/${shop.logo}`}
                                                                    width={0}
                                                                    height={0}
                                                                    className="w-[50px] h-auto"
                                                                    alt="Supermarket logo"
                                                                    unoptimized
                                                                />
                                                            </div>

                                                            <div className="font-bold text-lg">
                                                                RD$
                                                                {(
                                                                    displayTotalsByShopId.get(shop.id) ??
                                                                    totalsByShopId.get(shop.id) ??
                                                                    0
                                                                ).toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rows.map((row) => {
                                                if (row.type === "group") {
                                                    const group = row.group;
                                                    const groupKey = getGroupKey(group);
                                                    const selectionKey = getSelectionKey("group", groupKey);
                                                    const isOfficialGroup = group.source === "official";
                                                    const rowKey = `group-${groupKey}-${group.name}-${group.productsIds.join("-")}`;
                                                    const cheapestByShop = new Map<number, CheapestPick>();
                                                    const usedProductsById = new Map<number, ProductWithPrices>();

                                                    shops.forEach((shop) => {
                                                        const cheapest = getCheapestPriceForShop(group.products, shop.id);
                                                        if (!cheapest) {
                                                            return;
                                                        }

                                                        cheapestByShop.set(shop.id, cheapest);
                                                        usedProductsById.set(cheapest.product.id, cheapest.product);
                                                    });

                                                    const usedProducts = Array.from(usedProductsById.values());
                                                    const groupMenuProduct = usedProducts[0] ?? group.products[0];
                                                    const groupPrices = Array.from(cheapestByShop.values()).map(
                                                        (pick) => pick.price
                                                    );
                                                    const minGroupPrice =
                                                        groupPrices.length > 0
                                                            ? Math.min(...groupPrices)
                                                            : null;
                                                    return (
                                                        <TableRow key={rowKey}>
                                                            <TableCell className="text-center">
                                                                <Checkbox
                                                                    className="h-[18px] w-[18px]"
                                                                    checked={selectedProductsIds.has(selectionKey)}
                                                                    disabled={isOfficialGroup}
                                                                    onCheckedChange={() => {
                                                                        if (isOfficialGroup) {
                                                                            return;
                                                                        }

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
                                                                <div className="relative w-fit">
                                                                    <div className="flex -space-x-9">
                                                                        {usedProducts.map((product) => (
                                                                            <div key={product.id} className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
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
                                                                    {groupMenuProduct ? (
                                                                        <ActionsMenu
                                                                            productIds={group.products.map((product) => product.id)}
                                                                            viewProduct={groupMenuProduct}
                                                                            onUngroup={
                                                                                    isOfficialGroup
                                                                                        ? undefined
                                                                                        : () => handleUngroup(group)
                                                                                }
                                                                                onRemoveProducts={handleRemoveProducts}
                                                                                onViewProduct={handleViewProduct}
                                                                            />
                                                                        ) : null}
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
                                                                const cheapest = cheapestByShop.get(shop.id);

                                                                if (!cheapest) {
                                                                    return (
                                                                        <TableCell key={shop.id}></TableCell>
                                                                    );
                                                                }

                                                                const isBest =
                                                                    minGroupPrice !== null &&
                                                                    cheapest.price === minGroupPrice;
                                                                return (
                                                                    <TableCell key={shop.id}>
                                                                        <div
                                                                            className={
                                                                                isBest
                                                                                    ? "relative space-y-1 pt-5"
                                                                                    : "space-y-1 opacity-70"
                                                                            }
                                                                        >
                                                                            {isBest ? (
                                                                                <Badge
                                                                                    variant="secondary"
                                                                                    className="absolute left-0 top-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold leading-none text-white hover:bg-emerald-600"
                                                                                >
                                                                                    Mejor precio
                                                                                </Badge>
                                                                            ) : null}
                                                                            <div className="font-bold text-base">RD${cheapest.raw.currentPrice}</div>
                                                                            <PricePerUnit
                                                                                price={cheapest.price}
                                                                                unit={cheapest.product.unit}
                                                                                categoryId={cheapest.product.categoryId}
                                                                            />
                                                                        </div>
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    );
                                                }

                                                const product = row.product;
                                                    const selectionKey = getSelectionKey("product", product.id);
                                                    const rowPrices = product.shopCurrentPrices
                                                        .map((price) => Number(price.currentPrice))
                                                        .filter((value) => Number.isFinite(value));
                                                    const minRowPrice =
                                                        rowPrices.length > 0 ? Math.min(...rowPrices) : null;
                                                    return (
                                                        <TableRow key={product.id}>
                                                            <TableCell className="text-center">
                                                                <Checkbox 
                                                                className="h-[18px] w-[18px]"
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
                                                            <div className="relative w-fit">
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
                                                                <ActionsMenu
                                                                    productIds={[product.id]}
                                                                    viewProduct={product}
                                                                    onRemoveProducts={handleRemoveProducts}
                                                                    onViewProduct={handleViewProduct}
                                                                />
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

                                                            const numericPrice = Number(shopPrice.currentPrice);
                                                            const isBest =
                                                                minRowPrice !== null &&
                                                                Number.isFinite(numericPrice) &&
                                                                numericPrice === minRowPrice;
                                                            return (
                                                                <TableCell key={shop.id}>
                                                                    <div
                                                                        className={
                                                                            isBest
                                                                                ? "relative space-y-1 pt-5"
                                                                                : "space-y-1 opacity-70"
                                                                        }
                                                                    >
                                                                        {isBest ? (
                                                                            <Badge
                                                                                variant="secondary"
                                                                                className="absolute left-0 top-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold leading-none text-white hover:bg-emerald-600"
                                                                            >
                                                                                Mejor precio
                                                                            </Badge>
                                                                        ) : null}
                                                                        <div className="font-bold text-base">RD${shopPrice.currentPrice}</div>
                                                                        <PricePerUnit price={numericPrice} unit={product.unit} categoryId={product.categoryId} />
                                                                    </div>
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                        <AddProductSearchPanel
                            shops={shops}
                            excludedProductIds={excludedProductIds}
                            onAddProduct={handleAddProductFromSearch}
                        />
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
                                    source: "user",
                                },
                            ];
                        });

                        setSelectedProductsIds(new Set());
                        setSelectedGroup(undefined);
                        setIsGroupDialogOpen(false);
                    }}
                />
            </div>
        </div>
    )
}


function GroupDialog({ open, onOpenChange, onCreateGroup }: { 
    open: boolean, 
    onOpenChange: (open: boolean) => void, 
    onCreateGroup: (name: string) => void 
}) {
    const [groupName, setGroupName] = useState("")
    const isMobile = useIsMobile();
    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setGroupName("");
        }

        onOpenChange(nextOpen);
    };

    const formFields = (
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
    );

    const formActions = (
        <>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
            </Button>
            <Button onClick={() => onCreateGroup(groupName)} disabled={!groupName.trim()}>
                Crear grupo
            </Button>
        </>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={handleOpenChange}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Comparar estos productos juntos</DrawerTitle>
                        <DrawerDescription>Agrupa productos que consideras intercambiables.</DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4">
                        {formFields}
                    </div>
                    <DrawerFooter className="gap-2">
                        {formActions}
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Comparar estos productos juntos</DialogTitle>
                    <DialogDescription>Agrupa productos que consideras intercambiables.</DialogDescription>
                </DialogHeader>
                {formFields}
                <DialogFooter className="gap-2">
                    {formActions}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ActionsMenu({
    productIds,
    viewProduct,
    onUngroup,
    onRemoveProducts,
    onViewProduct,
}: {
    productIds: number[];
    viewProduct: ProductWithPrices;
    onUngroup?: () => void;
    onRemoveProducts: (productIds: number[]) => void | Promise<void>;
    onViewProduct: (product: ProductWithPrices) => void;
}) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);

    const handleRemove = () => {
        void onRemoveProducts(productIds);
        setOpen(false);
    };

    const handleView = () => {
        onViewProduct(viewProduct);
        setOpen(false);
    };

    const handleUngroup = () => {
        onUngroup?.();
        setOpen(false);
    };

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    <Button
                        size="icon-sm"
                        variant="secondary"
                        className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 rounded-full shadow-sm"
                        aria-label="Abrir opciones"
                    >
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle className="truncate">
                            {viewProduct.name} {viewProduct.unit}
                        </DrawerTitle>
                        <DrawerDescription>Elige una accion</DrawerDescription>
                    </DrawerHeader>
                    <div className="grid gap-2 px-4 pb-4">
                        {onUngroup ? (
                            <Button
                                variant="ghost"
                                className="justify-start gap-2"
                                onClick={handleUngroup}
                            >
                                <Ungroup />
                                Separar
                            </Button>
                        ) : null}
                        <Button
                            variant="ghost"
                            className="justify-start gap-2 text-destructive hover:text-destructive"
                            onClick={handleRemove}
                        >
                            <Trash2 />
                            Eliminar de la comparacion
                        </Button>
                        <Button
                            variant="ghost"
                            className="justify-start gap-2"
                            onClick={handleView}
                        >
                            <ExternalLink />
                            Ver producto
                        </Button>
                    </div>
                    <DrawerFooter className="pt-0">
                        <Button onClick={() => setOpen(false)}>OK</Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    size="icon-sm"
                    variant="secondary"
                    className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 rounded-full shadow-sm"
                    aria-label="Abrir opciones"
                >
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={6}>
                {onUngroup ? (
                    <>
                        <DropdownMenuItem onSelect={onUngroup}>
                            <Ungroup />
                            Separar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                ) : null}
                <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                        handleRemove();
                    }}
                >
                    <Trash2 />
                    Eliminar de la comparacion
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleView}>
                    <ExternalLink />
                    Ver producto
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function AddProductSearchPanel({
    shops,
    excludedProductIds,
    onAddProduct,
}: {
    shops: shopsSelect[];
    excludedProductIds: Set<number>;
    onAddProduct: (product: ProductWithPrices) => void | Promise<void>;
}) {
    const [searchValue, setSearchValue] = useState("");
    const [searchResults, setSearchResults] = useState<ProductWithPrices[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const shopsById = new Map(shops.map((shop) => [shop.id, shop.name]));

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedValue = searchValue.trim();
        if (!trimmedValue) {
            setSearchResults([]);
            setHasSearched(false);
            return;
        }

        setIsSearching(true);
        setHasSearched(true);
        setSearchResults([]);

        try {
            const response = await fetch(
                `/api/compare/search?value=${encodeURIComponent(trimmedValue)}&limit=10`
            );
            const data = await response.json();
            const results = Array.isArray(data?.products) ? data.products : [];
            setSearchResults(results);
        } catch {
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const visibleResults = searchResults.filter(
        (product) => !excludedProductIds.has(product.id)
    );

    return (
        <div className="w-[280px] shrink-0 border-l bg-background px-4 py-4">
            <div className="text-lg font-semibold">Add product</div>
            <form onSubmit={handleSubmit} className="mt-2">
                <div className="relative">
                    <Input
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Search by name..."
                        className="pr-9"
                    />
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
            </form>
            {isSearching ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner />
                    Buscando productos...
                </div>
            ) : null}
            {!isSearching && hasSearched && visibleResults.length === 0 ? (
                <div className="mt-3 text-sm text-muted-foreground">
                    Sin resultados.
                </div>
            ) : null}
            <div className="mt-3 space-y-2">
                {visibleResults.map((product) => {
                    const visiblePrices = product.shopCurrentPrices.filter(
                        (price) => price.currentPrice && price.hidden !== true
                    );
                    const cheapest = visiblePrices.reduce((min, price) => {
                        const numericPrice = Number(price.currentPrice);
                        if (Number.isNaN(numericPrice)) {
                            return min;
                        }
                        return Math.min(min, numericPrice);
                    }, Number.POSITIVE_INFINITY);
                    const shopNames = Array.from(
                        new Set(
                            visiblePrices
                                .map((price) => shopsById.get(price.shopId))
                                .filter((name): name is string => Boolean(name))
                        )
                    ).join(", ");

                    return (
                        <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                                void onAddProduct(product);
                            }}
                            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50"
                        >
                            <div className="relative h-12 w-12 shrink-0 rounded-md bg-muted/30">
                                <ProductImage
                                    src={product.image ? product.image : "/no-product-found.jpg"}
                                    fill
                                    sizes="48px"
                                    style={{
                                        objectFit: "contain",
                                    }}
                                    alt={product.name + product.unit}
                                    placeholder="blur"
                                    blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                                    className="max-w-none"
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="line-clamp-1 text-sm font-medium text-foreground">
                                    {product.name} {product.unit}
                                </div>
                                <div className="text-sm font-semibold">
                                    {Number.isFinite(cheapest)
                                        ? `RD$${cheapest.toFixed(2)}`
                                        : "RD$--"}
                                </div>
                                <div className="line-clamp-1 text-xs text-muted-foreground">
                                    {shopNames || "Sin supermercados"}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    )
}

"use client";

import { listItemsSelect, productsSelect, productsShopsPrices, shopsSelect } from "@/db/schema"
import { ProductImage } from "./product-image"
import { Item, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemMedia, ItemTitle } from "./ui/item"
import { Button } from "./ui/button"
import React, { useTransition } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "./ui/drawer";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { updateGroupIgnoredProducts, updateItemAmount, deleteItem, deleteGroupItem } from "@/lib/compare";
import { ArrowRightSquare, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toSlug } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

type Product = productsSelect & { shopCurrentPrices: Array<productsShopsPrices & { shop: shopsSelect }> }

type GroupAlternative = {
    product: Product
    price: number
    shopName: string
    shopId: number
    isCurrent: boolean
}

type GroupEntryInfo = {
    id: number
    name: string
    alternatives: GroupAlternative[]
    ignoredProducts: Product[]
    listItemId?: number
}

type ProductItemEntry = {
    rowKey: string
    product: Product
    amount?: number | null
    listItem?: listItemsSelect
    comparisonLabel?: string | null
    group?: GroupEntryInfo
}

type ProductItemsProps = {
    items: ProductItemEntry[]
}

export function ProductItems({ items }: ProductItemsProps ) {
    const isMobile = useIsMobile()
    const [localItems, setLocalItems] = React.useState(items);

    React.useEffect(() => {
        setLocalItems(items);
    }, [items]);

    const handleAmountChange = React.useCallback((itemId: number, nextAmount: number) => {
        setLocalItems((current) =>
            current.map((entry) => {
                if (!entry.listItem || entry.listItem.id !== itemId) {
                    return entry;
                }

                return {
                    ...entry,
                    amount: nextAmount,
                    listItem: {
                        ...entry.listItem,
                        amount: nextAmount,
                    },
                };
            })
        );
    }, []);

    if (isMobile) {
        return (
            <ItemGroup className="gap-2">
                {localItems.map((entry) => (
                    <ItemProductDrawer
                        key={entry.rowKey}
                        entry={entry}
                        onAmountChange={handleAmountChange}
                    />
                ))}
            </ItemGroup>
        )
    }

    return (
        <ItemGroup className="gap-2">
            {localItems.map((entry) => (
                <ItemProductDialog
                    key={entry.rowKey}
                    entry={entry}
                    onAmountChange={handleAmountChange}
                />
            ))}
        </ItemGroup>
    )
}

type DialogDrawerProps = {
    entry: ProductItemEntry
    onAmountChange?: (itemId: number, nextAmount: number) => void
}

function ItemProductDialog({ entry, onAmountChange }: DialogDrawerProps) {
    const [open, setOpen] = React.useState(false);
    const amount = entry.amount ?? entry.listItem?.amount;
    const isGroup = Boolean(entry.group);

    if (!entry.listItem && !isGroup) {
        return (
            <Item asChild role="listItem" variant="outline">
                <ProductItemATag product={entry.product} amount={amount} comparisonLabel={entry.comparisonLabel} />
            </Item>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Item asChild role="listItem" variant="outline">
                    <ProductItemATag product={entry.product} amount={amount} comparisonLabel={entry.comparisonLabel} />
                </Item>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>{isGroup ? entry.group?.name : "Acciones"}</DialogTitle>
                </DialogHeader>
                {isGroup && entry.group ? (
                    <GroupDetails group={entry.group} type="dialog" onClose={() => setOpen(false)} />
                ) : (
                    <ProductDetails
                        product={entry.product}
                        item={entry.listItem}
                        onItemClose={() => setOpen(false)}
                        onAmountChange={onAmountChange}
                    />
                )}
            </DialogContent>
        </Dialog>
    )    
}

function ItemProductDrawer({ entry, onAmountChange }: DialogDrawerProps) {
    const [open, setOpen] = React.useState(false);
    const amount = entry.amount ?? entry.listItem?.amount;
    const isGroup = Boolean(entry.group);

    if (!entry.listItem && !isGroup) {
        return (
            <Item asChild role="listItem" variant="outline">
                <ProductItemATag product={entry.product} amount={amount} comparisonLabel={entry.comparisonLabel} />
            </Item>
        )
    }

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Item asChild role="listItem" variant="outline">
                    <ProductItemATag product={entry.product} amount={amount} comparisonLabel={entry.comparisonLabel} />
                </Item>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                <DrawerTitle>{isGroup ? entry.group?.name : "Acciones"}</DrawerTitle>
                </DrawerHeader>
                {isGroup && entry.group ? (
                    <GroupDetails group={entry.group} type="drawer" onClose={() => setOpen(false)} />
                ) : (
                    <ProductDetails
                        product={entry.product}
                        item={entry.listItem}
                        onItemClose={() => setOpen(false)}
                        onAmountChange={onAmountChange}
                    />
                )}
            </DrawerContent>
        </Drawer>
    )
}


type ProductItemATagProps = React.ComponentPropsWithoutRef<"a"> & {
    product: Product;
    amount?: number | null
    comparisonLabel?: string | null
}

const ProductItemATag = React.forwardRef<HTMLAnchorElement, ProductItemATagProps>(
    ({ product, amount, comparisonLabel, onClick, ...props }, ref) => {
        const displayAmount = amount && amount > 1 ? amount : null
        const priceEntries = product.shopCurrentPrices
            .map((shopPrice) => {
                const value = Number(shopPrice.currentPrice);
                if (!Number.isFinite(value)) {
                    return null;
                }
                return { value, raw: shopPrice, shopName: shopPrice.shop.name };
            })
            .filter((entry): entry is { value: number; raw: typeof product.shopCurrentPrices[number]; shopName: string } => Boolean(entry));

        let price = "";
        let computedComparisonLabel: string | null = null;

        if (priceEntries.length > 0) {
            const currentShopId = product.shopCurrentPrices[0]?.shopId;
            const currentEntry =
                currentShopId !== undefined
                    ? priceEntries.find((entry) => entry.raw.shopId === currentShopId) ??
                      priceEntries[0]
                    : priceEntries[0];

            if (currentEntry.raw.currentPrice !== undefined && currentEntry.raw.currentPrice !== null) {
                price = `RD$${currentEntry.raw.currentPrice}`;
            }

            const comparisonEntries = priceEntries.filter(
                (entry) => entry.raw.shopId !== currentEntry.raw.shopId
            );

            if (comparisonEntries.length > 0) {
                let comparisonEntry = comparisonEntries[0];

                for (const entry of comparisonEntries.slice(1)) {
                    if (entry.value > comparisonEntry.value) {
                        comparisonEntry = entry;
                    }
                }

                const difference = comparisonEntry.value - currentEntry.value;

                if (difference > 0) {
                    computedComparisonLabel = `RD$${difference.toFixed(2)} mas barato que ${comparisonEntry.shopName}`;
                } else if (difference === 0) {
                    computedComparisonLabel = `Mismo precio que ${comparisonEntry.shopName}`;
                }
            }
        }

        const resolvedComparisonLabel =
            typeof comparisonLabel !== "undefined" ? comparisonLabel : computedComparisonLabel;

        return (
            <a
                ref={ref}
                href="#"
                onClick={(event) => {
                    onClick?.(event)
                    if (!props.href || props.href === "#") {
                        event.preventDefault()
                    }
                }}
                {...props}
            >
                <ItemMedia variant="image" className="size-20">
                    <ProductImage
                        src={product.image ? product.image : "/no-product-found.jpg"}
                        fill
                        alt={product.name + product.unit}
                        sizes="80px"
                        style={{
                            objectFit: "contain",
                        }}
                        placeholder="blur"
                        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                        className="max-w-none"
                    />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle className="line-clamp-1 text-base font-normal">
                        {product.name} {product.unit}
                    </ItemTitle>
                </ItemContent>
                <ItemContent className="flex flex-col items-end gap-1 text-right">
                    <div className="flex items-center gap-2">
                        {displayAmount ? ( <div> {displayAmount}x </div>) : null}
                        <ItemDescription className="text-base font-semibold text-black">
                            {price}
                        </ItemDescription>
                    </div>
                </ItemContent>
            {resolvedComparisonLabel ? (
                <ItemFooter className="justify-end">
                    <Badge variant="secondary">
                        {resolvedComparisonLabel}
                    </Badge>
                </ItemFooter>
                ) : null}
            </a>
        )
    }
)

ProductItemATag.displayName = "ProductItemATag"

type GroupDetailsProps = {
    group: GroupEntryInfo
    type: "drawer" | "dialog"
    onClose?: () => void
}

function GroupDetails({ group, type, onClose }: GroupDetailsProps) {
    const router = useRouter();
    const [alternatives, setAlternatives] = React.useState(group.alternatives);
    const [ignoredProducts, setIgnoredProducts] = React.useState(group.ignoredProducts);
    const [ignorePending, startIgnoreTransition] = useTransition();
    const alternativesRef = React.useRef(group.alternatives);
    const ignoredProductsRef = React.useRef(group.ignoredProducts);

    React.useEffect(() => {
        setAlternatives(group.alternatives);
        setIgnoredProducts(group.ignoredProducts);
        alternativesRef.current = group.alternatives;
        ignoredProductsRef.current = group.ignoredProducts;
    }, [group.alternatives, group.ignoredProducts]);

    const commitIgnoredProducts = (nextIgnoredProducts: Product[]) => {
        const listItemId = group.listItemId;
        if (!listItemId) {
            return;
        }

        startIgnoreTransition(() => {
            void updateGroupIgnoredProducts(
                listItemId,
                nextIgnoredProducts.map((product) => product.id)
            ).then(() => {
                router.refresh();
            });
        });
    };

    const handleIgnore = (alternative: GroupAlternative) => {
        if (!group.listItemId) {
            return;
        }

        const nextAlternatives = alternativesRef.current.filter(
            (entry) => entry.product.id !== alternative.product.id
        );
        const alreadyIgnored = ignoredProductsRef.current.some(
            (product) => product.id === alternative.product.id
        );

        alternativesRef.current = nextAlternatives;
        setAlternatives(nextAlternatives);

        if (alreadyIgnored) {
            return;
        }

        const nextIgnored = [...ignoredProductsRef.current, alternative.product];
        ignoredProductsRef.current = nextIgnored;
        setIgnoredProducts(nextIgnored);
        commitIgnoredProducts(nextIgnored);
    };

    const handleRestore = (product: Product) => {
        if (!group.listItemId) {
            return;
        }

        const nextIgnored = ignoredProductsRef.current.filter((entry) => entry.id !== product.id);
        ignoredProductsRef.current = nextIgnored;
        setIgnoredProducts(nextIgnored);
        commitIgnoredProducts(nextIgnored);
    };

    const handleDeleteGroup = () => {
        const listItemId = group.listItemId;
        if (!listItemId) {
            return;
        }

        startIgnoreTransition(() => {
            void deleteGroupItem(listItemId).then(() => {
                router.refresh();
                onClose?.();
            });
        });
    };

    const hasAlternatives = alternatives.length > 0;
    const hasIgnored = ignoredProducts.length > 0;
    const canDeleteGroup = Boolean(group.listItemId);
    const deleteGroupButton = canDeleteGroup ? (
        <Button
            size="sm"
            variant="destructive"
            className="gap-2"
            onClick={handleDeleteGroup}
            disabled={ignorePending}
        >
            <Trash className="size-4" />
            Eliminar grupo
        </Button>
    ) : null;

    if (!hasAlternatives && !hasIgnored) {
        return (
            <div className="py-6 text-center text-sm text-muted-foreground">
                No hay alternativas disponibles en otros supermercados.
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col gap-3 pb-2 px-2 overflow-auto">
                {hasAlternatives ? (
                    alternatives.map((alternative) => {
                        const priceLabel = Number.isFinite(alternative.price)
                            ? `RD$${alternative.price.toFixed(2)}`
                            : "RD$--";

                        return (
                            <div
                                key={`${alternative.product.id}-${alternative.shopId}`}
                                className="rounded-md border border-border p-3 space-y-2"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="size-14 relative">
                                        <ProductImage
                                            src={alternative.product.image ? alternative.product.image : "/no-product-found.jpg"}
                                            fill
                                            alt={alternative.product.name + alternative.product.unit}
                                            sizes="56px"
                                            style={{
                                                objectFit: "contain",
                                            }}
                                            placeholder="blur"
                                            blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                                            className="max-w-none"
                                        />
                                    </div>
                                    <div className="flex flex-1 flex-col gap-1">
                                        <p className="text-sm font-semibold">
                                            {alternative.product.name} {alternative.product.unit}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{alternative.shopName}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {alternative.isCurrent ? (
                                            <Badge variant="secondary">Actual</Badge>
                                        ) : null}
                                        <span className="text-sm font-semibold">{priceLabel}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        onClick={() => handleIgnore(alternative)}
                                        disabled={ignorePending}
                                    >
                                        Ignorar
                                    </Button>
                                    <Button size="xs" variant="outline" asChild>
                                        <Link href={`/product/${toSlug(alternative.product.name)}/${alternative.product.id}`}>
                                            <ArrowRightSquare className="size-4" />
                                            Ver
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="py-2 text-center text-sm text-muted-foreground">
                        No hay alternativas disponibles en otros supermercados.
                    </div>
                )}
                {hasIgnored ? (
                    <>
                        <Separator />
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Ignorados
                        </div>
                        {ignoredProducts.map((product) => (
                            <div
                                key={`ignored-${product.id}`}
                                className="flex items-center gap-3 rounded-md border border-border p-3"
                            >
                                <div className="size-14 relative">
                                    <ProductImage
                                        src={product.image ? product.image : "/no-product-found.jpg"}
                                        fill
                                        alt={product.name + product.unit}
                                        sizes="56px"
                                        style={{
                                            objectFit: "contain",
                                        }}
                                        placeholder="blur"
                                        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                                        className="max-w-none"
                                    />
                                </div>
                                <div className="flex flex-1 flex-col gap-1">
                                    <p className="text-sm font-semibold">
                                        {product.name} {product.unit}
                                    </p>
                                </div>
                                <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => handleRestore(product)}
                                    disabled={ignorePending}
                                >
                                    Agregar
                                </Button>
                            </div>
                        ))}
                    </>
                ) : null}
            </div>
            {type === "drawer" ? (
                <DrawerFooter>
                    <div className="flex justify-end">
                        {deleteGroupButton}
                    </div>
                </DrawerFooter>
            ): (
                <DialogFooter>
                    {deleteGroupButton}
                </DialogFooter>
            )}
        </>
    )
}

type ProductDetailsProps = {
    product: Product
    item?: listItemsSelect
    onItemClose: () => void
    onAmountChange?: (itemId: number, nextAmount: number) => void
}

function ProductDetails({ product, item, onItemClose, onAmountChange }: ProductDetailsProps ) {
    const [quantity, setQuantity] = React.useState(item?.amount ? item.amount : 1)
    const [, startUpdateTransition] = useTransition();
    const amountUpdateTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingAmountRef = React.useRef<number | null>(null);
    const quantityRef = React.useRef<number>(item?.amount ? item.amount : 1);
    const itemId = item?.id;

    const price = product.shopCurrentPrices[0]?.currentPrice
    const formattedPrice = price !== undefined ? `RD$${price}` : ""

    React.useEffect(() => {
        return () => {
            if (amountUpdateTimeoutRef.current) {
                clearTimeout(amountUpdateTimeoutRef.current);
                amountUpdateTimeoutRef.current = null;
            }

            const pendingAmount = pendingAmountRef.current;
            pendingAmountRef.current = null;

            if (pendingAmount !== null && itemId) {
                void updateItemAmount(pendingAmount, itemId);
            }
        };
    }, [itemId]);

    if (!item) {
        return null;
    }

    const scheduleAmountUpdate = (nextQuantity: number) => {
        if (!itemId) {
            return;
        }

        onAmountChange?.(itemId, nextQuantity);
        pendingAmountRef.current = nextQuantity;

        if (amountUpdateTimeoutRef.current) {
            clearTimeout(amountUpdateTimeoutRef.current);
        }

        amountUpdateTimeoutRef.current = setTimeout(() => {
            const amountToSend = pendingAmountRef.current;
            pendingAmountRef.current = null;
            amountUpdateTimeoutRef.current = null;

            if (amountToSend === null) {
                return;
            }

            startUpdateTransition(() => {
                void updateItemAmount(amountToSend, itemId);
            });
        }, 400);
    };

    const applyQuantityChange = (nextQuantity: number) => {
        quantityRef.current = nextQuantity;
        setQuantity(nextQuantity);
        scheduleAmountUpdate(nextQuantity);
    };

    const handleDecrease = () => {
        const nextQuantity = Math.max(1, quantityRef.current - 1);
        applyQuantityChange(nextQuantity);
    }

    const handleIncrease = () => {
        const nextQuantity = quantityRef.current + 1;
        applyQuantityChange(nextQuantity);
    }

    const handleDeleteItemFromList = async () => {
        await deleteItem(item.id);
        onItemClose();
    }


    return (
        <div className="flex flex-col gap-6 pb-4">
            <div className="flex flex-col items-center gap-4">
                <div className="size-40 relative">
                    <ProductImage
                        src={product.image ? product.image : "/no-product-found.jpg"}
                        fill
                        alt={product.name + product.unit}
                        sizes="160px"
                        style={{
                            objectFit: "contain",
                        }}
                        placeholder="blur"
                        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                        className="max-w-none"
                    />
                </div>
                <div className="text-center">
                    <p className="text-lg font-semibold">
                        {product.name} {product.unit}
                    </p>
                    <p className="text-base text-muted-foreground">{formattedPrice}</p>
                </div>
            </div>
            <div className="flex items-center justify-center gap-4">
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleDecrease}
                    aria-label="Disminuir cantidad"
                    disabled={quantity <= 1}
                >
                    -
                </Button>
                <span className="text-xl font-semibold tabular-nums">{quantity}</span>
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleIncrease}
                    aria-label="Incrementar cantidad"
                >
                    +
                </Button>
            </div>
            <div className="flex gap-2 items-center justify-center">
                <Button size="icon-lg" variant="outline" onClick={handleDeleteItemFromList} aria-label="Eliminar producto lista">
                    <Trash />
                </Button>
                <Button size="icon-lg" variant="outline" aria-label="Ver producto" asChild>
                    <Link href={`/product/${toSlug(product.name)}/${product.id}`}>
                        <ArrowRightSquare />
                    </Link>
                </Button>
            </div>
        </div>
    )
}

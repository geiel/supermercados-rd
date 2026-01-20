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
import { ArrowRightSquare, Loader2, Tag, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toSlug } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";

type Product = productsSelect & {
    shopCurrentPrices: Array<productsShopsPrices & { shop: shopsSelect }>
    categoryName?: string | null
}

type ComparisonDisplay =
    | {
          label: string
          kind: "cheaper" | "same"
          prefix: string
          shopName: string
      }
    | {
          label: string
          kind: "unknown"
      }

const parseComparisonLabel = (label: string): ComparisonDisplay => {
    const cheaperMatch = label.match(/^(.*?mas barato que)\s+(.+)$/i)
    if (cheaperMatch) {
        return {
            label,
            kind: "cheaper",
            prefix: `${cheaperMatch[1]} `,
            shopName: cheaperMatch[2],
        }
    }

    const sameMatch = label.match(/^(Mismo (precio|valor) que)\s+(.+)$/i)
    if (sameMatch) {
        return {
            label,
            kind: "same",
            prefix: `${sameMatch[1]} `,
            shopName: sameMatch[3],
        }
    }

    return { label, kind: "unknown" }
}

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
    humanId?: string | null
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
    openRowKey?: string | null
    onOpenChange?: (rowKey: string | null) => void
    onLocalDeleteProduct?: (productId: number, listItemId?: number) => void
    onLocalDeleteGroup?: (groupId: number, listGroupItemId?: number) => void
    onLocalIgnoreProduct?: (groupId: number, productId: number, listGroupItemId?: number) => void
    onLocalRestoreProduct?: (groupId: number, productId: number, listGroupItemId?: number) => void
    /** Product IDs currently being processed (show loading overlay) */
    loadingProductIds?: Set<number>
    /** Group IDs currently being processed (show loading overlay) */
    loadingGroupIds?: Set<number>
    /** When true, items are displayed without edit/delete actions (for shared lists) */
    readOnly?: boolean
}

export function ProductItems({ items, openRowKey, onOpenChange, onLocalDeleteProduct, onLocalDeleteGroup, onLocalIgnoreProduct, onLocalRestoreProduct, loadingProductIds, loadingGroupIds, readOnly }: ProductItemsProps ) {
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

    // Only pass controlled props if parent provided them
    const isControlledMode = onOpenChange !== undefined;

    // Read-only mode: display items as links to product pages
    if (readOnly) {
        return (
            <ItemGroup className="gap-2">
                {localItems.map((entry) => {
                    const amount = entry.amount ?? entry.listItem?.amount;
                    const productUrl = `/product/${toSlug(entry.product.name)}/${entry.product.id}`;
                    return (
                        <Item key={entry.rowKey} asChild role="listItem" variant="outline">
                            <ProductItemATag 
                                product={entry.product} 
                                amount={amount} 
                                comparisonLabel={entry.comparisonLabel}
                                groupName={entry.group?.name}
                                href={productUrl}
                            />
                        </Item>
                    );
                })}
            </ItemGroup>
        );
    }

    if (isMobile) {
        return (
            <ItemGroup className="gap-2">
                {localItems.map((entry) => (
                    <ItemProductDrawer
                        key={entry.rowKey}
                        entry={entry}
                        isOpen={isControlledMode ? openRowKey === entry.rowKey : undefined}
                        onOpenChange={isControlledMode ? (open) => onOpenChange(open ? entry.rowKey : null) : undefined}
                        onAmountChange={handleAmountChange}
                        onLocalDeleteProduct={onLocalDeleteProduct}
                        onLocalDeleteGroup={onLocalDeleteGroup}
                        onLocalIgnoreProduct={onLocalIgnoreProduct}
                        onLocalRestoreProduct={onLocalRestoreProduct}
                        loadingProductIds={loadingProductIds}
                        loadingGroupIds={loadingGroupIds}
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
                    isOpen={isControlledMode ? openRowKey === entry.rowKey : undefined}
                    onOpenChange={isControlledMode ? (open) => onOpenChange(open ? entry.rowKey : null) : undefined}
                    onAmountChange={handleAmountChange}
                    onLocalDeleteProduct={onLocalDeleteProduct}
                    onLocalDeleteGroup={onLocalDeleteGroup}
                    onLocalIgnoreProduct={onLocalIgnoreProduct}
                    onLocalRestoreProduct={onLocalRestoreProduct}
                    loadingProductIds={loadingProductIds}
                    loadingGroupIds={loadingGroupIds}
                />
            ))}
        </ItemGroup>
    )
}

type DialogDrawerProps = {
    entry: ProductItemEntry
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
    onAmountChange?: (itemId: number, nextAmount: number) => void
    onLocalDeleteProduct?: (productId: number, listItemId?: number) => void
    onLocalDeleteGroup?: (groupId: number, listGroupItemId?: number) => void
    onLocalIgnoreProduct?: (groupId: number, productId: number, listGroupItemId?: number) => void
    onLocalRestoreProduct?: (groupId: number, productId: number, listGroupItemId?: number) => void
    loadingProductIds?: Set<number>
    loadingGroupIds?: Set<number>
}

function ItemProductDialog({ entry, isOpen, onOpenChange, onAmountChange, onLocalDeleteProduct, onLocalDeleteGroup, onLocalIgnoreProduct, onLocalRestoreProduct, loadingProductIds, loadingGroupIds }: DialogDrawerProps) {
    // Use external open state only if onOpenChange is provided (controlled mode)
    const [internalOpen, setInternalOpen] = React.useState(false);
    const isControlled = onOpenChange !== undefined;
    const open = isControlled ? (isOpen ?? false) : internalOpen;
    const setOpen = isControlled ? onOpenChange : setInternalOpen;
    const amount = entry.amount ?? entry.listItem?.amount;
    const isGroup = Boolean(entry.group);
    const canShowDialog = entry.listItem || isGroup || onLocalDeleteProduct || onLocalDeleteGroup;

    if (!canShowDialog) {
        return (
            <Item asChild role="listItem" variant="outline">
                <ProductItemATag
                    product={entry.product}
                    amount={amount}
                    comparisonLabel={entry.comparisonLabel}
                    groupName={entry.group?.name}
                />
            </Item>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Item asChild role="listItem" variant="outline">
                    <ProductItemATag
                        product={entry.product}
                        amount={amount}
                        comparisonLabel={entry.comparisonLabel}
                        groupName={entry.group?.name}
                    />
                </Item>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>{isGroup ? entry.group?.name : "Acciones"}</DialogTitle>
                </DialogHeader>
                {isGroup && entry.group ? (
                    <GroupDetails 
                        group={entry.group} 
                        type="dialog" 
                        onClose={() => setOpen(false)} 
                        onLocalDeleteGroup={onLocalDeleteGroup}
                        onLocalIgnoreProduct={onLocalIgnoreProduct}
                        onLocalRestoreProduct={onLocalRestoreProduct}
                        externalLoadingProductIds={loadingProductIds}
                    />
                ) : (
                    <ProductDetails
                        product={entry.product}
                        item={entry.listItem}
                        onItemClose={() => setOpen(false)}
                        onAmountChange={onAmountChange}
                        onLocalDeleteProduct={onLocalDeleteProduct}
                    />
                )}
            </DialogContent>
        </Dialog>
    )    
}

function ItemProductDrawer({ entry, isOpen, onOpenChange, onAmountChange, onLocalDeleteProduct, onLocalDeleteGroup, onLocalIgnoreProduct, onLocalRestoreProduct, loadingProductIds, loadingGroupIds }: DialogDrawerProps) {
    // Use external open state only if onOpenChange is provided (controlled mode)
    const [internalOpen, setInternalOpen] = React.useState(false);
    const isControlled = onOpenChange !== undefined;
    const open = isControlled ? (isOpen ?? false) : internalOpen;
    const setOpen = isControlled ? onOpenChange : setInternalOpen;
    const amount = entry.amount ?? entry.listItem?.amount;
    const isGroup = Boolean(entry.group);
    const canShowDrawer = entry.listItem || isGroup || onLocalDeleteProduct || onLocalDeleteGroup;

    if (!canShowDrawer) {
        return (
            <Item asChild role="listItem" variant="outline">
                <ProductItemATag
                    product={entry.product}
                    amount={amount}
                    comparisonLabel={entry.comparisonLabel}
                    groupName={entry.group?.name}
                />
            </Item>
        )
    }

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Item asChild role="listItem" variant="outline">
                    <ProductItemATag
                        product={entry.product}
                        amount={amount}
                        comparisonLabel={entry.comparisonLabel}
                        groupName={entry.group?.name}
                    />
                </Item>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{isGroup ? entry.group?.name : "Acciones"}</DrawerTitle>
                </DrawerHeader>
                {isGroup && entry.group ? (
                    <GroupDetails 
                        group={entry.group} 
                        type="drawer" 
                        onClose={() => setOpen(false)} 
                        onLocalDeleteGroup={onLocalDeleteGroup}
                        onLocalIgnoreProduct={onLocalIgnoreProduct}
                        onLocalRestoreProduct={onLocalRestoreProduct}
                        externalLoadingProductIds={loadingProductIds}
                    />
                ) : (
                    <ProductDetails
                        product={entry.product}
                        item={entry.listItem}
                        onItemClose={() => setOpen(false)}
                        onAmountChange={onAmountChange}
                        onLocalDeleteProduct={onLocalDeleteProduct}
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
    groupName?: string | null
}

const ProductItemATag = React.forwardRef<HTMLAnchorElement, ProductItemATagProps>(
    ({ product, amount, comparisonLabel, groupName, onClick, ...props }, ref) => {
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
        let computedComparison: ComparisonDisplay | null = null;

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
                    const label = `RD$${difference.toFixed(2)} mas barato que ${comparisonEntry.shopName}`;
                    computedComparison = {
                        label,
                        kind: "cheaper",
                        prefix: `RD$${difference.toFixed(2)} mas barato que `,
                        shopName: comparisonEntry.shopName,
                    };
                } else if (difference === 0) {
                    const label = `Mismo precio que ${comparisonEntry.shopName}`;
                    computedComparison = {
                        label,
                        kind: "same",
                        prefix: "Mismo precio que ",
                        shopName: comparisonEntry.shopName,
                    };
                }
            }
        }

        const resolvedComparison =
            typeof comparisonLabel !== "undefined"
                ? comparisonLabel
                    ? parseComparisonLabel(comparisonLabel)
                    : null
                : computedComparison;
        const resolvedGroupName = groupName?.trim();
        const hasCategoryBadge = Boolean(resolvedGroupName);

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
                <ProductItemBadges
                    resolvedComparison={resolvedComparison}
                    categoryName={resolvedGroupName}
                    hasCategoryBadge={hasCategoryBadge}
                />
            </a>
        )
    }
)

ProductItemATag.displayName = "ProductItemATag"

type ProductItemBadgesProps = {
    resolvedComparison: ComparisonDisplay | null
    categoryName?: string | null
    hasCategoryBadge: boolean
}

function ProductItemBadges({
    resolvedComparison,
    categoryName,
    hasCategoryBadge,
}: ProductItemBadgesProps) {
    if (!resolvedComparison && !hasCategoryBadge) {
        return null
    }

    const footerClassName = hasCategoryBadge && resolvedComparison
        ? "flex-col items-end gap-1 md:flex-row md:items-center md:justify-between"
        : hasCategoryBadge
          ? "justify-start"
          : "justify-end"

    return (
        <ItemFooter className={footerClassName}>
            {hasCategoryBadge ? (
                <Badge
                    variant="secondary"
                    className="border border-purple-200/70 bg-purple-100/70 text-purple-900"
                >
                    <Tag className="size-3" />
                    <span className="font-medium">De categoría:</span>
                    <span className="font-semibold">{categoryName}</span>
                </Badge>
            ) : null}
            {resolvedComparison ? (
                <Badge
                    variant="secondary"
                    className={
                        resolvedComparison.kind === "cheaper"
                            ? "bg-emerald-100 text-emerald-900 border-emerald-200/70"
                            : undefined
                    }
                >
                    {resolvedComparison.kind === "unknown" ? (
                        resolvedComparison.label
                    ) : (
                        <>
                            <span>{resolvedComparison.prefix}</span>
                            <span className="font-semibold">{resolvedComparison.shopName}</span>
                        </>
                    )}
                </Badge>
            ) : null}
        </ItemFooter>
    )
}

type GroupDetailsProps = {
    group: GroupEntryInfo
    type: "drawer" | "dialog"
    onClose?: () => void
    onLocalDeleteGroup?: (groupId: number, listGroupItemId?: number) => void
    onLocalIgnoreProduct?: (groupId: number, productId: number, listGroupItemId?: number) => void
    onLocalRestoreProduct?: (groupId: number, productId: number, listGroupItemId?: number) => void
    /** External loading product IDs (from parent mutations hook) */
    externalLoadingProductIds?: Set<number>
}

function GroupDetails({ group, type, onClose, onLocalDeleteGroup, onLocalIgnoreProduct, onLocalRestoreProduct, externalLoadingProductIds }: GroupDetailsProps) {
    const router = useRouter();
    const [alternatives, setAlternatives] = React.useState(group.alternatives);
    const [ignoredProducts, setIgnoredProducts] = React.useState(group.ignoredProducts);
    const [ignorePending, startIgnoreTransition] = useTransition();
    const [isDeletingGroup, setIsDeletingGroup] = React.useState(false);
    // Track product IDs that are being ignored/restored (showing loading state)
    const [internalLoadingProductIds, setInternalLoadingProductIds] = React.useState<Set<number>>(new Set());
    const alternativesRef = React.useRef(group.alternatives);
    const ignoredProductsRef = React.useRef(group.ignoredProducts);
    // Store full alternative data for ignored products so we can restore them properly
    const ignoredAlternativesRef = React.useRef<Map<number, GroupAlternative>>(new Map());
    const scrollAreaClassName =
        type === "dialog" ? "max-h-[60vh] w-full" : "w-full overflow-auto";

    // Combine internal and external loading states
    const loadingProductIds = React.useMemo(() => {
        if (!externalLoadingProductIds) return internalLoadingProductIds;
        const combined = new Set(internalLoadingProductIds);
        for (const id of externalLoadingProductIds) combined.add(id);
        return combined;
    }, [internalLoadingProductIds, externalLoadingProductIds]);

    // Setter for internal loading state
    const setLoadingProductIds = setInternalLoadingProductIds;

    // When group data updates from parent, sync local state and clear loading states
    React.useEffect(() => {
        setAlternatives(group.alternatives);
        setIgnoredProducts(group.ignoredProducts);
        alternativesRef.current = group.alternatives;
        ignoredProductsRef.current = group.ignoredProducts;
        
        // Clear all internal loading states when new data arrives - operations are complete
        setInternalLoadingProductIds((current) => {
            if (current.size === 0) return current;
            return new Set();
        });
    }, [group.alternatives, group.ignoredProducts]);

    const commitIgnoredProducts = (nextIgnoredProducts: Product[]) => {
        const listItemId = group.listItemId;
        if (!listItemId) {
            return;
        }

        startIgnoreTransition(async () => {
            await updateGroupIgnoredProducts(
                listItemId,
                nextIgnoredProducts.map((product) => product.id)
            );
            // Refresh to get the new best product for the group
            router.refresh();
        });
    };

    const handleIgnore = (alternative: GroupAlternative) => {
        const productId = alternative.product.id;
        
        // Check if already being processed
        if (loadingProductIds.has(productId)) {
            return;
        }
        
        // Store full alternative data for restoration later
        ignoredAlternativesRef.current.set(productId, alternative);
        
        // Add to loading state - show loading on this product (and any duplicates)
        setLoadingProductIds((current) => new Set([...current, productId]));
        
        // Build the next ignored products list for the API call
        const alreadyIgnored = ignoredProductsRef.current.some(
            (product) => product.id === productId
        );
        
        if (alreadyIgnored) {
            return;
        }

        const nextIgnored = [...ignoredProductsRef.current, alternative.product];

        // Handle via callback (for both local and logged users with new hooks)
        if (onLocalIgnoreProduct) {
            onLocalIgnoreProduct(group.id, productId, group.listItemId);
            return;
        }

        commitIgnoredProducts(nextIgnored);
    };

    const handleRestore = (product: Product) => {
        const productId = product.id;
        
        // Check if already being processed
        if (loadingProductIds.has(productId)) {
            return;
        }
        
        // Add to loading state
        setLoadingProductIds((current) => new Set([...current, productId]));
        
        const nextIgnored = ignoredProductsRef.current.filter((entry) => entry.id !== productId);

        // Handle via callback (for both local and logged users with new hooks)
        if (onLocalRestoreProduct) {
            onLocalRestoreProduct(group.id, productId, group.listItemId);
            return;
        }

        commitIgnoredProducts(nextIgnored);
    };
    
    // Check if a product ID is loading
    const isProductLoading = (productId: number) => loadingProductIds.has(productId);

    const handleDeleteGroup = async () => {
        const listItemId = group.listItemId;
        
        // Handle via callback (for both local and logged users with new hooks)
        if (onLocalDeleteGroup) {
            setIsDeletingGroup(true);
            await onLocalDeleteGroup(group.id, listItemId);
            // Parent handles closing the dialog/drawer
            return;
        }
        
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

    const handleViewProduct = (
        event: React.MouseEvent<HTMLAnchorElement>,
        product: Product
    ) => {
        if (event.defaultPrevented) {
            return;
        }

        if (
            event.button !== 0 ||
            event.metaKey ||
            event.altKey ||
            event.ctrlKey ||
            event.shiftKey
        ) {
            return;
        }

        event.preventDefault();
        const href = `/product/${toSlug(product.name)}/${product.id}`;

        onClose?.();
        setTimeout(() => {
            router.push(href);
        }, 0);
    };

    const hasAlternatives = alternatives.length > 0;
    const hasIgnored = ignoredProducts.length > 0;
    const canDeleteGroup = Boolean(group.listItemId) || Boolean(onLocalDeleteGroup);
    const groupLink = group.humanId ? `/groups/${group.humanId}` : null;
    const deleteGroupButton = canDeleteGroup ? (
        <Button
            size="sm"
            variant="destructive"
            className="gap-2"
            onClick={handleDeleteGroup}
            disabled={ignorePending || isDeletingGroup}
        >
            {isDeletingGroup ? <Loader2 className="size-4 animate-spin" /> : <Trash className="size-4" />}
            {isDeletingGroup ? "Eliminando..." : "Eliminar categoría"}
        </Button>
    ) : null;
    const viewAllProductsButton = groupLink ? (
        <Button size="sm" variant="outline" asChild>
            <Link href={groupLink} onClick={() => onClose?.()}>
                <Tag />
                Ver categoría
            </Link>
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
            <ScrollArea className={scrollAreaClassName}>
                <div className="flex flex-col gap-3 pb-2 px-2">
                    {hasAlternatives ? (
                        alternatives.map((alternative) => {
                            const priceLabel = Number.isFinite(alternative.price)
                                ? `RD$${alternative.price.toFixed(2)}`
                                : "RD$--";
                            const isLoading = isProductLoading(alternative.product.id);

                            return (
                                <div
                                    key={`${alternative.product.id}-${alternative.shopId}`}
                                    className="relative rounded-md border border-border p-3 space-y-2"
                                >
                                    {isLoading ? (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80">
                                            <Loader2 className="size-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : null}
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
                                            disabled={ignorePending || isLoading}
                                        >
                                            Ignorar
                                        </Button>
                                        <Button size="xs" variant="outline" asChild>
                                            <Link
                                                href={`/product/${toSlug(alternative.product.name)}/${alternative.product.id}`}
                                                onClick={(event) =>
                                                    handleViewProduct(event, alternative.product)
                                                }
                                            >
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
                            {ignoredProducts.map((product) => {
                                const isLoading = isProductLoading(product.id);
                                return (
                                    <div
                                        key={`ignored-${product.id}`}
                                        className="relative flex items-center gap-3 rounded-md border border-border p-3"
                                    >
                                        {isLoading ? (
                                            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80">
                                                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : null}
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
                                            disabled={ignorePending || isLoading}
                                        >
                                            Agregar
                                        </Button>
                                    </div>
                                );
                            })}
                        </>
                    ) : null}
                </div>
            </ScrollArea>
            {type === "drawer" ? (
                <DrawerFooter>
                    <div className="flex justify-end gap-2">
                        {deleteGroupButton}
                        {viewAllProductsButton}
                    </div>
                </DrawerFooter>
            ): (
                <DialogFooter>
                    {deleteGroupButton}
                    {viewAllProductsButton}
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
    onLocalDeleteProduct?: (productId: number, listItemId?: number) => void
}

function ProductDetails({ product, item, onItemClose, onAmountChange, onLocalDeleteProduct }: ProductDetailsProps ) {
    const router = useRouter();
    const [quantity, setQuantity] = React.useState(item?.amount ? item.amount : 1)
    const [, startUpdateTransition] = useTransition();
    const amountUpdateTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingAmountRef = React.useRef<number | null>(null);
    const quantityRef = React.useRef<number>(item?.amount ? item.amount : 1);
    const itemId = item?.id;

    const price = product.shopCurrentPrices[0]?.currentPrice
    const formattedPrice = price !== undefined ? `RD$${price}` : ""
    const isLocalOnly = !item && Boolean(onLocalDeleteProduct);

    const handleViewProduct = (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (event.defaultPrevented) return;
        if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
        
        event.preventDefault();
        const href = `/product/${toSlug(product.name)}/${product.id}`;
        onItemClose();
        setTimeout(() => {
            router.push(href);
        }, 0);
    };

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

    if (!item && !isLocalOnly) {
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

    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleDeleteItemFromList = async () => {
        // Handle via callback (for both local and logged users with new hooks)
        if (onLocalDeleteProduct) {
            setIsDeleting(true);
            await onLocalDeleteProduct(product.id, item?.id);
            // Parent handles closing the dialog/drawer
            return;
        }
        
        if (item) {
            await deleteItem(item.id);
            onItemClose();
        }
    }

    // For local-only mode, show simplified UI without quantity controls
    if (isLocalOnly) {
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
                <div className="flex gap-2 items-center justify-center">
                    <Button size="icon-lg" variant="outline" onClick={handleDeleteItemFromList} disabled={isDeleting} aria-label="Eliminar producto lista">
                        {isDeleting ? <Loader2 className="animate-spin" /> : <Trash />}
                    </Button>
                    <Button size="icon-lg" variant="outline" aria-label="Ver producto" asChild>
                        <Link href={`/product/${toSlug(product.name)}/${product.id}`} onClick={handleViewProduct}>
                            <ArrowRightSquare />
                        </Link>
                    </Button>
                </div>
            </div>
        )
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
                <Button size="icon-lg" variant="outline" onClick={handleDeleteItemFromList} disabled={isDeleting} aria-label="Eliminar producto lista">
                    {isDeleting ? <Loader2 className="animate-spin" /> : <Trash />}
                </Button>
                <Button size="icon-lg" variant="outline" aria-label="Ver producto" asChild>
                    <Link href={`/product/${toSlug(product.name)}/${product.id}`} onClick={handleViewProduct}>
                        <ArrowRightSquare />
                    </Link>
                </Button>
            </div>
        </div>
    )
}

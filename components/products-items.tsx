"use client";

import { listItemsSelect, productsSelect, productsShopsPrices, shopsSelect } from "@/db/schema"
import { ProductImage } from "./product-image"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "./ui/item"
import { Button } from "./ui/button"
import React, { useTransition } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "./ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { updateItemAmount, deleteItem } from "@/lib/compare";
import { ArrowRightSquare, Trash } from "lucide-react";
import Link from "next/link";
import { toSlug } from "@/lib/utils";

type Product = productsSelect & { shopCurrentPrices: Array<productsShopsPrices & { shop: shopsSelect }> }

type ProductItemEntry = {
    rowKey: string
    product: Product
    amount?: number | null
    listItem?: listItemsSelect
    comparisonLabel?: string | null
}

type ProductItemsProps = {
    items: ProductItemEntry[]
}

export function ProductItems({ items }: ProductItemsProps ) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return (
            <ItemGroup className="gap-2">
                {items.map((entry) => (
                    <ItemProductDrawer key={entry.rowKey} entry={entry} />
                ))}
            </ItemGroup>
        )
    }

    return (
        <ItemGroup className="gap-2">
            {items.map((entry) => (
                <ItemProductDialog key={entry.rowKey} entry={entry} />
            ))}
        </ItemGroup>
    )
}

type DialogDrawerProps = { entry: ProductItemEntry }

function ItemProductDialog({ entry }: DialogDrawerProps) {
    const [open, setOpen] = React.useState(false);
    const amount = entry.amount ?? entry.listItem?.amount;

    if (!entry.listItem) {
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
                    <DialogTitle>Acciones</DialogTitle>
                </DialogHeader>
                <ProductDetails product={entry.product} item={entry.listItem} onItemClose={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    )    
}

function ItemProductDrawer({ entry }: DialogDrawerProps) {
    const [open, setOpen] = React.useState(false);
    const amount = entry.amount ?? entry.listItem?.amount;

    if (!entry.listItem) {
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
                    <DrawerTitle>Acciones</DrawerTitle>
                </DrawerHeader>
                <ProductDetails product={entry.product} item={entry.listItem} onItemClose={() => setOpen(false)} />
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
                    {resolvedComparisonLabel ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {resolvedComparisonLabel}
                        </span>
                    ) : null}
                </ItemContent>
            </a>
        )
    }
)

ProductItemATag.displayName = "ProductItemATag"

function ProductDetails({ product, item, onItemClose }: { product: Product, item?: listItemsSelect, onItemClose: () => void } ) {
    const [quantity, setQuantity] = React.useState(item?.amount ? item.amount : 1)
    const [amountUpdatePending, startUpdateTransition] = useTransition();

    const price = product.shopCurrentPrices[0]?.currentPrice
    const formattedPrice = price !== undefined ? `RD$${price}` : ""

    if (!item) {
        return null;
    }

    const handleDecrease = async () => {
        let nextQuantity = 1

        setQuantity((current) => {
            const updated = Math.max(1, current - 1)
            nextQuantity = updated
            return updated
        })

        startUpdateTransition(() => {
            updateItemAmount(nextQuantity, item.id)
        })
    }

    const handleIncrease = async () => {
        let nextQuantity = 1

        setQuantity((current) => {
            const updated = current + 1
            nextQuantity = updated
            return updated
        })

        startUpdateTransition(() => {
            updateItemAmount(nextQuantity, item.id)
        })
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
                    disabled={quantity <= 1 || amountUpdatePending}
                >
                    -
                </Button>
                <span className="text-xl font-semibold tabular-nums">{quantity}</span>
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleIncrease}
                    disabled={amountUpdatePending}
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

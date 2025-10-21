"use client";

import { listItemsSelect, productsSelect, productsShopsPrices, shopsSelect } from "@/db/schema"
import { ProductImage } from "./product-image"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "./ui/item"
import { Button } from "./ui/button"
import React, { useTransition } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerTrigger } from "./ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { updateItemAmount, deleteItem } from "@/lib/compare";
import { ArrowRightSquare, Trash } from "lucide-react";
import Link from "next/link";
import { toSlug } from "@/lib/utils";

type Product = productsSelect & { shopCurrentPrices: Array<productsShopsPrices & { shop: shopsSelect }> }

type ProductItemsProps = {
    products?: Array<Product>
    listItems: listItemsSelect[]
}

export function ProductItems({ products, listItems }: ProductItemsProps ) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return (
            <ItemGroup className="gap-2">
                {products?.map((product) => (
                    <ItemProductDrawer key={product.id}  product={product} listItems={listItems} />
                ))}
            </ItemGroup>
        )
    }

    return (
        <ItemGroup className="gap-2">
            {products?.map((product) => (
                <ItemProductDialog key={product.id} product={product} listItems={listItems} />
            ))}
        </ItemGroup>
    )
}

type DialogDrawerProps = { product: Product; listItems: listItemsSelect[] }

function ItemProductDialog({ product, listItems }: DialogDrawerProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Item asChild role="listItem">
                    <ProductItemATag product={product} item={listItems.find(i => i.productId === product.id)} />
                </Item>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Acciones</DialogTitle>
                </DialogHeader>
                <ProductDetails product={product} item={listItems.find(i => i.productId === product.id)} onItemClose={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    )    
}

function ItemProductDrawer({ product, listItems }: DialogDrawerProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Item asChild role="listItem">
                    <ProductItemATag product={product} item={listItems.find(i => i.productId === product.id)} />
                </Item>
            </DrawerTrigger>
            <DrawerContent>
                <ProductDetails product={product} item={listItems.find(i => i.productId === product.id)} onItemClose={() => setOpen(false)} />
            </DrawerContent>
        </Drawer>
    )
}


type ProductItemATagProps = React.ComponentPropsWithoutRef<"a"> & {
    product: Product;
    item?: listItemsSelect
}

const ProductItemATag = React.forwardRef<HTMLAnchorElement, ProductItemATagProps>(
    ({ product, item, onClick, ...props }, ref) => {
        const price = product.shopCurrentPrices[0]?.currentPrice

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
                <ItemContent className="flex flex-row items-center gap-2 text-center">
                    {item?.amount && item.amount > 1 ? ( <div> {item.amount}x </div>) : null}
                    <ItemDescription className="text-base font-semibold text-black">
                        {price !== undefined ? `RD$${price}` : "Precio no disponible"}
                    </ItemDescription>
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
    const formattedPrice = price !== undefined ? `RD$${price}` : "Precio no disponible"

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

        startUpdateTransition(() => 
            updateItemAmount(nextQuantity, item.id))
    }

    const handleIncrease = async () => {
        let nextQuantity = 1

        setQuantity((current) => {
            const updated = current + 1
            nextQuantity = updated
            return updated
        })

        startUpdateTransition(() => 
            updateItemAmount(nextQuantity, item.id))
    }

    const handleDeleteItemFromList = async () => {
        await deleteItem(item.id);
        onItemClose();
    }


    return (
        <div className="flex flex-col gap-6">
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

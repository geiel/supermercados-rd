import { ImageResponse } from "next/og";
import { db } from "@/db";
import {
    products,
    groups,
    productsShopsPrices,
    productsGroups,
    shops,
} from "@/db/schema";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";

export const alt = "Lista de compras compartida";
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = "image/png";

type Props = {
    params: Promise<{
        slug: string;
    }>;
};

function parseListIdFromSlug(slug: string): number | null {
    const match = slug.match(/^(\d+)/);
    if (!match) return null;
    const id = Number(match[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
}

function formatPrice(price: number): string {
    return price.toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// Custom logos for shops with unsupported formats (WebP)
function renderShopLogo(shopName: string, shopLogo: string, baseUrl: string) {
    const isWebp = shopLogo.endsWith(".webp");
    
    if (isWebp) {
        // Custom styled text logos for Nacional and Jumbo
        if (shopName.toLowerCase().includes("nacional")) {
            return (
                <span
                    style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#16a34a",
                    }}
                >
                    Nacional
                </span>
            );
        }
        
        if (shopName.toLowerCase().includes("jumbo")) {
            return (
                <span
                    style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#dc2626",
                    }}
                >
                    Jumbo
                </span>
            );
        }
        
        // Fallback for any other WebP logos
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 80,
                    height: 40,
                    backgroundColor: "#e2e8f0",
                    borderRadius: 6,
                }}
            >
                <span
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#475569",
                    }}
                >
                    {shopName}
                </span>
            </div>
        );
    }
    
    // Regular image for supported formats
    return (
        <img
            src={`${baseUrl}/supermarket-logo/${shopLogo}`}
            alt={shopName}
            width={80}
            height={40}
            style={{
                objectFit: "contain",
            }}
        />
    );
}

type ShopSummary = {
    shopId: number;
    shopName: string;
    shopLogo: string;
    total: number;
    productCount: number;
};

export default async function Image({ params }: Props) {
    const { slug } = await params;
    const listId = parseListIdFromSlug(slug);

    // Get the base URL for loading assets
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    // Error card for invalid list
    if (!listId) {
        return renderErrorCard("Lista no encontrada", baseUrl);
    }

    // Fetch the list
    const sharedList = await db.query.list.findFirst({
        where: (l, { eq: eqOp, and }) =>
            and(eqOp(l.id, listId), eqOp(l.isShared, true)),
    });

    if (!sharedList) {
        return renderErrorCard("Lista no encontrada", baseUrl);
    }

    // Fetch list items
    const listItems = await db.query.listItems.findMany({
        where: (items, { eq: eqOp }) => eqOp(items.listId, listId),
    });

    // Fetch list group items
    const listGroupItems = await db.query.listGroupItems.findMany({
        where: (items, { eq: eqOp }) => eqOp(items.listId, listId),
    });

    const productIds = listItems.map((item) => item.productId);
    const groupIds = listGroupItems.map((item) => item.groupId);

    // Get selected shops from the list (if any)
    const selectedShopIds = sharedList.selectedShops?.map(Number).filter(Number.isFinite) ?? [];

    // Fetch all shops for reference
    const allShops = await db.query.shops.findMany();
    const shopsMap = new Map(allShops.map((s) => [s.id, s]));
    const shopIdsToUse = selectedShopIds.length > 0 ? selectedShopIds : allShops.map((s) => s.id);
    const shopIdSet = new Set(shopIdsToUse);

    // Map to track best price per product/group per shop
    const shopTotals = new Map<number, { total: number; count: number }>();

    // Fetch product prices
    if (productIds.length > 0) {
        const productPrices = await db
            .select({
                productId: products.id,
                shopId: productsShopsPrices.shopId,
                price: productsShopsPrices.currentPrice,
            })
            .from(products)
            .innerJoin(productsShopsPrices, eq(productsShopsPrices.productId, products.id))
            .where(
                and(
                    inArray(products.id, productIds),
                    or(isNull(products.deleted), eq(products.deleted, false)),
                    or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false)),
                    sql`${productsShopsPrices.currentPrice} IS NOT NULL`
                )
            );

        // Group by product to find cheapest shop for each
        const productPricesByProduct = new Map<number, { shopId: number; price: number }[]>();
        for (const row of productPrices) {
            if (row.shopId == null || row.price == null) continue;
            if (!shopIdSet.has(row.shopId)) continue;
            
            const existing = productPricesByProduct.get(row.productId) ?? [];
            existing.push({ shopId: row.shopId, price: Number(row.price) });
            productPricesByProduct.set(row.productId, existing);
        }

        // For each product, pick the cheapest shop and add to totals
        for (const [, prices] of productPricesByProduct) {
            if (prices.length === 0) continue;
            const cheapest = prices.reduce((a, b) => (a.price < b.price ? a : b));
            const current = shopTotals.get(cheapest.shopId) ?? { total: 0, count: 0 };
            current.total += cheapest.price;
            current.count += 1;
            shopTotals.set(cheapest.shopId, current);
        }
    }

    // Fetch group prices (min price per shop for each group)
    if (groupIds.length > 0) {
        const groupPrices = await db
            .select({
                groupId: productsGroups.groupId,
                shopId: productsShopsPrices.shopId,
                price: sql<string>`MIN(${productsShopsPrices.currentPrice})`.as("price"),
            })
            .from(productsGroups)
            .innerJoin(products, eq(products.id, productsGroups.productId))
            .innerJoin(productsShopsPrices, eq(productsShopsPrices.productId, productsGroups.productId))
            .where(
                and(
                    inArray(productsGroups.groupId, groupIds),
                    or(isNull(products.deleted), eq(products.deleted, false)),
                    or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false)),
                    sql`${productsShopsPrices.currentPrice} IS NOT NULL`
                )
            )
            .groupBy(productsGroups.groupId, productsShopsPrices.shopId);

        // Group by group to find cheapest shop for each
        const groupPricesByGroup = new Map<number, { shopId: number; price: number }[]>();
        for (const row of groupPrices) {
            if (row.shopId == null || row.price == null) continue;
            if (!shopIdSet.has(row.shopId)) continue;
            
            const existing = groupPricesByGroup.get(row.groupId) ?? [];
            existing.push({ shopId: row.shopId, price: Number(row.price) });
            groupPricesByGroup.set(row.groupId, existing);
        }

        // For each group, pick the cheapest shop and add to totals
        for (const [, prices] of groupPricesByGroup) {
            if (prices.length === 0) continue;
            const cheapest = prices.reduce((a, b) => (a.price < b.price ? a : b));
            const current = shopTotals.get(cheapest.shopId) ?? { total: 0, count: 0 };
            current.total += cheapest.price;
            current.count += 1;
            shopTotals.set(cheapest.shopId, current);
        }
    }

    // Build shop summaries
    const shopSummaries: ShopSummary[] = [];
    for (const [shopId, { total, count }] of shopTotals) {
        const shop = shopsMap.get(shopId);
        if (!shop) continue;
        shopSummaries.push({
            shopId,
            shopName: shop.name,
            shopLogo: shop.logo,
            total,
            productCount: count,
        });
    }

    // Sort by total (highest first) and limit to 4
    shopSummaries.sort((a, b) => b.productCount - a.productCount);
    const displayShops = shopSummaries.slice(0, 4);

    // Calculate grand total and product count
    const grandTotal = shopSummaries.reduce((acc, s) => acc + s.total, 0);
    const totalProducts = productIds.length + groupIds.length;

    return new ImageResponse(
        (
            <div
                style={{
                    display: "flex",
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
                    padding: 0,
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {/* Decorative circles */}
                <div
                    style={{
                        position: "absolute",
                        top: -100,
                        right: -100,
                        width: 400,
                        height: 400,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(139, 92, 246, 0.05) 100%)",
                        display: "flex",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: -150,
                        left: -150,
                        width: 500,
                        height: 500,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(167, 139, 250, 0.25) 0%, rgba(167, 139, 250, 0.02) 100%)",
                        display: "flex",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        top: 200,
                        right: 300,
                        width: 200,
                        height: 200,
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.05)",
                        display: "flex",
                    }}
                />

                {/* Main Content */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                        height: "100%",
                        padding: 56,
                        gap: 40,
                        position: "relative",
                    }}
                >
                    {/* Header Row */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                        }}
                    >
                        {/* Left: Logo and Title */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 20,
                                flex: 1,
                            }}
                        >
                            {/* Logo */}
                            <img
                                src={`${baseUrl}/logo-white.svg`}
                                alt="SupermercadosRD"
                                width={320}
                                height={64}
                                style={{
                                    objectFit: "contain",
                                }}
                            />
                            {/* List Name */}
                            <h1
                                style={{
                                    fontSize: 48,
                                    fontWeight: 800,
                                    color: "#ffffff",
                                    lineHeight: 1.1,
                                    maxWidth: 600,
                                }}
                            >
                                {sharedList.name}
                            </h1>
                        </div>

                        {/* Right: Total */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                gap: 8,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 56,
                                    fontWeight: 800,
                                    color: "#ffffff",
                                    lineHeight: 1,
                                }}
                            >
                                RD${formatPrice(grandTotal)}
                            </span>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                                    padding: "8px 16px",
                                    borderRadius: 20,
                                }}
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <path d="M16 10a4 4 0 0 1-8 0" />
                                </svg>
                                <span
                                    style={{
                                        fontSize: 16,
                                        fontWeight: 600,
                                        color: "#ffffff",
                                    }}
                                >
                                    {totalProducts} {totalProducts === 1 ? "producto" : "productos"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Shop Breakdown */}
                    {displayShops.length > 0 && (
                        <div
                            style={{
                                display: "flex",
                                gap: 20,
                                marginTop: "auto",
                            }}
                        >
                                {displayShops.map((shop, index) => (
                                    <div
                                        key={shop.shopId}
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "rgba(255, 255, 255, 0.08)",
                                            backdropFilter: "blur(10px)",
                                            borderRadius: 20,
                                            padding: "24px 32px",
                                            border: "1px solid rgba(255, 255, 255, 0.1)",
                                            flex: 1,
                                            gap: 16,
                                            position: "relative",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {/* Rank indicator */}
                                        {index === 0 && (
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: 12,
                                                    right: 12,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    width: 28,
                                                    height: 28,
                                                    backgroundColor: "#fbbf24",
                                                    borderRadius: "50%",
                                                }}
                                            >
                                                <span style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>1</span>
                                            </div>
                                        )}
                                        {/* Shop Logo */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: "#ffffff",
                                                borderRadius: 12,
                                                padding: "12px 20px",
                                                minHeight: 56,
                                            }}
                                        >
                                            {renderShopLogo(shop.shopName, shop.shopLogo, baseUrl)}
                                        </div>
                                        {/* Shop Price */}
                                        <span
                                            style={{
                                                fontSize: 28,
                                                fontWeight: 800,
                                                color: "#ffffff",
                                            }}
                                        >
                                            RD${formatPrice(shop.total)}
                                        </span>
                                        {/* Product Count */}
                                        <span
                                            style={{
                                                fontSize: 14,
                                                fontWeight: 500,
                                                color: "rgba(255, 255, 255, 0.6)",
                                            }}
                                        >
                                            {shop.productCount} {shop.productCount === 1 ? "producto" : "productos"}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* Empty state if no shops */}
                    {displayShops.length === 0 && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flex: 1,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 24,
                                    color: "rgba(255, 255, 255, 0.5)",
                                }}
                            >
                                No hay productos en esta lista
                            </span>
                        </div>
                    )}
                </div>
            </div>
        ),
        { ...size }
    );
}

function renderErrorCard(message: string, baseUrl?: string) {
    return new ImageResponse(
        (
            <div
                style={{
                    display: "flex",
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {/* Decorative circles */}
                <div
                    style={{
                        position: "absolute",
                        top: -100,
                        right: -100,
                        width: 400,
                        height: 400,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.05) 100%)",
                        display: "flex",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: -150,
                        left: -150,
                        width: 500,
                        height: 500,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(167, 139, 250, 0.2) 0%, rgba(167, 139, 250, 0.02) 100%)",
                        display: "flex",
                    }}
                />

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                        gap: 24,
                    }}
                >
                    {baseUrl && (
                        <img
                            src={`${baseUrl}/logo-white.svg`}
                            alt="SupermercadosRD"
                            width={280}
                            height={56}
                            style={{
                                objectFit: "contain",
                                marginBottom: 20,
                            }}
                        />
                    )}
                    <div
                        style={{
                            display: "flex",
                            width: 80,
                            height: 80,
                            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                            borderRadius: 20,
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 20px 40px rgba(239, 68, 68, 0.3)",
                        }}
                    >
                        <svg
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    </div>
                    <span
                        style={{
                            fontSize: 40,
                            fontWeight: 700,
                            color: "#ffffff",
                        }}
                    >
                        {message}
                    </span>
                </div>
            </div>
        ),
        { ...size }
    );
}

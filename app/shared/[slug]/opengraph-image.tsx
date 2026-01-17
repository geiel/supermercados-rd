import { ImageResponse } from "next/og";
import { db } from "@/db";
import { products, groups } from "@/db/schema";
import { inArray } from "drizzle-orm";

export const runtime = "nodejs";
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

export default async function Image({ params }: Props) {
    const { slug } = await params;
    const listId = parseListIdFromSlug(slug);

    if (!listId) {
        return new ImageResponse(
            (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                        backgroundColor: "#f5f5f5",
                        fontSize: 48,
                        color: "#666",
                    }}
                >
                    Lista no encontrada
                </div>
            ),
            { ...size }
        );
    }

    // Fetch the list
    const sharedList = await db.query.list.findFirst({
        where: (l, { eq: eqOp, and }) =>
            and(eqOp(l.id, listId), eqOp(l.isShared, true)),
    });

    if (!sharedList) {
        return new ImageResponse(
            (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                        backgroundColor: "#f5f5f5",
                        fontSize: 48,
                        color: "#666",
                    }}
                >
                    Lista no encontrada
                </div>
            ),
            { ...size }
        );
    }

    // Fetch list group items to get group IDs (prioritize groups)
    const listGroupItems = await db.query.listGroupItems.findMany({
        where: (items, { eq: eqOp }) => eqOp(items.listId, listId),
    });

    // Collect product IDs from groups first
    const groupIds = listGroupItems.map((item) => item.groupId);
    let productIdsFromGroups: number[] = [];

    if (groupIds.length > 0) {
        // Get cheaperProductId or bestValueProductId from each group
        const groupsData = await db
            .select({ 
                cheaperProductId: groups.cheaperProductId,
                bestValueProductId: groups.bestValueProductId 
            })
            .from(groups)
            .where(inArray(groups.id, groupIds));

        productIdsFromGroups = groupsData
            .map((g) => g.cheaperProductId ?? g.bestValueProductId)
            .filter((id): id is number => id !== null);
    }

    // If we don't have 6 products from groups, fetch individual items
    let productIdsFromItems: number[] = [];
    if (productIdsFromGroups.length < 6) {
        const listItems = await db.query.listItems.findMany({
            where: (items, { eq: eqOp }) => eqOp(items.listId, listId),
        });
        productIdsFromItems = listItems.map((item) => item.productId);
    }

    // Combine: groups first, then individual items
    const allProductIds = [...new Set([...productIdsFromGroups, ...productIdsFromItems])];

    // Fetch products with images
    let productImages: string[] = [];
    if (allProductIds.length > 0) {
        const productList = await db
            .select({ image: products.image })
            .from(products)
            .where(inArray(products.id, allProductIds))
            .limit(6);

        productImages = productList
            .map((p) => p.image)
            .filter((img): img is string => !!img);
    }

    // Repeat images to fill 6 slots if needed
    if (productImages.length > 0 && productImages.length < 6) {
        const originalImages = [...productImages];
        while (productImages.length < 6) {
            productImages.push(originalImages[productImages.length % originalImages.length]);
        }
    }

    // Create 3x2 grid layout
    const gridImages = productImages.slice(0, 6);

    // Simple 3-column layout with flexbox
    const cellHeight = 350;

    return new ImageResponse(
        (
            <div
                style={{
                    display: "flex",
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#e8ecef",
                    padding: 20,
                    gap: 20,
                }}
            >
                {gridImages.length > 0 ? (
                    <div
                        style={{
                            display: "flex",
                            width: "100%",
                            height: "100%",
                            gap: 20,
                            justifyContent: "center",
                        }}
                    >
                        {/* Column 1 - overflow at edges */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                width: 340,
                                gap: 20,
                                marginTop: -40,
                                marginBottom: -40,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: cellHeight, backgroundColor: "#ffffff", borderRadius: 16, padding: 15, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                                {gridImages[0] && <img src={gridImages[0]} alt="" style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: cellHeight, backgroundColor: "#ffffff", borderRadius: 16, padding: 15, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                                {gridImages[3] && <img src={gridImages[3]} alt="" style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />}
                            </div>
                        </div>

                        {/* Column 2 - centered with overlay card */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                width: 340,
                                gap: 20,
                                marginTop: 40,
                                marginBottom: 40,
                                position: "relative",
                            }}
                        >
                            {/* Overlay card at top */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "absolute",
                                    top: -70,
                                    left: 0,
                                    right: 0,
                                    height: 50,
                                    backgroundColor: "#ffffff",
                                    borderRadius: 12,
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                                    fontSize: 18,
                                    fontWeight: 600,
                                    color: "#333",
                                }}
                            >
                                <span style={{ display: "flex" }}>supermercadosrd.com</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: cellHeight, backgroundColor: "#ffffff", borderRadius: 16, padding: 15, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                                {gridImages[1] && <img src={gridImages[1]} alt="" style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: cellHeight, backgroundColor: "#ffffff", borderRadius: 16, padding: 15, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                                {gridImages[4] && <img src={gridImages[4]} alt="" style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />}
                            </div>
                        </div>

                        {/* Column 3 - overflow at edges */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                width: 340,
                                gap: 20,
                                marginTop: -40,
                                marginBottom: -40,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: cellHeight, backgroundColor: "#ffffff", borderRadius: 16, padding: 15, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                                {gridImages[2] && <img src={gridImages[2]} alt="" style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: cellHeight, backgroundColor: "#ffffff", borderRadius: 16, padding: 15, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                                {gridImages[5] && <img src={gridImages[5]} alt="" style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            height: "100%",
                            backgroundColor: "#ffffff",
                            borderRadius: 16,
                        }}
                    >
                        <span style={{ display: "flex", fontSize: 48, color: "#999" }}>
                            Lista vacía
                        </span>
                    </div>
                )}
            </div>
        ),
        { ...size }
    );
}

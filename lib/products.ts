"use server"

import { db } from "@/db";

export async function getProductsForComparison(shops: number[]) {
    return await db.query.products.findMany({
        where: (products, { inArray }) => inArray(products.id, [11442, 11443, 11670, 23179, 23327]),
        with: {
            shopCurrentPrices: {
                where: (scp, { eq, or, and, inArray, isNull }) => and(or(eq(scp.hidden, false), isNull(scp.hidden)), inArray(scp.shopId, shops)),
                with: {
                    shop: true
                },
                orderBy: (prices, { asc }) => asc(prices.currentPrice),
                limit: 1
            }
        }
    });
}
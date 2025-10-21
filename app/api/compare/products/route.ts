import { db } from "@/db";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const value = searchParams.get("value");

    if (!value) {
        return;
    }

    const shops = value.split(',').map(v => Number(v)).filter(v => !isNaN(v) && v > 0);
    const products = await db.query.products.findMany({
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

    return Response.json(products);
}

import * as Sentry from "@sentry/nextjs";
import { db } from "@/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const allShops = await db.query.shops.findMany();
        return NextResponse.json(allShops);
    } catch (error) {
        Sentry.logger.error("[list/shops] API error:", { error });
        return NextResponse.json(
            { error: "Failed to fetch shops" },
            { status: 500 }
        );
    }
}

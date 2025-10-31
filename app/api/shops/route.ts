import { NextResponse } from "next/server";

import { db } from "@/db";

export async function GET() {
  try {
    const shops = await db.query.shops.findMany();

    return NextResponse.json(shops);
  } catch (error) {
    console.error("[api/shops] Failed to load shops", error);
    return NextResponse.json(
      { message: "Unable to load shops at the moment." },
      { status: 500 }
    );
  }
}

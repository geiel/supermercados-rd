import { NextResponse } from "next/server";

import { searchUnits } from "@/lib/search-units";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const value = searchParams.get("value")?.trim();

  if (!value) {
    return NextResponse.json(
      { message: "Missing search value." },
      { status: 400 }
    );
  }

  const rawSearchValue = decodeURIComponent(value).trim();
  try {
    const units = await searchUnits(rawSearchValue);
    return NextResponse.json(units);
  } catch (error) {
    console.error("[api/search-units] Failed to load units", error);
    return NextResponse.json(
      { message: "Unable to load units at the moment." },
      { status: 500 }
    );
  }
}


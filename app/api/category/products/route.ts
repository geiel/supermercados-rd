import { NextRequest, NextResponse } from "next/server";

import { getCategoryProducts } from "@/lib/home-page-categories";

const DEFAULT_LIMIT = 20;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryId = Number(searchParams.get("category_id"));
  const offset = Number(searchParams.get("offset") ?? 0);
  const limit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);

  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return NextResponse.json(
      { error: "Invalid category_id" },
      { status: 400 }
    );
  }

  try {
    const result = await getCategoryProducts({
      categoryId,
      offset: Number.isFinite(offset) ? offset : 0,
      limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/category/products] Failed to fetch products", error);
    return NextResponse.json(
      { error: "Failed to fetch category products" },
      { status: 500 }
    );
  }
}

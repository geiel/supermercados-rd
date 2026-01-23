import { NextResponse } from "next/server";

import { getSubCategoriesByCategoryId } from "@/lib/category-explorer";

const DEFAULT_SUBCATEGORY_PAGE_SIZE = 5;
const MAX_SUBCATEGORY_PAGE_SIZE = 50;

type RouteParams = {
  params: Promise<{
    categoryId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { categoryId } = await params;
  const categoryIdNumber = Number(categoryId);

  if (!Number.isFinite(categoryIdNumber) || categoryIdNumber <= 0) {
    return NextResponse.json(
      { message: "Invalid category id." },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const limitRaw = limitParam ? Number(limitParam) : DEFAULT_SUBCATEGORY_PAGE_SIZE;
  const offsetRaw = offsetParam ? Number(offsetParam) : 0;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, limitRaw), MAX_SUBCATEGORY_PAGE_SIZE)
    : DEFAULT_SUBCATEGORY_PAGE_SIZE;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

  try {
    const result = await getSubCategoriesByCategoryId(
      categoryIdNumber,
      offset,
      limit
    );

    if (!result) {
      return NextResponse.json(
        { message: "Category not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/explorar/category] Failed to load subcategories", error);
    return NextResponse.json(
      { message: "Unable to load subcategories at the moment." },
      { status: 500 }
    );
  }
}

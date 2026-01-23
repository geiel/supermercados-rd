import { NextResponse } from "next/server";

import { db } from "@/db";
import { getSubCategoryProducts } from "@/lib/subcategory-products";
import {
  GROUP_EXPLORER_DEFAULT_SORT,
  GROUP_EXPLORER_DESKTOP_PAGE_SIZE,
  GROUP_EXPLORER_MAX_LIMIT,
  isGroupExplorerSort,
} from "@/types/group-explorer";

type RouteParams = {
  params: Promise<{
    categoryId: string;
    subCategoryId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { categoryId, subCategoryId } = await params;
  const categoryIdNumber = Number(categoryId);
  const subCategoryIdNumber = Number(subCategoryId);

  if (
    !Number.isFinite(categoryIdNumber) ||
    categoryIdNumber <= 0 ||
    !Number.isFinite(subCategoryIdNumber) ||
    subCategoryIdNumber <= 0
  ) {
    return NextResponse.json(
      { message: "Invalid category id." },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const offsetParam = searchParams.get("offset");
  const limitParam = searchParams.get("limit");
  const sortParam = searchParams.get("sort");
  const groupParam = searchParams.get("group_id");

  const offsetRaw = offsetParam ? Number(offsetParam) : 0;
  const limitRaw = limitParam
    ? Number(limitParam)
    : GROUP_EXPLORER_DESKTOP_PAGE_SIZE;

  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, limitRaw), GROUP_EXPLORER_MAX_LIMIT)
    : GROUP_EXPLORER_DESKTOP_PAGE_SIZE;
  const sort = isGroupExplorerSort(sortParam)
    ? sortParam
    : GROUP_EXPLORER_DEFAULT_SORT;

  const groupId = groupParam ? Number(groupParam) : undefined;
  const groupIdNumber =
    typeof groupId === "number" && Number.isFinite(groupId) && groupId > 0
      ? groupId
      : undefined;

  try {
    const subCategory = await db.query.subCategories.findFirst({
      columns: { id: true, mainCategoryId: true },
      where: (subCategories, { eq }) =>
        eq(subCategories.id, subCategoryIdNumber),
    });

    if (!subCategory || subCategory.mainCategoryId !== categoryIdNumber) {
      return NextResponse.json(
        { message: "Subcategory not found." },
        { status: 404 }
      );
    }

    const result = await getSubCategoryProducts({
      subCategoryId: subCategoryIdNumber,
      groupId: groupIdNumber,
      offset,
      limit,
      sort,
    });

    if (!result) {
      return NextResponse.json(
        { message: "Subcategory not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/explorar/products] Failed to load products", error);
    return NextResponse.json(
      { message: "Unable to load products at the moment." },
      { status: 500 }
    );
  }
}

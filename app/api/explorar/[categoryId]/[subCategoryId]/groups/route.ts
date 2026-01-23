import { NextResponse } from "next/server";

import { db } from "@/db";
import { getSubCategoryGroups } from "@/lib/subcategory-groups";

const DEFAULT_GROUPS_PAGE_SIZE = 5;
const MAX_GROUPS_PAGE_SIZE = 50;

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

  const offsetRaw = offsetParam ? Number(offsetParam) : 0;
  const limitRaw = limitParam ? Number(limitParam) : DEFAULT_GROUPS_PAGE_SIZE;

  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, limitRaw), MAX_GROUPS_PAGE_SIZE)
    : DEFAULT_GROUPS_PAGE_SIZE;

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

    const result = await getSubCategoryGroups({
      subCategoryId: subCategoryIdNumber,
      offset,
      limit,
    });

    if (!result) {
      return NextResponse.json(
        { message: "Subcategory not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/explorar/groups] Failed to load groups", error);
    return NextResponse.json(
      { message: "Unable to load groups at the moment." },
      { status: 500 }
    );
  }
}

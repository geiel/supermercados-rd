import { NextResponse } from "next/server";

import { getGroupProducts } from "@/lib/group-products";
import {
  GROUP_EXPLORER_DEFAULT_SORT,
  GROUP_EXPLORER_DESKTOP_PAGE_SIZE,
  GROUP_EXPLORER_MAX_LIMIT,
  isGroupExplorerSort,
} from "@/types/group-explorer";

type RouteParams = {
  params: Promise<{
    group_human_id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { searchParams } = new URL(request.url);
  const offsetParam = searchParams.get("offset");
  const limitParam = searchParams.get("limit");
  const sortParam = searchParams.get("sort");
  const { group_human_id } = await params;

  const offsetRaw = offsetParam ? Number(offsetParam) : 0;
  const limitRaw = limitParam ? Number(limitParam) : GROUP_EXPLORER_DESKTOP_PAGE_SIZE;

  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, limitRaw), GROUP_EXPLORER_MAX_LIMIT)
    : GROUP_EXPLORER_DESKTOP_PAGE_SIZE;
  const sort = isGroupExplorerSort(sortParam)
    ? sortParam
    : GROUP_EXPLORER_DEFAULT_SORT;

  try {
    const result = await getGroupProducts({
      humanId: group_human_id,
      offset,
      limit,
      sort,
    });

    if (!result) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/groups/products] Failed to load products", error);
    return NextResponse.json(
      { message: "Unable to load products at the moment." },
      { status: 500 }
    );
  }
}

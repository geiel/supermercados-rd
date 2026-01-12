import { NextResponse } from "next/server";

import { getDeals, parseShopId } from "@/lib/deals";
import {
  DEALS_DEFAULT_SORT,
  DEALS_DESKTOP_PAGE_SIZE,
  DEALS_MAX_LIMIT,
  isDealsSort,
} from "@/types/deals";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offsetParam = searchParams.get("offset");
  const limitParam = searchParams.get("limit");
  const shopIdParam = searchParams.get("shop_id");
  const sortParam = searchParams.get("sort");

  const shopIdValue = parseShopId(shopIdParam ?? undefined);

  if (shopIdParam && shopIdValue === null) {
    return NextResponse.json(
      { message: "Invalid shop id." },
      { status: 400 }
    );
  }

  const offsetRaw = offsetParam ? Number(offsetParam) : 0;
  const limitRaw = limitParam ? Number(limitParam) : DEALS_DESKTOP_PAGE_SIZE;

  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, limitRaw), DEALS_MAX_LIMIT)
    : DEALS_DESKTOP_PAGE_SIZE;
  const sort = isDealsSort(sortParam) ? sortParam : DEALS_DEFAULT_SORT;

  try {
    const result = await getDeals({
      shopId: typeof shopIdValue === "number" ? shopIdValue : undefined,
      offset,
      limit,
      sort,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/deals] Failed to load deals", error);
    return NextResponse.json(
      { message: "Unable to load deals at the moment." },
      { status: 500 }
    );
  }
}

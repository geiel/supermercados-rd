import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { getExploreProducts } from "@/lib/explore-products";

export const maxDuration = 50;
import { getUser } from "@/lib/supabase";
import { getShopsIds } from "@/lib/utils";
import {
  normalizeUnitFiltersForSearch,
  parseUnitFilterParam,
} from "@/utils/unit-filter";

type ExploreProductsRequest = {
  value?: string;
  offset?: number;
  prefetch_ids?: number[];
  shop_ids?: string;
  only_shop_products?: boolean | string;
  unit_filter?: string;
};

export async function POST(request: Request) {
  let body: ExploreProductsRequest;

  try {
    body = await request.json();
  } catch (error) {
    Sentry.logger.error("[api/explore-products] Invalid request body", { error });
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 }
    );
  }

  const rawValue = typeof body.value === "string" ? body.value.trim() : "";

  if (!rawValue) {
    return NextResponse.json(
      { message: "Missing search value." },
      { status: 400 }
    );
  }

  const offsetRaw = Number(body.offset);
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

  const prefetchIds = Array.isArray(body.prefetch_ids)
    ? body.prefetch_ids
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    : [];

  const shopIds = getShopsIds(
    typeof body.shop_ids === "string" ? body.shop_ids : undefined
  );
  const onlyShopProducts =
    body.only_shop_products === true || body.only_shop_products === "true";
  const unitFilters = normalizeUnitFiltersForSearch(
    parseUnitFilterParam(
      typeof body.unit_filter === "string" ? body.unit_filter : undefined
    )
  );

  try {
    const user = await getUser();
    const canSeeHiddenProducts =
      user?.email?.toLowerCase() === "geielpeguero@gmail.com";

    const result = await getExploreProducts({
      value: rawValue,
      offset,
      prefetchIds,
      shopIds,
      includeHiddenProducts: canSeeHiddenProducts,
      onlyShopProducts,
      unitFilters,
    });

    return NextResponse.json(result);
  } catch (error) {
    Sentry.logger.error("[api/explore-products] Failed to load products", { error });
    return NextResponse.json(
      { message: "Unable to load products at the moment." },
      { status: 500 }
    );
  }
}

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { getExploreProducts } from "@/lib/explore-products";

import { getUser } from "@/lib/supabase";

type ExploreProductsRequest = {
  value?: string;
  offset?: number;
  prefetch_ids?: number[];
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

  try {
    const user = await getUser();
    const canSeeHiddenProducts =
      user?.email?.toLowerCase() === "geielpeguero@gmail.com";

    const result = await getExploreProducts({
      value: rawValue,
      offset,
      prefetchIds,
      includeHiddenProducts: canSeeHiddenProducts,
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

import { searchProducts } from "@/lib/search-query";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawValue = searchParams.get("value");
  const limitParam = Number(searchParams.get("limit") ?? "10");

  const value = rawValue?.trim();
  if (!value) {
    return Response.json({ products: [] });
  }

  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 10)
    : 10;

  const { products } = await searchProducts(value, limit, 0, true);
  return Response.json({ products });
}

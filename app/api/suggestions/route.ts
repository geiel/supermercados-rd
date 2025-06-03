import { db } from "@/db";
import { products } from "@/db/schema/products";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const value = searchParams.get("value");
  const limit = searchParams.get("limit");

  if (!value) {
    return;
  }

  const suggestions = await db
    .selectDistinctOn([products.name])
    .from(products)
    .where(
      sql`
        to_tsvector('spanish', unaccent(lower(${products.name}))) @@ plainto_tsquery('spanish', unaccent(lower(${value})))
        OR
        to_tsvector('english', unaccent(lower(${products.name}))) @@ plainto_tsquery('english', unaccent(lower(${value})))
        OR
        unaccent(lower(${products.name})) ILIKE '%' || unaccent(lower(${value})) || '%'
      `
    )
    .limit(limit ? Number(limit) : 10);

  return Response.json(suggestions);
}

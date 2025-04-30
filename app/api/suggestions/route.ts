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
    .select()
    .from(products)
    .where(sql`unaccent(${products.name}) ~* unaccent(${`\\m${value}`})`)
    .limit(limit ? Number(limit) : 10);

  return Response.json(suggestions);
}

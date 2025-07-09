import { db } from "@/db";
import { searchPhases } from "@/db/schema/products";
import { desc, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const value = searchParams.get("value");
  const limit = searchParams.get("limit");

  if (!value) {
    return;
  }

  const suggestions = await db
    .select({
      phrase: searchPhases.phrase,
      sml: sql`similarity(${searchPhases.phrase}, ${value})`.as("sml"),
    })
    .from(searchPhases)
    .where(sql`${searchPhases.phrase} % ${value}`)
    .orderBy(
      desc(sql`${searchPhases.phrase} ILIKE ${value} || '%'`),
      desc(sql`similarity(${searchPhases.phrase}, ${value})`)
    )
    .limit(limit ? Number(limit) : 10);

  return Response.json(suggestions);
}

import { db } from "@/db";
import { groups } from "@/db/schema/groups";
import { searchPhases } from "@/db/schema/products";
import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const value = searchParams.get("value");
  const limit = searchParams.get("limit");

  if (!value) {
    return new Response();
  }

  const parentGroup = alias(groups, "parent_group");

  const suggestions = await db
    .select({
      phrase: searchPhases.phrase,
      sml: sql`similarity(${searchPhases.phrase}, ${value})`.as("sml"),
      groupId: searchPhases.groupId,
      groupName: groups.name,
      groupHumanId: groups.humanNameId,
      parentGroupName: parentGroup.name,
    })
    .from(searchPhases)
    .leftJoin(groups, eq(searchPhases.groupId, groups.id))
    .leftJoin(parentGroup, eq(groups.parentGroupId, parentGroup.id))
    .where(sql`${searchPhases.phrase} % ${value}`)
    .orderBy(
      desc(sql`${searchPhases.groupId} IS NOT NULL`),
      desc(sql`${searchPhases.phrase} ILIKE ${value} || '%'`),
      desc(sql`similarity(${searchPhases.phrase}, ${value})`)
    )
    .limit(limit ? Number(limit) : 7);

  return Response.json(suggestions);
}

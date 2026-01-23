import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { groups, productsGroups } from "@/db/schema";
import { validateAdminUser } from "@/lib/authentication";
import { and, eq, inArray } from "drizzle-orm";

function parseBody(body: Record<string, unknown>) {
  const parentGroupId = Number(body.parentGroupId);
  const childGroupId = Number(body.childGroupId);

  if (!Number.isFinite(parentGroupId) || parentGroupId <= 0) {
    return { error: "Grupo padre invalido" };
  }
  if (!Number.isFinite(childGroupId) || childGroupId <= 0) {
    return { error: "Grupo hijo invalido" };
  }
  if (parentGroupId === childGroupId) {
    return { error: "No puedes asignar un grupo como su propio padre" };
  }

  return { parentGroupId, childGroupId };
}

async function ensureGroupExists(groupId: number) {
  return await db.query.groups.findFirst({
    columns: { id: true },
    where: eq(groups.id, groupId),
  });
}

export async function POST(request: NextRequest) {
  await validateAdminUser();

  try {
    const body = await request.json();
    const parsed = parseBody(body);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const [parentExists, childExists] = await Promise.all([
      ensureGroupExists(parsed.parentGroupId),
      ensureGroupExists(parsed.childGroupId),
    ]);

    if (!parentExists || !childExists) {
      return NextResponse.json(
        { error: "Grupo no encontrado" },
        { status: 404 }
      );
    }

    await db
      .update(groups)
      .set({ parentGroupId: parsed.parentGroupId })
      .where(eq(groups.id, parsed.childGroupId));

    const childProductRows = await db
      .select({ productId: productsGroups.productId })
      .from(productsGroups)
      .where(eq(productsGroups.groupId, parsed.childGroupId));

    if (childProductRows.length > 0) {
      await db
        .insert(productsGroups)
        .values(
          childProductRows.map((row) => ({
            productId: row.productId,
            groupId: parsed.parentGroupId,
          }))
        )
        .onConflictDoNothing();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/groups/parent] POST failed", error);
    return NextResponse.json(
      { error: "No se pudo asignar el grupo hijo" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  await validateAdminUser();

  try {
    const body = await request.json();
    const parsed = parseBody(body);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await db
      .update(groups)
      .set({ parentGroupId: null })
      .where(
        and(
          eq(groups.id, parsed.childGroupId),
          eq(groups.parentGroupId, parsed.parentGroupId)
        )
      );

    const childProductRows = await db
      .select({ productId: productsGroups.productId })
      .from(productsGroups)
      .where(eq(productsGroups.groupId, parsed.childGroupId));

    if (childProductRows.length > 0) {
      const productIds = childProductRows.map((row) => row.productId);
      await db
        .delete(productsGroups)
        .where(
          and(
            eq(productsGroups.groupId, parsed.parentGroupId),
            inArray(productsGroups.productId, productIds)
          )
        );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/groups/parent] DELETE failed", error);
    return NextResponse.json(
      { error: "No se pudo remover el grupo hijo" },
      { status: 500 }
    );
  }
}

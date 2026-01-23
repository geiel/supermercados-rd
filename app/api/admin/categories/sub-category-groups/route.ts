import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { groups, subCategories, subCategoriesGroups } from "@/db/schema";
import { validateAdminUser } from "@/lib/authentication";
import { and, eq } from "drizzle-orm";

function parseAssignment(body: Record<string, unknown>) {
  const subCategoryId = Number(body.subCategoryId);
  const groupId = Number(body.groupId);

  if (!Number.isFinite(subCategoryId) || subCategoryId <= 0) {
    return { error: "Subcategoria invalida" };
  }
  if (!Number.isFinite(groupId) || groupId <= 0) {
    return { error: "Grupo invalido" };
  }

  return { subCategoryId, groupId };
}

export async function POST(request: NextRequest) {
  await validateAdminUser();

  try {
    const body = await request.json();
    const parsed = parseAssignment(body);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const [subCategoryExists, groupExists] = await Promise.all([
      db.query.subCategories.findFirst({
        columns: { id: true },
        where: eq(subCategories.id, parsed.subCategoryId),
      }),
      db.query.groups.findFirst({
        columns: { id: true },
        where: eq(groups.id, parsed.groupId),
      }),
    ]);

    if (!subCategoryExists || !groupExists) {
      return NextResponse.json(
        { error: "Relacion no valida" },
        { status: 404 }
      );
    }

    await db
      .insert(subCategoriesGroups)
      .values(parsed)
      .onConflictDoNothing();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/sub-category-groups] POST failed", error);
    return NextResponse.json(
      { error: "No se pudo asignar el grupo" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  await validateAdminUser();

  try {
    const body = await request.json();
    const parsed = parseAssignment(body);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await db
      .delete(subCategoriesGroups)
      .where(
        and(
          eq(subCategoriesGroups.subCategoryId, parsed.subCategoryId),
          eq(subCategoriesGroups.groupId, parsed.groupId)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/sub-category-groups] DELETE failed", error);
    return NextResponse.json(
      { error: "No se pudo remover el grupo" },
      { status: 500 }
    );
  }
}

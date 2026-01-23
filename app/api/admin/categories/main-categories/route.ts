import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { mainCategories } from "@/db/schema";
import { validateAdminUser } from "@/lib/authentication";
import { eq, ilike } from "drizzle-orm";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function ensureUniqueHumanNameId(base: string) {
  if (!base) {
    return `categoria-${Date.now()}`;
  }

  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await db.query.mainCategories.findFirst({
      columns: { id: true },
      where: eq(mainCategories.humanNameId, candidate),
    });

    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function GET(request: NextRequest) {
  await validateAdminUser();

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();

  let queryBuilder = db
    .select({
      id: mainCategories.id,
      name: mainCategories.name,
      description: mainCategories.description,
      humanNameId: mainCategories.humanNameId,
      imageUrl: mainCategories.imageUrl,
    })
    .from(mainCategories);

  if (query) {
    queryBuilder = queryBuilder.where(
      ilike(mainCategories.name, `%${query}%`)
    );
  }

  const results = await queryBuilder.orderBy(mainCategories.name);
  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  await validateAdminUser();

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const humanNameId = await ensureUniqueHumanNameId(
      slugify(String(body.humanNameId ?? name))
    );

    const [created] = await db
      .insert(mainCategories)
      .values({
        name,
        description: body.description ?? null,
        imageUrl: body.imageUrl ?? null,
        humanNameId,
      })
      .returning();

    return NextResponse.json(created);
  } catch (error) {
    console.error("[admin/main-categories] POST failed", error);
    return NextResponse.json(
      { error: "No se pudo crear la categoria" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  await validateAdminUser();

  try {
    const body = await request.json();
    const id = Number(body.id);
    const name = String(body.name ?? "").trim();

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const updateValues: {
      name: string;
      description: string | null;
      imageUrl: string | null;
      humanNameId?: string;
    } = {
      name,
      description: body.description ?? null,
      imageUrl: body.imageUrl ?? null,
    };

    if (body.humanNameId) {
      updateValues.humanNameId = await ensureUniqueHumanNameId(
        slugify(String(body.humanNameId))
      );
    }

    const [updated] = await db
      .update(mainCategories)
      .set(updateValues)
      .where(eq(mainCategories.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[admin/main-categories] PATCH failed", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la categoria" },
      { status: 500 }
    );
  }
}

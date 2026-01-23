import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { mainCategories, subCategories } from "@/db/schema";
import { validateAdminUser } from "@/lib/authentication";
import { and, eq, ilike } from "drizzle-orm";

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
    return `subcategoria-${Date.now()}`;
  }

  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await db.query.subCategories.findFirst({
      columns: { id: true },
      where: eq(subCategories.humanNameId, candidate),
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
  const mainCategoryId = Number(searchParams.get("mainCategoryId") ?? 0);

  let queryBuilder = db
    .select({
      id: subCategories.id,
      name: subCategories.name,
      description: subCategories.description,
      humanNameId: subCategories.humanNameId,
      mainCategoryId: subCategories.mainCategoryId,
      imageUrl: subCategories.imageUrl,
    })
    .from(subCategories);

  const conditions = [];
  if (Number.isFinite(mainCategoryId) && mainCategoryId > 0) {
    conditions.push(eq(subCategories.mainCategoryId, mainCategoryId));
  }
  if (query) {
    conditions.push(ilike(subCategories.name, `%${query}%`));
  }

  if (conditions.length > 0) {
    queryBuilder = queryBuilder.where(and(...conditions));
  }

  const results = await queryBuilder.orderBy(subCategories.name);
  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  await validateAdminUser();

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const mainCategoryId = Number(body.mainCategoryId);

    if (!name) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    if (!Number.isFinite(mainCategoryId) || mainCategoryId <= 0) {
      return NextResponse.json(
        { error: "Categoria invalida" },
        { status: 400 }
      );
    }

    const categoryExists = await db.query.mainCategories.findFirst({
      columns: { id: true },
      where: eq(mainCategories.id, mainCategoryId),
    });

    if (!categoryExists) {
      return NextResponse.json(
        { error: "Categoria no encontrada" },
        { status: 404 }
      );
    }

    const humanNameId = await ensureUniqueHumanNameId(
      slugify(String(body.humanNameId ?? name))
    );

    const [created] = await db
      .insert(subCategories)
      .values({
        name,
        description: body.description ?? null,
        imageUrl: body.imageUrl ?? null,
        mainCategoryId,
        humanNameId,
      })
      .returning();

    return NextResponse.json(created);
  } catch (error) {
    console.error("[admin/sub-categories] POST failed", error);
    return NextResponse.json(
      { error: "No se pudo crear la subcategoria" },
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
      mainCategoryId?: number;
    } = {
      name,
      description: body.description ?? null,
      imageUrl: body.imageUrl ?? null,
    };

    if (Number.isFinite(body.mainCategoryId) && body.mainCategoryId > 0) {
      updateValues.mainCategoryId = Number(body.mainCategoryId);
    }

    if (body.humanNameId) {
      updateValues.humanNameId = await ensureUniqueHumanNameId(
        slugify(String(body.humanNameId))
      );
    }

    const [updated] = await db
      .update(subCategories)
      .set(updateValues)
      .where(eq(subCategories.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[admin/sub-categories] PATCH failed", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la subcategoria" },
      { status: 500 }
    );
  }
}

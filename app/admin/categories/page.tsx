import { Suspense } from "react";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { categories as categoriesTable, categoriesGroups } from "@/db/schema";
import { validateAdminUser } from "@/lib/authentication";
import { toSlug } from "@/lib/utils";
import { TypographyH3 } from "@/components/typography-h3";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { CategoriesManager } from "./client";

async function createCategory(formData: FormData) {
  "use server";

  await validateAdminUser();
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || null;

  if (!name) {
    return { error: "El nombre es requerido" };
  }

  const baseSlug = toSlug(name);
  if (!baseSlug) {
    return { error: "El nombre no es válido" };
  }

  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await db.query.categories.findFirst({
      columns: { id: true },
      where: (categories, { eq }) => eq(categories.humanNameId, slug),
    });

    if (!existing) {
      break;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  await db.insert(categoriesTable).values({
    name,
    humanNameId: slug,
    icon,
  });

  revalidatePath("/admin/categories");
  return { success: true };
}

async function toggleCategoryGroup(formData: FormData) {
  "use server";

  await validateAdminUser();
  const categoryId = Number(formData.get("categoryId"));
  const groupId = Number(formData.get("groupId"));
  const assign = formData.get("assign") === "true";

  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return { error: "ID de categoría inválido" };
  }

  if (!Number.isFinite(groupId) || groupId <= 0) {
    return { error: "ID de grupo inválido" };
  }

  if (assign) {
    await db
      .insert(categoriesGroups)
      .values({ categoryId, groupId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(categoriesGroups)
      .where(
        and(
          eq(categoriesGroups.categoryId, categoryId),
          eq(categoriesGroups.groupId, groupId)
        )
      );
  }

  revalidatePath("/admin/categories");
  return { success: true };
}

export default function Page() {
  return (
    <Suspense fallback={<CategoriesFallback />}>
      <CategoriesPage />
    </Suspense>
  );
}

async function CategoriesPage() {
  await validateAdminUser();

  const [categories, groupsList, categoriesGroupsList] = await Promise.all([
    db.query.categories.findMany({
      columns: {
        id: true,
        name: true,
        humanNameId: true,
        icon: true,
      },
      orderBy: (categories, { asc }) => asc(categories.name),
    }),
    db.query.groups.findMany({
      columns: {
        id: true,
        name: true,
        parentGroupId: true,
      },
      where: (groups, { isNull }) => isNull(groups.parentGroupId),
      orderBy: (groups, { asc }) => asc(groups.name),
    }),
    db.query.categoriesGroups.findMany({
      columns: {
        categoryId: true,
        groupId: true,
      },
    }),
  ]);

  return (
    <div className="container mx-auto pb-4 pt-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TypographyH3>Categorías de grupos</TypographyH3>
          <Button asChild variant="outline">
            <Link href="/admin/groups">Ir a grupos</Link>
          </Button>
        </div>
        <CategoriesManager
          categories={categories}
          groups={groupsList}
          categoryGroups={categoriesGroupsList}
          createCategory={createCategory}
          toggleCategoryGroup={toggleCategoryGroup}
        />
      </div>
    </div>
  );
}

function CategoriesFallback() {
  return (
    <div className="container mx-auto pb-4 pt-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TypographyH3>Categorías de grupos</TypographyH3>
          <Button asChild variant="outline">
            <Link href="/admin/groups">Ir a grupos</Link>
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">Cargando...</div>
      </div>
    </div>
  );
}

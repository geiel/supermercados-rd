import { Suspense } from "react";

import { CategoryManager } from "@/components/admin/category-manager";
import { db } from "@/db";
import {
  groups,
  mainCategories,
  subCategories,
  subCategoriesGroups,
} from "@/db/schema";
import { validateAdminUser } from "@/lib/authentication";

export default function Page() {
  return (
    <Suspense fallback={<AdminCategoriesFallback />}>
      <AdminCategoriesPage />
    </Suspense>
  );
}

async function AdminCategoriesPage() {
  await validateAdminUser();

  const [mainCategoryRows, subCategoryRows, groupRows, assignmentRows] =
    await Promise.all([
      db.query.mainCategories.findMany({
        columns: {
          id: true,
          name: true,
          description: true,
          humanNameId: true,
          imageUrl: true,
        },
        orderBy: (mainCategories, { asc }) => [asc(mainCategories.name)],
      }),
      db.query.subCategories.findMany({
        columns: {
          id: true,
          name: true,
          description: true,
          humanNameId: true,
          mainCategoryId: true,
          imageUrl: true,
        },
        orderBy: (subCategories, { asc }) => [asc(subCategories.name)],
      }),
      db
        .select({
          id: groups.id,
          name: groups.name,
          humanNameId: groups.humanNameId,
          description: groups.description,
          parentGroupId: groups.parentGroupId,
        })
        .from(groups)
        .orderBy(groups.name),
      db.query.subCategoriesGroups.findMany({
        columns: {
          subCategoryId: true,
          groupId: true,
        },
      }),
    ]);

  return (
    <div className="container mx-auto flex flex-col gap-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Administrar categorias</h1>
        <p className="text-sm text-muted-foreground">
          Crea, edita y asigna grupos a subcategorias.
        </p>
      </div>
      <CategoryManager
        initialMainCategories={mainCategoryRows}
        initialSubCategories={subCategoryRows}
        initialGroups={groupRows}
        initialAssignments={assignmentRows}
      />
    </div>
  );
}

function AdminCategoriesFallback() {
  return (
    <div className="container mx-auto py-6">
      <div className="text-sm text-muted-foreground">Cargando...</div>
    </div>
  );
}

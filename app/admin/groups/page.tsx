import { db } from "@/db";
import { groups as groupsTable, productsGroups } from "@/db/schema";
import { validateAdminUser } from "@/lib/authentication";
import { toSlug } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";
import { and, eq, inArray } from "drizzle-orm";
import { GroupsManager } from "./client";
import { TypographyH3 } from "@/components/typography-h3";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function createGroup(formData: FormData) {
  "use server";

  await validateAdminUser();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const parentGroupId = formData.get("parentGroupId");
  const showSearch = formData.get("showSearch") === "true";
  const isComparable = formData.get("isComparable") === "true";

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
    const existing = await db.query.groups.findFirst({
      columns: { id: true },
      where: (groups, { eq }) => eq(groups.humanNameId, slug),
    });

    if (!existing) {
      break;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const resolvedParentGroupId = parentGroupId ? Number(parentGroupId) : null;

  await db.insert(groupsTable).values({
    name,
    description,
    humanNameId: slug,
    showSearch,
    isComparable,
    parentGroupId:
      resolvedParentGroupId && Number.isFinite(resolvedParentGroupId)
        ? resolvedParentGroupId
        : null,
  });

  revalidatePath("/admin/groups");
  return { success: true };
}

async function updateGroup(formData: FormData) {
  "use server";

  await validateAdminUser();
  const groupId = Number(formData.get("groupId"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const parentGroupId = formData.get("parentGroupId");
  const showSearch = formData.get("showSearch") === "true";
  const isComparable = formData.get("isComparable") === "true";

  if (!Number.isFinite(groupId) || groupId <= 0) {
    return { error: "ID de grupo inválido" };
  }

  if (!name) {
    return { error: "El nombre es requerido" };
  }

  const resolvedParentGroupId = parentGroupId ? Number(parentGroupId) : null;

  // Prevent circular references - a group cannot be its own parent
  if (resolvedParentGroupId === groupId) {
    return { error: "Un grupo no puede ser su propio padre" };
  }

  // Check if the parent group exists and is not a descendant of this group
  if (resolvedParentGroupId && Number.isFinite(resolvedParentGroupId)) {
    const descendants = await getDescendantIds(groupId);
    if (descendants.includes(resolvedParentGroupId)) {
      return { error: "No se puede asignar un grupo hijo como padre" };
    }
  }

  // Get the current group to check if parent is changing
  const currentGroup = await db.query.groups.findFirst({
    columns: { parentGroupId: true },
    where: (groups, { eq }) => eq(groups.id, groupId),
  });

  const oldParentId = currentGroup?.parentGroupId ?? null;
  const newParentId =
    resolvedParentGroupId && Number.isFinite(resolvedParentGroupId)
      ? resolvedParentGroupId
      : null;

  const isNewParentAssignment = newParentId !== null && oldParentId !== newParentId;
  const isParentRemoved = oldParentId !== null && newParentId !== oldParentId;

  await db
    .update(groupsTable)
    .set({
      name,
      description,
      showSearch,
      isComparable,
      parentGroupId: newParentId,
    })
    .where(eq(groupsTable.id, groupId));

  // If a parent is being removed or changed, remove products from old parent
  if (isParentRemoved && oldParentId) {
    await removeProductsFromOldParent(groupId, oldParentId);
  }

  // If a new parent is assigned, copy all products from the child group (and its descendants)
  // to the parent group and all ancestor groups
  if (isNewParentAssignment && newParentId) {
    await propagateProductsToAncestors(groupId, newParentId);
  }

  revalidatePath("/admin/groups");
  return { success: true };
}

// Get all ancestor group IDs (parent, grandparent, etc.)
async function getAncestorIds(groupId: number): Promise<number[]> {
  const allGroups = await db.query.groups.findMany({
    columns: { id: true, parentGroupId: true },
  });

  const groupById = new Map(allGroups.map((g) => [g.id, g]));
  const ancestors: number[] = [];
  let currentId: number | null = groupId;

  while (currentId !== null) {
    const group = groupById.get(currentId);
    if (group && group.parentGroupId !== null) {
      ancestors.push(group.parentGroupId);
      currentId = group.parentGroupId;
    } else {
      break;
    }
  }

  return ancestors;
}

// Remove products from the old parent (and its ancestors) when a child is removed
async function removeProductsFromOldParent(
  childGroupId: number,
  oldParentId: number
) {
  // Get all products from the child group and its descendants
  const descendantIds = await getDescendantIds(childGroupId);
  const groupIdsToGetProductsFrom = [childGroupId, ...descendantIds];

  const childProducts =
    groupIdsToGetProductsFrom.length > 0
      ? await db.query.productsGroups.findMany({
          columns: { productId: true },
          where: (pg, { inArray }) =>
            inArray(pg.groupId, groupIdsToGetProductsFrom),
        })
      : [];

  if (childProducts.length === 0) {
    return;
  }

  const productIdsFromChild = [...new Set(childProducts.map((p) => p.productId))];

  // Get all other children of the old parent (excluding the one being removed)
  const otherChildren = await db.query.groups.findMany({
    columns: { id: true },
    where: (groups, { eq, and, ne }) =>
      and(eq(groups.parentGroupId, oldParentId), ne(groups.id, childGroupId)),
  });

  // Get all descendant IDs of the other children
  const otherChildrenIds = otherChildren.map((c) => c.id);
  const otherDescendantIds: number[] = [];
  for (const otherId of otherChildrenIds) {
    const descendants = await getDescendantIds(otherId);
    otherDescendantIds.push(otherId, ...descendants);
  }

  // Get products that exist in other children (these should NOT be removed)
  const productsInOtherChildren =
    otherDescendantIds.length > 0
      ? await db.query.productsGroups.findMany({
          columns: { productId: true },
          where: (pg, { inArray }) => inArray(pg.groupId, otherDescendantIds),
        })
      : [];

  const productIdsInOtherChildren = new Set(
    productsInOtherChildren.map((p) => p.productId)
  );

  // Products to remove are those from the child that don't exist in other children
  const productIdsToRemove = productIdsFromChild.filter(
    (id) => !productIdsInOtherChildren.has(id)
  );

  if (productIdsToRemove.length === 0) {
    return;
  }

  // Get old parent and its ancestors
  const ancestorIds = await getAncestorIds(oldParentId);
  const targetGroupIds = [oldParentId, ...ancestorIds];

  // Remove products from old parent and ancestors
  for (const targetGroupId of targetGroupIds) {
    await db
      .delete(productsGroups)
      .where(
        and(
          eq(productsGroups.groupId, targetGroupId),
          inArray(productsGroups.productId, productIdsToRemove)
        )
      );
  }
}

// Propagate products from a child group (and its descendants) to the new parent and all ancestors
async function propagateProductsToAncestors(
  childGroupId: number,
  newParentId: number
) {
  // Get all descendant IDs including the child itself
  const descendantIds = await getDescendantIds(childGroupId);
  const groupIdsToGetProductsFrom = [childGroupId, ...descendantIds];

  // Get all products from the child group and its descendants
  const childProducts =
    groupIdsToGetProductsFrom.length > 0
      ? await db.query.productsGroups.findMany({
          columns: { productId: true },
          where: (pg, { inArray }) =>
            inArray(pg.groupId, groupIdsToGetProductsFrom),
        })
      : [];

  if (childProducts.length === 0) {
    return;
  }

  // Get unique product IDs
  const productIds = [...new Set(childProducts.map((p) => p.productId))];

  // Get all ancestor IDs including the new parent
  const ancestorIds = await getAncestorIds(newParentId);
  const targetGroupIds = [newParentId, ...ancestorIds];

  // Create entries for all products in all target groups
  const newEntries: { productId: number; groupId: number }[] = [];

  for (const targetGroupId of targetGroupIds) {
    for (const productId of productIds) {
      newEntries.push({ productId, groupId: targetGroupId });
    }
  }

  if (newEntries.length > 0) {
    // Insert with onConflictDoNothing to avoid duplicates
    await db.insert(productsGroups).values(newEntries).onConflictDoNothing();
  }
}

async function deleteGroup(formData: FormData) {
  "use server";

  await validateAdminUser();
  const groupId = Number(formData.get("groupId"));

  if (!Number.isFinite(groupId) || groupId <= 0) {
    return { error: "ID de grupo inválido" };
  }

  // Set children's parentGroupId to null before deleting
  await db
    .update(groupsTable)
    .set({ parentGroupId: null })
    .where(eq(groupsTable.parentGroupId, groupId));

  await db.delete(groupsTable).where(eq(groupsTable.id, groupId));

  revalidatePath("/admin/groups");
  return { success: true };
}

async function getDescendantIds(groupId: number): Promise<number[]> {
  const allGroups = await db.query.groups.findMany({
    columns: { id: true, parentGroupId: true },
  });

  const descendants: number[] = [];
  const toProcess = [groupId];

  while (toProcess.length > 0) {
    const currentId = toProcess.pop()!;
    for (const group of allGroups) {
      if (group.parentGroupId === currentId && !descendants.includes(group.id)) {
        descendants.push(group.id);
        toProcess.push(group.id);
      }
    }
  }

  return descendants;
}

export default function Page() {
  return (
    <Suspense fallback={<GroupsFallback />}>
      <GroupsPage />
    </Suspense>
  );
}

async function GroupsPage() {
  await validateAdminUser();

  const groups = await db.query.groups.findMany({
    orderBy: (groups, { asc }) => asc(groups.name),
  });

  return (
    <div className="container mx-auto pb-4 pt-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TypographyH3>Administrar Grupos</TypographyH3>
          <Button asChild variant="outline">
            <Link href="/admin/categories">Ir a categorías</Link>
          </Button>
        </div>
        <GroupsManager
          groups={groups}
          createGroup={createGroup}
          updateGroup={updateGroup}
          deleteGroup={deleteGroup}
        />
      </div>
    </div>
  );
}

function GroupsFallback() {
  return (
    <div className="container mx-auto pb-4 pt-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TypographyH3>Administrar Grupos</TypographyH3>
          <Button asChild variant="outline">
            <Link href="/admin/categories">Ir a categorías</Link>
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">Cargando...</div>
      </div>
    </div>
  );
}

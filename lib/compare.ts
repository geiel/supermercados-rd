"use server";

import { db } from "@/db";
import { getUser } from "./supabase";
import { groups, list, listGroupItems, listItems } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ErrorMessage } from "./error-messages";

const DEFAULT_LIST_NAME = "Lista de compras";

const resolveListIdForUser = async (userId: string, listId?: number | null) => {
    if (listId) {
        const existingList = await db.query.list.findFirst({
            columns: {
                id: true,
            },
            where: (list, { and, eq }) => and(eq(list.id, listId), eq(list.userId, userId)),
        });

        if (!existingList) {
            return { listId: null, error: "Lista no encontrada." };
        }

        return { listId: existingList.id, error: null };
    }

    const userList = await db.query.list.findFirst({
        columns: {
            id: true,
        },
        where: (list, { eq }) => eq(list.userId, userId),
        orderBy: (list, { asc }) => [asc(list.id)],
    });

    if (userList) {
        return { listId: userList.id, error: null };
    }

    const newList = await db.insert(list).values({ userId, name: DEFAULT_LIST_NAME }).returning();
    return { listId: newList[0]?.id ?? null, error: null };
};

export async function createList(name: string) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth };
    }

    const trimmed = name.trim();
    if (!trimmed) {
        return { data: null, error: "El nombre de la lista es requerido." };
    }

    const [created] = await db.insert(list).values({ userId: user.id, name: trimmed }).returning();
    revalidatePath("/lists");

    return { data: created };
}

export async function addProductToUserList(productId: number, listId?: number | null) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    const resolved = await resolveListIdForUser(user.id, listId);
    if (resolved.error) {
        return { data: null, error: resolved.error };
    }
    if (!resolved.listId) {
        return { data: null, error: "No se pudo crear la lista." };
    }

    await db.insert(listItems).values({ listId: resolved.listId, productId }).onConflictDoNothing();
    revalidatePath("/lists");
    revalidatePath(`/lists/${resolved.listId}`);
    return { data: "ok", listId: resolved.listId };
}

export async function addGroupToUserList(groupHumanId: string, listId?: number | null) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    const group = await db.query.groups.findFirst({
        columns: {
            id: true
        },
        where: (groups, { eq }) => eq(groups.humanNameId, groupHumanId)
    });

    if (!group) {
        return { data: null, error: "Grupo no encontrado." }
    }

    const resolved = await resolveListIdForUser(user.id, listId);
    if (resolved.error) {
        return { data: null, error: resolved.error };
    }
    if (!resolved.listId) {
        return { data: null, error: "No se pudo crear la lista." };
    }

    await db.insert(listGroupItems)
        .values({ listId: resolved.listId, groupId: group.id })
        .onConflictDoNothing();

    revalidatePath("/lists");
    revalidatePath(`/lists/${resolved.listId}`);
    return { data: "ok", listId: resolved.listId };
}

export async function updateListSelectedShops(listId: number, selectedShops: number[]) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    await db.update(list)
            .set({ selectedShops: selectedShops.map(id => (id + "")) })
            .where(eq(list.id, listId));

    revalidatePath("/lists");
    revalidatePath(`/lists/${listId}`);
    return { data: "ok" }
}

export async function updateItemAmount(amount: number, itemId: number, listId?: number | null) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    await db.update(listItems).set({ amount })
            .where(eq(listItems.id, itemId))
    
    revalidatePath("/lists");
    if (listId) {
        revalidatePath(`/lists/${listId}`);
    }
    return { data: "ok" }
}

export async function deleteItem(itemId: number, listId?: number | null) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    await db.delete(listItems).where(eq(listItems.id, itemId));

    revalidatePath("/lists");
    if (listId) {
        revalidatePath(`/lists/${listId}`);
    }
    return { data: "ok" }
}

export async function updateGroupIgnoredProducts(listGroupItemId: number, ignoredProductIds: number[], listId?: number | null) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    await db.update(listGroupItems)
        .set({ ignoredProducts: ignoredProductIds.map((productId) => productId.toString()) })
        .where(eq(listGroupItems.id, listGroupItemId));

    revalidatePath("/lists");
    if (listId) {
        revalidatePath(`/lists/${listId}`);
    }
    return { data: "ok" }
}

export async function deleteGroupItem(listGroupItemId: number, listId?: number | null) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    await db.delete(listGroupItems).where(eq(listGroupItems.id, listGroupItemId));

    revalidatePath("/lists");
    if (listId) {
        revalidatePath(`/lists/${listId}`);
    }
    return { data: "ok" }
}

"use server";

import { db } from "@/db";
import { getUser } from "./supabase";
import { groups, list, listGroupItems, listItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ErrorMessage } from "./error-messages";

export async function addProductToUserList(productId: number) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    const userList = await db.query.list.findFirst({
        columns: {
            id: true
        },
        where: (list, { eq }) => eq(list.userId, user.id)
    });

    let listId = userList?.id;
    if (!listId) {
        const newList = await db.insert(list).values({ userId: user.id }).returning();
        listId = newList[0].id;
    }

    await db.insert(listItems).values({ listId, productId });
    return { data: "ok" }
}

export async function addGroupToUserList(groupHumanId: string) {
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

    const userList = await db.query.list.findFirst({
        columns: {
            id: true
        },
        where: (list, { eq }) => eq(list.userId, user.id)
    });

    let listId = userList?.id;
    if (!listId) {
        const newList = await db.insert(list).values({ userId: user.id }).returning();
        listId = newList[0].id;
    }

    await db.insert(listGroupItems)
        .values({ listId, groupId: group.id })
        .onConflictDoNothing();

    return { data: "ok" }
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
    return { data: "ok" }
}

export async function updateItemAmount(amount: number, itemId: number) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    await db.update(listItems).set({ amount })
            .where(eq(listItems.id, itemId))
    
    revalidatePath("/lists");
    return { data: "ok" }
}

export async function deleteItem(itemId: number) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    await db.delete(listItems).where(eq(listItems.id, itemId));

    revalidatePath("/lists");
    return { data: "ok" }
}

export async function updateGroupIgnoredProducts(listGroupItemId: number, ignoredProductIds: number[]) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    await db.update(listGroupItems)
        .set({ ignoredProducts: ignoredProductIds.map((productId) => productId.toString()) })
        .where(eq(listGroupItems.id, listGroupItemId));

    revalidatePath("/lists");
    return { data: "ok" }
}

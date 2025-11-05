"use server";

import { db } from "@/db";
import { getUser } from "./supabase";
import { list, listItems } from "@/db/schema";
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

export async function updateListSelectedShops(listId: number, selectedShops: number[]) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    await db.update(list)
            .set({ selectedShops: selectedShops.map(id => (id + "")) })
            .where(eq(list.id, listId));

    revalidatePath("/compare");
    return { data: "ok" }
}

export async function updateItemAmount(amount: number, itemId: number) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    await db.update(listItems).set({ amount })
            .where(eq(listItems.id, itemId))
    
    revalidatePath("/compare");
    return { data: "ok" }
}

export async function deleteItem(itemId: number) {
    const user = await getUser();
    if (!user) {
        return { data: null, error: ErrorMessage.UserAuth }
    }

    await db.delete(listItems).where(eq(listItems.id, itemId));

    revalidatePath("/compare");
    return { data: "ok" }
}
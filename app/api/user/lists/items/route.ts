"use server";

import { db } from "@/db";
import { createClient } from "@/utils/supabase/server";
export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return Response.json([]);
    }

    const userLists = await db.query.list.findMany({
        columns: {
            id: true,
        },
        where: (list, { eq }) => eq(list.userId, user.id),
    });

    if (userLists.length === 0) {
        return Response.json([]);
    }

    const listIds = userLists.map((list) => list.id);
    const items = await db.query.listItems.findMany({
        where: (listItems, { inArray }) => inArray(listItems.listId, listIds),
    });

    return Response.json(items);
}

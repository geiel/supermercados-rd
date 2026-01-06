"use server";

import { db } from "@/db";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return new Response(JSON.stringify([]));
    }

    const userList = await db.query.list.findFirst({
        columns: {
            id: true
        },
        where: (list, { eq }) => eq(list.userId, user.id)
    });

    if (!userList) {
        return Response.json([]);
    }

    const groupItems = await db.query.listGroupItems.findMany({
        where: (listGroupItems, { eq }) => eq(listGroupItems.listId, userList.id)
    });

    return Response.json(groupItems);
}

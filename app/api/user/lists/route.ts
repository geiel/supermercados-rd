"use server";

import { db } from "@/db";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return Response.json([]);
    }

    const lists = await db.query.list.findMany({
        where: (list, { eq }) => eq(list.userId, user.id),
        orderBy: (list, { asc }) => [asc(list.id)],
    });

    return Response.json(lists);
}

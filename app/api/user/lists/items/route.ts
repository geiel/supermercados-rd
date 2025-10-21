"use server";

import { db } from "@/db";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return new Response(JSON.stringify([]));
    }

    const listItems = await db.query.list.findFirst({
        where: (list, { eq }) => eq(list.userId, user.id),
        with: {
            items: true
        }
    })

    return Response.json(listItems?.items ?? []);
}
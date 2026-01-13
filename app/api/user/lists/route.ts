import { db } from "@/db";
import { list } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { eq } from "drizzle-orm";

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

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = body.name as string;

    if (!name || typeof name !== "string") {
        return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const [newList] = await db
        .insert(list)
        .values({
            userId: user.id,
            name: name.trim(),
        })
        .returning();

    return Response.json(newList);
}

// Update list selected shops
export async function PATCH(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const listId = body.listId as number;
    const selectedShops = body.selectedShops as number[];

    if (!listId) {
        return Response.json({ error: "listId is required" }, { status: 400 });
    }

    if (!Array.isArray(selectedShops)) {
        return Response.json({ error: "selectedShops must be an array" }, { status: 400 });
    }

    // Verify the list belongs to the user
    const userList = await db.query.list.findFirst({
        where: (l, { eq: eqOp, and }) =>
            and(eqOp(l.id, listId), eqOp(l.userId, user.id)),
    });

    if (!userList) {
        return Response.json({ error: "List not found" }, { status: 404 });
    }

    await db
        .update(list)
        .set({ selectedShops: selectedShops.map((id) => String(id)) })
        .where(eq(list.id, listId));

    return Response.json({ success: true });
}

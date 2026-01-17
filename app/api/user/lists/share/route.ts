import { db } from "@/db";
import { list } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { eq } from "drizzle-orm";

// Enable sharing for a list
export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const listId = body.listId as number;

    if (!listId) {
        return Response.json({ error: "listId is required" }, { status: 400 });
    }

    // Verify the list belongs to the user
    const userList = await db.query.list.findFirst({
        where: (l, { eq: eqOp, and }) =>
            and(eqOp(l.id, listId), eqOp(l.userId, user.id)),
    });

    if (!userList) {
        return Response.json({ error: "List not found" }, { status: 404 });
    }

    const [updatedList] = await db
        .update(list)
        .set({ isShared: true })
        .where(eq(list.id, listId))
        .returning();

    return Response.json(updatedList);
}

// Update share settings (hideProfile)
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
    const hideProfile = body.hideProfile as boolean | undefined;

    if (!listId) {
        return Response.json({ error: "listId is required" }, { status: 400 });
    }

    // Verify the list belongs to the user
    const userList = await db.query.list.findFirst({
        where: (l, { eq: eqOp, and }) =>
            and(eqOp(l.id, listId), eqOp(l.userId, user.id)),
    });

    if (!userList) {
        return Response.json({ error: "List not found" }, { status: 404 });
    }

    const updateData: { hideProfile?: boolean } = {};

    if (hideProfile !== undefined) {
        if (typeof hideProfile !== "boolean") {
            return Response.json({ error: "hideProfile must be a boolean" }, { status: 400 });
        }
        updateData.hideProfile = hideProfile;
    }

    if (Object.keys(updateData).length === 0) {
        return Response.json({ error: "No update data provided" }, { status: 400 });
    }

    const [updatedList] = await db
        .update(list)
        .set(updateData)
        .where(eq(list.id, listId))
        .returning();

    return Response.json(updatedList);
}

// Disable sharing for a list
export async function DELETE(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const listId = body.listId as number;

    if (!listId) {
        return Response.json({ error: "listId is required" }, { status: 400 });
    }

    // Verify the list belongs to the user
    const userList = await db.query.list.findFirst({
        where: (l, { eq: eqOp, and }) =>
            and(eqOp(l.id, listId), eqOp(l.userId, user.id)),
    });

    if (!userList) {
        return Response.json({ error: "List not found" }, { status: 404 });
    }

    const [updatedList] = await db
        .update(list)
        .set({ isShared: false })
        .where(eq(list.id, listId))
        .returning();

    return Response.json(updatedList);
}

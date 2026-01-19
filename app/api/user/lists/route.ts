import { db } from "@/db";
import { list, listItems, listGroupItems } from "@/db/schema";
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

// Update list (name or selected shops)
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
    const selectedShops = body.selectedShops as number[] | undefined;
    const name = body.name as string | undefined;

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

    // Build update object
    const updateData: { selectedShops?: string[]; name?: string; updatedAt?: Date } = {};

    if (selectedShops !== undefined) {
        if (!Array.isArray(selectedShops)) {
            return Response.json({ error: "selectedShops must be an array" }, { status: 400 });
        }
        updateData.selectedShops = selectedShops.map((id) => String(id));
        // Update timestamp when shop selections change
        updateData.updatedAt = new Date();
    }

    if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
            return Response.json({ error: "Name cannot be empty" }, { status: 400 });
        }
        updateData.name = name.trim();
        // Update timestamp when name changes
        updateData.updatedAt = new Date();
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

// Delete a list
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

    // Delete related items first (foreign key constraints)
    await db.delete(listItems).where(eq(listItems.listId, listId));
    await db.delete(listGroupItems).where(eq(listGroupItems.listId, listId));
    
    // Now delete the list
    await db.delete(list).where(eq(list.id, listId));

    return Response.json({ success: true });
}
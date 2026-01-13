import { db } from "@/db";
import { listGroupItems } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { and, eq } from "drizzle-orm";

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

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

    const groupItems = await db.query.listGroupItems.findMany({
        where: (listGroupItems, { inArray }) =>
            inArray(listGroupItems.listId, userLists.map((list) => list.id)),
    });

    return Response.json(groupItems);
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
    const listId = body.listId as number;
    const groupId = body.groupId as number;

    if (!listId || !groupId) {
        return Response.json(
            { error: "listId and groupId are required" },
            { status: 400 }
        );
    }

    // Verify the list belongs to the user
    const userList = await db.query.list.findFirst({
        where: (list, { eq, and }) =>
            and(eq(list.id, listId), eq(list.userId, user.id)),
    });

    if (!userList) {
        return Response.json({ error: "List not found" }, { status: 404 });
    }

    const [newItem] = await db
        .insert(listGroupItems)
        .values({
            listId,
            groupId,
        })
        .onConflictDoNothing()
        .returning();

    return Response.json(newItem ?? { listId, groupId });
}

// Update ignored products for a group item
export async function PATCH(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const itemId = body.itemId as number;
    const ignoredProducts = body.ignoredProducts as number[];

    if (!itemId) {
        return Response.json({ error: "itemId is required" }, { status: 400 });
    }

    if (!Array.isArray(ignoredProducts)) {
        return Response.json({ error: "ignoredProducts must be an array" }, { status: 400 });
    }

    // Verify the item belongs to the user
    const item = await db.query.listGroupItems.findFirst({
        where: (lgi, { eq }) => eq(lgi.id, itemId),
    });

    if (!item) {
        return Response.json({ error: "Item not found" }, { status: 404 });
    }

    const userList = await db.query.list.findFirst({
        where: (list, { eq, and }) =>
            and(eq(list.id, item.listId), eq(list.userId, user.id)),
    });

    if (!userList) {
        return Response.json({ error: "List not found" }, { status: 404 });
    }

    await db
        .update(listGroupItems)
        .set({ ignoredProducts: ignoredProducts.map((id) => String(id)) })
        .where(eq(listGroupItems.id, itemId));

    return Response.json({ success: true });
}

export async function DELETE(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const itemId = body.itemId as number | undefined;
    const listId = body.listId as number | undefined;
    const groupId = body.groupId as number | undefined;

    if (itemId) {
        // Delete by item ID
        const item = await db.query.listGroupItems.findFirst({
            where: (lgi, { eq }) => eq(lgi.id, itemId),
        });

        if (!item) {
            return Response.json({ error: "Item not found" }, { status: 404 });
        }

        const userList = await db.query.list.findFirst({
            where: (list, { eq, and }) =>
                and(eq(list.id, item.listId), eq(list.userId, user.id)),
        });

        if (!userList) {
            return Response.json({ error: "List not found" }, { status: 404 });
        }

        await db.delete(listGroupItems).where(eq(listGroupItems.id, itemId));
    } else if (listId && groupId) {
        // Delete by listId + groupId
        const userList = await db.query.list.findFirst({
            where: (list, { eq, and }) =>
                and(eq(list.id, listId), eq(list.userId, user.id)),
        });

        if (!userList) {
            return Response.json({ error: "List not found" }, { status: 404 });
        }

        await db
            .delete(listGroupItems)
            .where(and(eq(listGroupItems.listId, listId), eq(listGroupItems.groupId, groupId)));
    } else {
        return Response.json(
            { error: "itemId or (listId and groupId) are required" },
            { status: 400 }
        );
    }

    return Response.json({ success: true });
}

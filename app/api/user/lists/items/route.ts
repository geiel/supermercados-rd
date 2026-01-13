import { db } from "@/db";
import { listItems } from "@/db/schema";
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

    const listIds = userLists.map((list) => list.id);
    const items = await db.query.listItems.findMany({
        where: (listItems, { inArray }) => inArray(listItems.listId, listIds),
    });

    return Response.json(items);
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
    const productId = body.productId as number;

    if (!listId || !productId) {
        return Response.json(
            { error: "listId and productId are required" },
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
        .insert(listItems)
        .values({
            listId,
            productId,
        })
        .onConflictDoNothing()
        .returning();

    return Response.json(newItem ?? { listId, productId });
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
    const productId = body.productId as number | undefined;

    // Verify the user owns the list
    if (itemId) {
        // Delete by item ID
        const item = await db.query.listItems.findFirst({
            where: (li, { eq }) => eq(li.id, itemId),
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

        await db.delete(listItems).where(eq(listItems.id, itemId));
    } else if (listId && productId) {
        // Delete by listId + productId
        const userList = await db.query.list.findFirst({
            where: (list, { eq, and }) =>
                and(eq(list.id, listId), eq(list.userId, user.id)),
        });

        if (!userList) {
            return Response.json({ error: "List not found" }, { status: 404 });
        }

        await db
            .delete(listItems)
            .where(and(eq(listItems.listId, listId), eq(listItems.productId, productId)));
    } else {
        return Response.json(
            { error: "itemId or (listId and productId) are required" },
            { status: 400 }
        );
    }

    return Response.json({ success: true });
}

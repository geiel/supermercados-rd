import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = {
    params: Promise<{
        listId: string;
    }>;
};

export async function GET(_request: Request, { params }: Params) {
    const { listId: listIdParam } = await params;
    const listId = Number(listIdParam);

    if (!Number.isFinite(listId) || listId <= 0) {
        return Response.json({ error: "Invalid list ID" }, { status: 400 });
    }

    // Fetch the list and verify it's shared
    const sharedList = await db.query.list.findFirst({
        where: (l, { eq: eqOp, and }) =>
            and(eqOp(l.id, listId), eqOp(l.isShared, true)),
    });

    if (!sharedList) {
        return Response.json({ error: "List not found" }, { status: 404 });
    }

    // Fetch list items (products)
    const items = await db.query.listItems.findMany({
        where: (listItems, { eq: eqOp }) => eqOp(listItems.listId, listId),
    });

    // Fetch list group items
    const groupItems = await db.query.listGroupItems.findMany({
        where: (listGroupItems, { eq: eqOp }) => eqOp(listGroupItems.listId, listId),
    });

    // Build response
    const response: {
        id: number;
        name: string;
        selectedShops: string[];
        updatedAt: Date;
        items: typeof items;
        groupItems: typeof groupItems;
        owner?: {
            id: string;
            name?: string;
        };
    } = {
        id: sharedList.id,
        name: sharedList.name,
        selectedShops: sharedList.selectedShops,
        updatedAt: sharedList.updatedAt,
        items,
        groupItems,
    };

    // Include owner info only if hideProfile is false
    if (!sharedList.hideProfile) {
        // Fetch user profile from profiles table
        const [profile] = await db
            .select({ name: profiles.name })
            .from(profiles)
            .where(eq(profiles.id, sharedList.userId))
            .limit(1);

        response.owner = {
            id: sharedList.userId,
            name: profile?.name ?? undefined,
        };
    }

    return Response.json(response);
}

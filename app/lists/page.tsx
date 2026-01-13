import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateListCard } from "@/components/create-list-card";
import { LocalListsPage } from "@/components/local-lists-page";
import { db } from "@/db";
import { listGroupItems, listItems } from "@/db/schema";
import { getUser } from "@/lib/supabase";
import { inArray, sql } from "drizzle-orm";

export default async function Page() {
    const user = await getUser();

    if (!user) {
        return <LocalListsPage />;
    }

    const lists = await db.query.list.findMany({
        where: (list, { eq }) => eq(list.userId, user.id),
        orderBy: (list, { asc }) => [asc(list.id)],
    });

    // Even if there are no lists, we still need to show the create card
    // Get counts only if there are lists
    const listIds = lists.length > 0 ? lists.map((entry) => entry.id) : [];
    // Only fetch counts if there are lists
    let countByListId = new Map<number, number>();
    let groupCountByListId = new Map<number, number>();

    if (listIds.length > 0) {
        const listItemCounts = await db
            .select({
                listId: listItems.listId,
                count: sql<number>`count(*)`,
            })
            .from(listItems)
            .where(inArray(listItems.listId, listIds))
            .groupBy(listItems.listId);
        const listGroupCounts = await db
            .select({
                listId: listGroupItems.listId,
                count: sql<number>`count(*)`,
            })
            .from(listGroupItems)
            .where(inArray(listGroupItems.listId, listIds))
            .groupBy(listGroupItems.listId);

        countByListId = new Map(
            listItemCounts.map((entry) => [entry.listId, Number(entry.count ?? 0)])
        );
        groupCountByListId = new Map(
            listGroupCounts.map((entry) => [entry.listId, Number(entry.count ?? 0)])
        );
    }

    return (
        <div className="container mx-auto max-w-4xl px-2 pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-2xl font-bold">Listas</div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {lists.map((entry) => {
                    const itemCount = countByListId.get(entry.id) ?? 0;
                    const groupCount = groupCountByListId.get(entry.id) ?? 0;
                    const totalCount = itemCount + groupCount;
                    const summary = totalCount === 0
                        ? "Lista vacía"
                        : `${totalCount} artículos`;

                    return (
                        <Link key={entry.id} href={`/lists/${entry.id}`} className="block">
                            <Card className="transition hover:shadow-md">
                                <CardHeader>
                                    <CardTitle className="text-lg">{entry.name}</CardTitle>
                                    <CardDescription>{summary}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground">
                                        {itemCount} productos · {groupCount} categorías
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
                
                {/* Create List Card - at the end */}
                <CreateListCard />
            </div>
        </div>
    );
}

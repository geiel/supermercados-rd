"use client";

import { use } from "react";
import { ListPage } from "@/components/list-page";

type Props = {
    params: Promise<{
        list_id: string;
    }>;
};

export default function ListDetailPage({ params }: Props) {
    const { list_id } = use(params);
    const listId = Number(list_id);

    if (!Number.isFinite(listId) || listId <= 0) {
        return (
            <div className="container mx-auto pb-4 px-2 max-w-4xl">
                <div className="text-center py-8 text-muted-foreground">
                    Lista no encontrada.
                </div>
            </div>
        );
    }

    return <ListPage listId={listId} />;
}

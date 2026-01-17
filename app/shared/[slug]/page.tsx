import { SharedListPage } from "@/components/shared-list-page";

type Props = {
    params: Promise<{
        slug: string;
    }>;
};

function parseListIdFromSlug(slug: string): number | null {
    // Slug format: "341-lista-de-compras" -> extract 341
    const match = slug.match(/^(\d+)/);
    if (!match) return null;
    const id = Number(match[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
}

export default async function SharedListDetailPage({ params }: Props) {
    const { slug } = await params;
    const listId = parseListIdFromSlug(slug);

    if (!listId) {
        return (
            <div className="container mx-auto pb-4 px-2 max-w-4xl">
                <div className="text-center py-8 text-muted-foreground">
                    Lista no encontrada.
                </div>
            </div>
        );
    }

    return <SharedListPage listId={listId} />;
}

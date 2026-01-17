import type { Metadata } from "next";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const listId = parseListIdFromSlug(slug);

    if (!listId) {
        return {
            title: "Lista no encontrada",
        };
    }

    // Fetch the list
    const sharedList = await db.query.list.findFirst({
        where: (l, { eq: eqOp, and }) =>
            and(eqOp(l.id, listId), eqOp(l.isShared, true)),
    });

    if (!sharedList) {
        return {
            title: "Lista no encontrada",
        };
    }

    // Build title based on hideProfile setting
    let title = sharedList.name;

    if (!sharedList.hideProfile) {
        // Fetch owner name
        const [profile] = await db
            .select({ name: profiles.name })
            .from(profiles)
            .where(eq(profiles.id, sharedList.userId))
            .limit(1);

        if (profile?.name) {
            title = `${sharedList.name} por ${profile.name}`;
        }
    }

    const description = `SupermercadosRD República Dominicana`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
        },
    };
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

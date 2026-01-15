import { GroupExplorer } from "@/components/group-explorer";
import { db } from "@/db";
import { Metadata } from "next";
import { Suspense } from "react";

type Props = {
  params: Promise<{ group_human_id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group_human_id } = await params;

  const group = await db.query.groups.findFirst({
    columns: { name: true, humanNameId: true },
    where: (groups, { eq }) => eq(groups.humanNameId, group_human_id),
  });

  if (!group) {
    return {
      title: "Categoría no encontrada",
    };
  }

  const title = group.name;
  const description = `Compara precios de ${group.name} en supermercados de República Dominicana. Encuentra las mejores ofertas y el precio más bajo.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | SupermercadosRD`,
      description,
      type: "website",
      url: `/groups/${group.humanNameId}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | SupermercadosRD`,
      description,
    },
    alternates: {
      canonical: `/groups/${group.humanNameId}`,
    },
  };
}

export default function Page({ params }: Props) {
    return (
        <Suspense fallback={<GroupExplorerFallback />}>
            <GroupExplorerPage params={params} />
        </Suspense>
    );
}

async function GroupExplorerPage({ params }: Props) {
    const { group_human_id } = await params;

    return <GroupExplorer humanId={group_human_id} />
}

function GroupExplorerFallback() {
    return (
        <div className="container mx-auto px-2 pb-2 space-y-4">
            <div className="text-sm text-muted-foreground">Cargando...</div>
        </div>
    );
}

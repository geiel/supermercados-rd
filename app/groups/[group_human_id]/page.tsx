import { GroupExplorer } from "@/components/group-explorer";
import { GroupExplorerSkeleton } from "@/components/group-explorer-skeleton";
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
    title: `${title} más barata en RD - Comparador de precios`,
    description,
    openGraph: {
      title: `${title} - Mejores ofertas en SupermercadosRD`,
      description,
      type: "website",
      url: `/groups/${group.humanNameId}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - Mejores ofertas en SupermercadosRD`,
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
    return <GroupExplorerSkeleton />;
}

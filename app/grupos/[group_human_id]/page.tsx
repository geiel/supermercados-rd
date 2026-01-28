import { GroupExplorer } from "@/components/group-explorer";
import { GroupExplorerSkeleton } from "@/components/group-explorer-skeleton";
import { db } from "@/db";
import { Metadata } from "next";
import { Suspense } from "react";

type Props = {
  params: Promise<{ group_human_id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
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
    title: `Comparar precios de ${title} en supermercados RD`,
    description,
    openGraph: {
      title: `Comparar precios de ${title} en supermercados RD`,
      description,
      type: "website",
      url: `/grupos/${group.humanNameId}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `Comparar precios de ${title} en supermercados RD`,
      description,
    },
    alternates: {
      canonical: `/grupos/${group.humanNameId}`,
    },
  };
}

export default function Page({ params, searchParams }: Props) {
    return (
        <Suspense fallback={<GroupExplorerFallback />}>
            <GroupExplorerPage params={params} searchParams={searchParams} />
        </Suspense>
    );
}

async function GroupExplorerPage({ params, searchParams }: Props) {
    const { group_human_id } = await params;
    const resolvedSearchParams = await searchParams;

    return <GroupExplorer humanId={group_human_id} searchParams={resolvedSearchParams} />
}

function GroupExplorerFallback() {
    return <GroupExplorerSkeleton />;
}

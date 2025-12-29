import { GroupExplorer } from "@/components/group-explorer";
import { Suspense } from "react";

type Props = {
  params: Promise<{ group_human_id: string }>;
};

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

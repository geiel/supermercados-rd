import { GroupExplorer } from "@/components/group-explorer";

type Props = {
  params: Promise<{ group_human_id: string }>;
};

export default async function Page({ params }: Props) {
    const { group_human_id } = await params;

    return <GroupExplorer humanId={group_human_id} />
}

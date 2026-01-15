import { AddGroupToListButton } from "@/components/add-group-to-list-button";
import { GroupExplorerList } from "@/components/group-explorer-list";
import { TypographyH3 } from "@/components/typography-h3";
import { getGroupProducts } from "@/lib/group-products";
import { GROUP_EXPLORER_DESKTOP_PAGE_SIZE } from "@/types/group-explorer";

export async function GroupExplorer({ humanId }: { humanId: string }) {
    const result = await getGroupProducts({
        humanId,
        offset: 0,
        limit: GROUP_EXPLORER_DESKTOP_PAGE_SIZE,
    });

    if (!result || result.products.length === 0) {
        return null;
    }

    return (
        <div className="container mx-auto px-2 pb-2 space-y-4">
            <div className="flex gap-2 items-center justify-between">
                <TypographyH3>{result.group.name}</TypographyH3>
                <AddGroupToListButton
                    groupId={result.group.id}
                    groupName={result.group.name}
                />
            </div>
            <GroupExplorerList
                humanId={humanId}
                initialProducts={result.products}
                total={result.total}
                initialOffset={result.nextOffset}
            />
        </div>
    )
}

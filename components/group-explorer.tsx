import { AddGroupToListButton } from "@/components/add-group-to-list-button";
import { CategoryBadge } from "@/components/category-badge";
import { GroupExplorerList } from "@/components/group-explorer-list";
import { TypographyH3 } from "@/components/typography-h3";
import ScrollPeek from "@/components/ui/scroll-peek";
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
                <div className="flex items-baseline gap-2">
                    <TypographyH3>{result.group.name}</TypographyH3>
                    <span className="text-sm text-muted-foreground">
                        ({result.total})
                    </span>
                </div>
                <AddGroupToListButton
                    groupId={result.group.id}
                    groupName={result.group.name}
                />
            </div>
            {result.childGroups.length > 0 && (
                <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Categorías</span>
                    <ScrollPeek showNavButtons={true}>
                        <div className="flex gap-3">
                            {result.childGroups.map((child) => (
                                <CategoryBadge
                                    key={child.humanNameId}
                                    groupId={child.id}
                                    groupName={child.name}
                                    groupHumanNameId={child.humanNameId}
                                />
                            ))}
                        </div>
                    </ScrollPeek>
                </div>
            )}
            <GroupExplorerList
                humanId={humanId}
                initialProducts={result.products}
                total={result.total}
                initialOffset={result.nextOffset}
            />
        </div>
    )
}

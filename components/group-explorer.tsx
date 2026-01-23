import Link from "next/link";

import { AddGroupToListButton } from "@/components/add-group-to-list-button";
import { GroupsFilter } from "@/components/groups-filter";
import { GroupExplorerList } from "@/components/group-explorer-list";
import { TypographyH3 } from "@/components/typography-h3";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getChildGroupsByGroupId, getGroupBreadcrumb } from "@/lib/group-children";
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

    const [childGroups, breadcrumb] = await Promise.all([
        getChildGroupsByGroupId(result.group.id),
        getGroupBreadcrumb(result.group.id),
    ]);

    return (
        <div className="container mx-auto px-2 pb-2 space-y-4">
            {breadcrumb ? (
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem className="hidden md:inline-flex">
                            <BreadcrumbLink asChild>
                                <Link href="/explorar">Explorar</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem className="hidden md:inline-flex">
                            <BreadcrumbLink asChild>
                                <Link href={`/explorar/${breadcrumb.category.humanId}`}>
                                    {breadcrumb.category.name}
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem className={breadcrumb.parentGroup ? "hidden md:inline-flex" : undefined}>
                            <BreadcrumbLink asChild>
                                <Link
                                    href={`/explorar/${breadcrumb.category.humanId}/${breadcrumb.subCategory.humanId}`}
                                >
                                    {breadcrumb.subCategory.name}
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        {breadcrumb.parentGroup ? (
                            <>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href={`/groups/${breadcrumb.parentGroup.humanId}`}>
                                            {breadcrumb.parentGroup.name}
                                        </Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                            </>
                        ) : null}
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{result.group.name}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            ) : null}
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
            {childGroups.length > 0 ? (
                <GroupsFilter groups={childGroups} asLinks />
            ) : null}
            <GroupExplorerList
                humanId={humanId}
                initialProducts={result.products}
                total={result.total}
                initialOffset={result.nextOffset}
            />
        </div>
    )
}

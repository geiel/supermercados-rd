import { AddGroupToListButton } from "@/components/add-group-to-list-button";
import { CategoryBadge } from "@/components/category-badge";
import { GroupBreadcrumbs } from "@/components/group-breadcrumbs";
import { GroupExplorerFilters } from "@/components/group-explorer-filters";
import { GroupExplorerList } from "@/components/group-explorer-list";
import { TypographyH3 } from "@/components/typography-h3";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import ScrollPeek from "@/components/ui/scroll-peek";
import { getGroupBreadcrumbsForGroup } from "@/lib/group-breadcrumbs";
import { getGroupProducts } from "@/lib/group-products";
import { trackGroupVisit } from "@/lib/posthog-server";
import { GROUP_EXPLORER_DESKTOP_PAGE_SIZE, type GroupExplorerFilters as Filters } from "@/types/group-explorer";
import { PackageSearch } from "lucide-react";
import { headers } from "next/headers";

type GroupExplorerProps = {
    humanId: string;
    searchParams?: { [key: string]: string | string[] | undefined };
};

function parseFiltersFromSearchParams(searchParams?: { [key: string]: string | string[] | undefined }): Filters {
    if (!searchParams) return {};

    const filters: Filters = {};

    // Parse shop_ids
    const shopIdsParam = searchParams.shop_ids;
    if (typeof shopIdsParam === "string" && shopIdsParam) {
        const shopIds = shopIdsParam.split(",").map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
        if (shopIds.length > 0) filters.shopIds = shopIds;
    }

    // Parse units
    const unitsParam = searchParams.units;
    if (typeof unitsParam === "string" && unitsParam) {
        const units = unitsParam.split(",").map((v) => decodeURIComponent(v.trim())).filter((s) => s.length > 0);
        if (units.length > 0) filters.units = units;
    }

    // Parse min_price
    const minPriceParam = searchParams.min_price;
    if (typeof minPriceParam === "string" && minPriceParam) {
        const minPrice = Number(minPriceParam);
        if (!isNaN(minPrice) && minPrice >= 0) filters.minPrice = minPrice;
    }

    // Parse max_price
    const maxPriceParam = searchParams.max_price;
    if (typeof maxPriceParam === "string" && maxPriceParam) {
        const maxPrice = Number(maxPriceParam);
        if (!isNaN(maxPrice) && maxPrice > 0) filters.maxPrice = maxPrice;
    }

    return filters;
}

export async function GroupExplorer({ humanId, searchParams }: GroupExplorerProps) {
    const filters = parseFiltersFromSearchParams(searchParams);

    const result = await getGroupProducts({
        humanId,
        offset: 0,
        limit: GROUP_EXPLORER_DESKTOP_PAGE_SIZE,
        filters,
    });

    if (!result) {
        return (
            <div className="container mx-auto px-2 pb-2">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <PackageSearch />
                        </EmptyMedia>
                        <EmptyTitle>Categoría no encontrada</EmptyTitle>
                        <EmptyDescription>
                            No encontramos esta categoría. Intenta con otra búsqueda.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </div>
        );
    }

    const requestHeaders = await headers();
    const [breadcrumbs] = await Promise.all([
        getGroupBreadcrumbsForGroup(result.group.id),
        trackGroupVisit({
            groupId: result.group.id,
            groupName: result.group.name,
            groupHumanId: result.group.humanId,
            requestHeaders,
        }),
    ]);

    return (
        <div className="container mx-auto px-2 pb-2 space-y-4">
            <GroupBreadcrumbs
                paths={breadcrumbs.length > 0 ? [breadcrumbs] : []}
                compactMobileMode="last"
                includeHome
            />
            <div className="flex gap-2 items-center justify-between">
                <div className="flex items-baseline gap-2">
                    <TypographyH3>{result.group.name}</TypographyH3>
                    <span className="text-sm text-muted-foreground">
                        ({result.total})
                    </span>
                </div>
                {result.group.isComparable && (
                    <AddGroupToListButton
                        groupId={result.group.id}
                        groupName={result.group.name}
                    />
                )}
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
                                    isComparable={child.isComparable}
                                    groupImageUrl={child.imageUrl}
                                    addLabel="Lista"
                                />
                            ))}
                        </div>
                    </ScrollPeek>
                </div>
            )}
            <div className="flex gap-6">
                {/* Desktop Filter Sidebar (hidden on mobile/tablet) */}
                <GroupExplorerFilters
                    humanId={humanId}
                    childGroups={result.childGroups}
                    variant="desktop"
                />
                {/* Main Content */}
                <div className="flex-1 min-w-0">
                <GroupExplorerList
                    humanId={humanId}
                    initialProducts={result.products}
                    total={result.total}
                    initialOffset={result.nextOffset}
                    childGroups={result.childGroups}
                    isComparable={result.group.isComparable}
                />
                </div>
            </div>
        </div>
    )
}

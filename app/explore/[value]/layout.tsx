"use client";

import { ExploreFilters } from "@/components/explore-shop-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { getShopsIds } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function ExploreLayout({ children }: LayoutProps<"/explore/[value]">) {
    return (
        <div className="container mx-auto pb-4">
            <div className="flex flex-1 flex-col gap-4">
                <Suspense fallback={<ExploreFiltersFallback />}>
                    <ExploreFiltersWithParams />
                </Suspense>
                {children}
            </div>
        </div>
    )
}

function ExploreFiltersWithParams() {
    const searchParams = useSearchParams();

    return (
        <ExploreFilters selectedShopIds={getShopsIds(searchParams.get("shop_ids"))} />
    );
}

function ExploreFiltersFallback() {
    return (
        <div className="px-2 md:px-0 space-y-2">
            <div className="flex space-x-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
            </div>
            <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
            </div>
        </div>
    );
}

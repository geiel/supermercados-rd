"use client";

import { LayoutProps } from "@/.next/types/app/explore/[value]/page";
import { ExploreShopFilter } from "@/components/explore-shop-filter";
import { getShopsIds } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

export default function ExploreLayout({ children }: LayoutProps) {
    const searchParams = useSearchParams();

    return (
        <div className="container mx-auto pb-4">
            <div className="flex flex-1 flex-col gap-4">
                <ExploreShopFilter selectedShopIds={getShopsIds(searchParams.get("shop_ids"))} />
                {children}
            </div>
        </div>
    )
}
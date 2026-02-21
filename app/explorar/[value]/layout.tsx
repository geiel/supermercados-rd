"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";

export default function ExploreLayout({ children }: LayoutProps<"/explorar/[value]">) {
    return (
        <div className="container mx-auto pb-4">
            <div className="flex flex-1 flex-col gap-4">
                <Suspense>
                    <SearchFor />
                </Suspense>
                {children}
            </div>
        </div>
    )
}

function SearchFor() {
    const params = useParams<{ value: string; }>();
    const rawSearchValue = decodeURIComponent(params.value).trim();

    return (
        <div className="px-2 md:px-0">
            <h1 className="text-2xl font-semibold tracking-tight">
                Buscaste &quot;{rawSearchValue}&quot;
            </h1>
        </div>
    )
}

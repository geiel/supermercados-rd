"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type CompareMode = "cheapest" | "value";

type CompareModeTabsProps = {
    mode: CompareMode;
};

export function CompareModeTabs({ mode }: CompareModeTabsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleValueChange = (nextValue: string) => {
        const nextMode: CompareMode = nextValue === "value" ? "value" : "cheapest";
        const params = new URLSearchParams(searchParams.toString());

        if (nextMode === "cheapest") {
            params.delete("compare");
        } else {
            params.set("compare", nextMode);
        }

        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    return (
        <Tabs value={mode} onValueChange={handleValueChange}>
            <TabsList>
                <TabsTrigger value="cheapest">Mas barato</TabsTrigger>
                <TabsTrigger value="value">Mejor valor</TabsTrigger>
            </TabsList>
        </Tabs>
    );
}

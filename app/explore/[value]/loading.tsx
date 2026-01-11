import { TypographyH3 } from "@/components/typography-h3";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="px-2 md:px-0">
            <div>
                <TypographyH3>Categorías</TypographyH3>
            </div>
            <div className="py-3">
                <Skeleton className="h-[50px] w-full" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1">
                {Array.from({ length: 15 }).map((_, index) => (
                    <Skeleton key={index} className="h-[280px] md:h-[360px] w-full" />
                ))}
            </div>
        </div>
    )
}

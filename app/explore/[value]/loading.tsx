import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 px-2">
            {Array.from({ length: 15 }).map((_, index) => (
                <Skeleton key={index} className="h-[280px] md:h-[360px] w-full" />
            ))}
        </div>
    )
}

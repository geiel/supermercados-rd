import { Skeleton } from "@/components/ui/skeleton";

export default function SharedListLoading() {
    return (
        <div className="container mx-auto pb-4 px-2 max-w-4xl">
            <div className="flex flex-1 flex-col gap-4">
                {/* Profile card skeleton */}
                <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>

                {/* Header */}
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-10 rounded-md" />
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Skeleton className="h-10 w-64" />
                    <div className="flex gap-3">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-24" />
                    </div>
                </div>

                {/* Shop section */}
                <div className="py-4 flex justify-between items-center">
                    <Skeleton className="h-12 w-12" />
                    <Skeleton className="h-6 w-20" />
                </div>

                {/* Product items */}
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
            </div>
        </div>
    );
}

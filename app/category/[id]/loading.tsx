import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <main className="container mx-auto pb-4">
            <div className="flex flex-1 flex-col gap-4">
            <div className="px-2 md:px-0">
                <div className="flex items-baseline gap-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-10" />
                </div>
            </div>
            <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                <div
                    key={index}
                    className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]"
                >
                    <Skeleton className="w-full max-w-[220px] aspect-square mx-auto" />
                    <Skeleton className="h-4 w-12 mt-3" />
                    <Skeleton className="h-4 w-full mt-2" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                </div>
                ))}
            </div>
            </div>
        </main>
    );
}
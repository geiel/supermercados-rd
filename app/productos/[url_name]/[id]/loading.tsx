import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-10 py-4 px-4 md:px-10 space-y-2">
        <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-[250px]" />
            <Skeleton className="h-3 w-[300px]" />
            <Skeleton className="h-4 w-[50px]" />
            <Skeleton className="h-[290px] w-full md:h-[500px] md:w-full rounded-xl" />
        </div>
        <div className="flex flex-col gap-5">
            <Skeleton className="h-5 w-[250px]" />
            <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-[250px]" />
                <Skeleton className="h-[290px] w-full rounded-xl" />
            </div>
            <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-[250px]" />
                <div className="flex gap-2">
                    <Skeleton className="w-38 h-[130px] rounded-xl" />
                    <Skeleton className="w-38 h-[130px] rounded-xl" />
                    <Skeleton className="w-38 h-[130px] rounded-xl" />
                    <Skeleton className="w-38 h-[130px] rounded-xl" />
                    <Skeleton className="w-38 h-[130px] rounded-xl" />
                </div>
            </div>
        </div>
    </div>
  )
}
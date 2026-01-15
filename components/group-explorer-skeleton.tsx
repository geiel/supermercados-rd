import { Skeleton } from "@/components/ui/skeleton";

type GroupExplorerSkeletonProps = {
  count?: number;
  showHeader?: boolean;
  showSort?: boolean;
};

export function GroupExplorerSkeleton({
  count = 10,
  showHeader = true,
  showSort = true,
}: GroupExplorerSkeletonProps) {
  return (
    <div className="container mx-auto px-2 pb-2 space-y-4">
      {showHeader && (
        <div className="flex gap-2 items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      )}
      {showSort && (
        <div className="flex items-center justify-end pb-2">
          <Skeleton className="h-9 w-full md:w-[200px]" />
        </div>
      )}
      <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <GroupExplorerCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function GroupExplorerCardSkeleton() {
  return (
    <div className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]">
      <div className="flex flex-col gap-2">
        {/* Image placeholder */}
        <div className="flex justify-center">
          <Skeleton className="h-[220px] w-[220px]" />
        </div>
        {/* Unit badge */}
        <Skeleton className="h-5 w-16 rounded-full" />
        {/* Brand + Name */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        {/* Price */}
        <div className="pt-1 space-y-1">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function GroupExplorerGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <GroupExplorerCardSkeleton key={i} />
      ))}
    </div>
  );
}

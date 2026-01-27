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
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      )}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex gap-6">
        <FilterSidebarSkeleton />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 pb-2 lg:hidden">
            <Skeleton className="h-9 w-full" />
            {showSort && <Skeleton className="h-9 w-full" />}
          </div>
          <div className="hidden lg:flex items-start gap-4 pb-2">
            <div className="flex flex-wrap gap-2 flex-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-7 w-28 rounded-full" />
              ))}
            </div>
            {showSort && <Skeleton className="h-9 w-full md:w-[200px]" />}
          </div>
          <GroupExplorerGridSkeleton count={count} />
        </div>
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
    <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <GroupExplorerCardSkeleton key={i} />
      ))}
    </div>
  );
}

function FilterSidebarSkeleton() {
  return (
    <aside className="w-[280px] shrink-0 hidden lg:block">
      <div className="space-y-6 py-4 md:pr-4">
        <PriceFilterSkeleton />
        <FilterSectionSkeleton rows={4} />
        <FilterSectionSkeleton rows={4} />
        <FilterSectionSkeleton rows={3} />
      </div>
    </aside>
  );
}

function PriceFilterSkeleton() {
  return (
    <div className="border-b pb-4">
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-6 rounded-full" />
        </div>
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <div className="space-y-3 pt-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-2 w-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterSectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="border-b pb-4">
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-6 rounded-full" />
        </div>
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

import { RELATED_PRODUCTS_SCROLL_PEEK_PROPS } from "@/components/ui/product-scroll-config";
import ScrollPeek from "@/components/ui/scroll-peek";
import { Skeleton } from "@/components/ui/skeleton";

const RELATED_PRODUCTS_PLACEHOLDERS = 10;

export default function Loading() {
  return (
    <div className="container mx-auto grid grid-cols-1 space-y-2 px-4 py-4 xl:grid-cols-2 xl:gap-10">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-[250px]" />
        <Skeleton className="h-3 w-[300px]" />
        <Skeleton className="h-4 w-[50px]" />
        <Skeleton className="h-[290px] w-full rounded-xl md:h-[500px]" />
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
          <ScrollPeek {...RELATED_PRODUCTS_SCROLL_PEEK_PROPS}>
            <div className="relative flex gap-1.5 p-2 md:gap-2">
              {Array.from({ length: RELATED_PRODUCTS_PLACEHOLDERS }).map((_, index) => (
                <RelatedProductCardSkeleton key={index} />
              ))}
            </div>
          </ScrollPeek>
        </div>
      </div>
    </div>
  );
}

function RelatedProductCardSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-2 pb-2">
      <Skeleton className="w-full max-w-[168px] aspect-square mx-auto" />
      <div className="px-2 flex flex-col gap-1">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-14" />
      </div>
    </div>
  );
}

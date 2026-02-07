import { Skeleton } from "@/components/ui/skeleton";

const GROUP_CARD_PLACEHOLDERS = 8;

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {Array.from({ length: GROUP_CARD_PLACEHOLDERS }).map((_, index) => (
          <div key={index} className="rounded-2xl bg-white p-3">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="mt-3 h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type SearchBarSkeletonProps = {
  className?: string;
};

export function SearchBarSkeleton({ className }: SearchBarSkeletonProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 rounded-full bg-white">
        <div className="flex items-center rounded-full border px-3">
          <Spinner className="mr-2 h-4 w-4 shrink-0 opacity-50 hidden md:block" />
          <input
            aria-label="Buscar"
            type="text"
            placeholder="Buscar..."
            disabled
            className="flex h-11 w-full rounded-md bg-transparent py-3 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50 text-base"
          />
        </div>
      </div>
    </div>
  );
}

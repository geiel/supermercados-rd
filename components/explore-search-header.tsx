"use client";

import { Lightbulb } from "lucide-react";

import { useAddToList } from "@/hooks/use-add-to-list";

type ExploreSearchTipProps = {
  hasCategories: boolean;
};

export function ExploreSearchTip({ hasCategories }: ExploreSearchTipProps) {
  const { hasAnyGroup, isLoading } = useAddToList();
  const shouldShowTip = hasCategories && !hasAnyGroup && !isLoading;

  if (!shouldShowTip) {
    return null;
  }

  return (
    <div className="px-2 md:px-0">
      <div className="flex items-start gap-2 rounded-lg border border-purple-200/60 bg-purple-500/10 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm max-w-fit">
        <div className="shrink-0">
          <Lightbulb className="mt-0.5 size-4 text-primary" />
        </div>
        <span>
          Agrega una categoría para{" "}
          <span className="font-semibold text-foreground">comparar</span>{" "}
          precios entre supermercados
        </span>
      </div>
    </div>
  );
}

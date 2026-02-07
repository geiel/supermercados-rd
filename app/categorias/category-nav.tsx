"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";

type CategoryNavItem = {
  id: number;
  name: string;
  humanNameId: string;
  icon: string | null;
  shortName: string | null;
};

type CategoriesNavProps = {
  categories: CategoryNavItem[];
  orientation: "horizontal" | "vertical";
};

export function CategoriesNav({ categories, orientation }: CategoriesNavProps) {
  const activeSlug = useSelectedLayoutSegment();

  return (
    <div className={cn(orientation === "vertical" ? "flex flex-col gap-2" : "flex gap-3")}>
      {categories.map((category) => {
        const isActive = category.humanNameId === activeSlug;
        return (
          <Link
            key={category.id}
            href={`/categorias/${category.humanNameId}`}
            className={cn(
              orientation === "vertical"
                ? "flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm font-medium transition hover:bg-muted"
                : "flex min-w-[84px] flex-col items-center gap-2 rounded-2xl border border-border/60 bg-white px-3 py-3 text-center text-xs font-medium text-foreground shadow-xs transition hover:border-border hover:shadow-sm",
              isActive && "bg-muted text-foreground"
            )}
          >
            <CategoryIcon
              icon={category.icon}
              className={orientation === "vertical" ? "size-5 shrink-0" : "size-7"}
            />
            <span className={orientation === "vertical" ? "truncate" : "line-clamp-2"}>
              {orientation === "vertical"
                ? category.name
                : category.shortName || category.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

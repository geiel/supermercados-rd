"use client";

import Link from "next/link";

import ScrollPeek from "@/components/ui/scroll-peek";
import { cn } from "@/lib/utils";

type GroupFilterItem = {
  id: number;
  name: string;
  humanId: string;
};

type GroupsFilterProps = {
  label?: string;
  groups: GroupFilterItem[];
  selectedId?: number | null;
  onSelect?: (groupId: number | null) => void;
  showAll?: boolean;
  allLabel?: string;
  asLinks?: boolean;
  linkBase?: string;
};

export function GroupsFilter({
  label = "Categorias",
  groups,
  selectedId = null,
  onSelect,
  showAll = false,
  allLabel = "Todas",
  asLinks = false,
  linkBase = "/groups",
}: GroupsFilterProps) {
  if (groups.length === 0) {
    return null;
  }

  const items = showAll
    ? [{ id: 0, name: allLabel, humanId: "" }, ...groups]
    : groups;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <ScrollPeek>
        <div className="flex items-center gap-2 px-2">
          {items.map((group) => {
            const isAll = showAll && group.id === 0;
            const isActive = isAll
              ? selectedId === null
              : selectedId === group.id;
            const sharedClassName = cn(
              "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent"
            );

            if (asLinks) {
              const href = `${linkBase}/${group.humanId}`;
              return (
                <Link
                  key={group.id}
                  href={href}
                  prefetch={false}
                  className={sharedClassName}
                >
                  {group.name}
                </Link>
              );
            }

            return (
              <button
                key={group.id}
                type="button"
                className={sharedClassName}
                onClick={() =>
                  onSelect ? onSelect(isAll ? null : group.id) : undefined
                }
              >
                {group.name}
              </button>
            );
          })}
        </div>
      </ScrollPeek>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { TypographyH3 } from "./typography-h3";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { addGroupToUserList } from "@/lib/compare";
import { Spinner } from "./ui/spinner";
import { toast } from "sonner";

export function CategorySearch({ groupResults }: { groupResults: Array<{ name: string; humanId: string }> }) {
    const [showAllMobile, setShowAllMobile] = useState(false);
    const [pendingGroupIds, setPendingGroupIds] = useState<Set<string>>(new Set());
    const [, startTransition] = useTransition();
    const mobileGroups = showAllMobile ? groupResults : groupResults.slice(0, 4);

    const handleAddGroup = (groupHumanId: string) => {
        if (pendingGroupIds.has(groupHumanId)) {
            return;
        }

        setPendingGroupIds((current) => {
            const next = new Set(current);
            next.add(groupHumanId);
            return next;
        });

        startTransition(async () => {
            try {
                const { error } = await addGroupToUserList(groupHumanId);
                if (error) {
                    toast.error(error);
                }
            } finally {
                setPendingGroupIds((current) => {
                    const next = new Set(current);
                    next.delete(groupHumanId);
                    return next;
                });
            }
        });
    };

    return (
        <div className="px-2 md:px-0">
        <div className="flex items-baseline gap-2">
          <TypographyH3>Categorías</TypographyH3>
          <span className="text-sm text-muted-foreground">
            ({groupResults.length})
          </span>
        </div>

        <div className="flex flex-wrap gap-3 py-3 max-md:hidden">
          {groupResults.map((group) => (
            <div
              key={group.humanId}
              className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:shadow"
            >
              <Link
                href={`/groups/${group.humanId}`}
                className="whitespace-nowrap"
              >
                {group.name}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() => handleAddGroup(group.humanId)}
                disabled={pendingGroupIds.has(group.humanId)}
                aria-label={`Agregar ${group.name} a la lista`}
              >
                {pendingGroupIds.has(group.humanId) ? <Spinner /> : <Plus />}
              </Button>
            </div>
          ))}
        </div>
        <div className="space-y-3 py-3 md:hidden">
          {mobileGroups.map((group) => (
            <div
              key={group.humanId}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900"
            >
              <Link
                href={`/groups/${group.humanId}`}
                className="flex-1 whitespace-nowrap"
              >
                {group.name}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() => handleAddGroup(group.humanId)}
                disabled={pendingGroupIds.has(group.humanId)}
                aria-label={`Agregar ${group.name} a la lista`}
              >
                {pendingGroupIds.has(group.humanId) ? <Spinner /> : <Plus />}
              </Button>
            </div>
          ))}
          {!showAllMobile && groupResults.length > 4 ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setShowAllMobile(true)}
            >
              Mostrar más ({groupResults.length - 4})
            </Button>
          ) : null}
        </div>
      </div>
    )
}

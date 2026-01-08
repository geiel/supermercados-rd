"use client";

import { useContext, useState, useTransition } from "react";
import Link from "next/link";
import { TypographyH3 } from "./typography-h3";
import { Button } from "./ui/button";
import { Check, Plus } from "lucide-react";
import { addGroupToUserList, deleteGroupItem } from "@/lib/compare";
import { Spinner } from "./ui/spinner";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ListGroupContext } from "./list-provider";

type GroupResult = { name: string; humanId: string; groupId: number };

export function CategorySearch({ groupResults }: { groupResults: Array<GroupResult> }) {
    const [showAllMobile, setShowAllMobile] = useState(false);
    const [pendingAddGroupIds, setPendingAddGroupIds] = useState<Set<number>>(new Set());
    const [pendingRemoveGroupIds, setPendingRemoveGroupIds] = useState<Set<number>>(new Set());
    const [, startTransition] = useTransition();
    const router = useRouter();
    const { listGroupItems, mutate: mutateGroupItems, isLoading: isLoadingGroupItems } = useContext(ListGroupContext);
    const mobileGroups = showAllMobile ? groupResults : groupResults.slice(0, 4);
    const groupItemByGroupId = new Map(listGroupItems?.map((item) => [item.groupId, item]) ?? []);

    const handleAddGroup = (groupHumanId: string, groupId: number) => {
        if (pendingAddGroupIds.has(groupId) || pendingRemoveGroupIds.has(groupId)) {
            return;
        }

        setPendingAddGroupIds((current) => {
            const next = new Set(current);
            next.add(groupId);
            return next;
        });

        startTransition(async () => {
            try {
                const { error } = await addGroupToUserList(groupHumanId);
                if (error) {
                    toast.error(error);
                    return;
                }
                await mutateGroupItems();
                toast('Agregado a la lista', {
                    action: {
                        label: "Ver",
                        onClick: () => router.push("/lists")
                    }
                });
            } finally {
                setPendingAddGroupIds((current) => {
                    const next = new Set(current);
                    next.delete(groupId);
                    return next;
                });
            }
        });
    };

    const handleRemoveGroup = (groupId: number, listGroupItemId: number) => {
        if (pendingAddGroupIds.has(groupId) || pendingRemoveGroupIds.has(groupId)) {
            return;
        }

        setPendingRemoveGroupIds((current) => {
            const next = new Set(current);
            next.add(groupId);
            return next;
        });

        startTransition(async () => {
            try {
                const { error } = await deleteGroupItem(listGroupItemId);
                if (error) {
                    toast.error(error);
                    return;
                }
                await mutateGroupItems();
                toast('Removido de la lista');
            } finally {
                setPendingRemoveGroupIds((current) => {
                    const next = new Set(current);
                    next.delete(groupId);
                    return next;
                });
            }
        });
    };

    const renderGroupActionButton = (group: GroupResult) => {
        const groupListItem = groupItemByGroupId.get(group.groupId);
        const isPendingAdd = pendingAddGroupIds.has(group.groupId);
        const isPendingRemove = pendingRemoveGroupIds.has(group.groupId);
        const isPending = isPendingAdd || isPendingRemove;
        const isDisabled = isPending || isLoadingGroupItems;

        if (groupListItem) {
            return (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full bg-[#CE1126] text-white hover:bg-[#CE1126]/60"
                    onClick={() => handleRemoveGroup(group.groupId, groupListItem.id)}
                    disabled={isDisabled}
                    aria-label={`Remover ${group.name} de la lista`}
                >
                    {isPendingRemove ? <Spinner /> : <Check />}
                </Button>
            );
        }

        return (
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() => handleAddGroup(group.humanId, group.groupId)}
                disabled={isDisabled}
                aria-label={`Agregar ${group.name} a la lista`}
            >
                {isPendingAdd ? <Spinner /> : <Plus />}
            </Button>
        );
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
              {renderGroupActionButton(group)}
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
              {renderGroupActionButton(group)}
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

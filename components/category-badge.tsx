"use client";

import { useCallback, useState } from "react";
import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAddToList } from "@/hooks/use-add-to-list";

const DEFAULT_LIST_NAME = "Lista de compras";
const CHECKED_COLOR = "#ce1126";

type CategoryBadgeProps = {
  groupId: number;
  groupName: string;
  groupHumanNameId: string;
  showLabel?: boolean;
};

export function CategoryBadge({
  groupId,
  groupName,
  groupHumanNameId,
  showLabel = false,
}: CategoryBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();

  // Unified hook for both guests and logged-in users
  const {
    hasGroup,
    isGroupInList,
    addGroup,
    removeGroup,
    toggleGroup,
    lists,
    isLoadingLists,
    createList,
    isCreatingList,
    isLocalMode,
    isLoading,
  } = useAddToList();

  const isInAnyList = hasGroup(groupId);
  const getListHref = useCallback((listId?: number) => {
    if (listId) return `/lists/${listId}`;
    return "/lists/local";
  }, []);

  const showAddedToast = useCallback(
    (message: string, listId?: number) => {
      toast.success(message, {
        action: {
          label: "Ver lista",
          onClick: () => router.push(getListHref(listId)),
        },
      });
    },
    [router, getListHref]
  );

  // Handle click for guests (local mode)
  const handleGuestClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleGroup(groupId);
      if (isInAnyList) {
        toast.success(`${groupName} ha sido eliminado de la lista`);
      } else {
        showAddedToast(`${groupName} ha sido agregado a la lista`);
      }
    },
    [toggleGroup, groupId, groupName, isInAnyList, showAddedToast]
  );

  // Handle click for logged-in users
  const handleLoggedInClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // No lists - create default and add
      if (!lists || lists.length === 0) {
        createList(DEFAULT_LIST_NAME);
        toast.info("Creando lista...");
        return;
      }

      // Single list - toggle directly
      if (lists.length === 1) {
        const listId = lists[0].id;
        const listName = lists[0].name;
        if (isGroupInList(groupId, listId)) {
          removeGroup(groupId, listId);
          toast.success(`${groupName} ha sido eliminado de ${listName}`);
        } else {
          addGroup(groupId, listId);
          showAddedToast(`${groupName} ha sido agregado a ${listName}`, listId);
        }
        return;
      }

      // Multiple lists - open dropdown/drawer
      setIsOpen(true);
    },
    [lists, groupId, groupName, isGroupInList, addGroup, removeGroup, createList]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isLocalMode) {
        handleGuestClick(e);
      } else {
        handleLoggedInClick(e);
      }
    },
    [isLocalMode, handleGuestClick, handleLoggedInClick]
  );

  // Toggle group in a specific list (for dropdown/drawer)
  const handleToggleList = useCallback(
    (listId: number) => {
      const listName = lists?.find((l) => l.id === listId)?.name ?? "la lista";
      if (isGroupInList(groupId, listId)) {
        removeGroup(groupId, listId);
        toast.success(`${groupName} ha sido eliminado de ${listName}`);
      } else {
        addGroup(groupId, listId);
        showAddedToast(`${groupName} ha sido agregado a ${listName}`, listId);
      }
    },
    [lists, groupId, groupName, isGroupInList, addGroup, removeGroup, showAddedToast]
  );

  const isMutating = isCreatingList;
  const shouldShowLabel = showLabel || isMobile;
  const addLabel = "Comparar";

  const addButtonStyle = isInAnyList
    ? { backgroundColor: CHECKED_COLOR, color: "white" }
    : { backgroundColor: "black", color: "white" };

  const addButtonContent = isInAnyList ? (
    <>
      <Check className="size-4" />
      {shouldShowLabel && <span>{addLabel}</span>}
    </>
  ) : (
    <>
      <Plus className="size-4" />
      {shouldShowLabel && <span>{addLabel}</span>}
    </>
  );

  const addButtonClassName = shouldShowLabel
    ? "flex items-center justify-center gap-1 px-3 py-1.5 rounded-full mr-2 transition-colors text-xs font-medium"
    : "flex items-center justify-center p-2 rounded-full mr-2 transition-colors";

  // Guest users or users with 0-1 lists - simple badge with button
  if (isLocalMode || !lists || lists.length <= 1) {
    return (
      <div className="inline-flex items-center justify-between gap-2 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:shadow">
        <Link
          href={`/groups/${groupHumanNameId}`}
          className="px-5 py-2.5 w-full"
        >
          {groupName}
        </Link>
        <button
          type="button"
          className={addButtonClassName}
          style={addButtonStyle}
          onClick={handleClick}
          disabled={isLoading || isLoadingLists || isMutating}
        >
          {addButtonContent}
        </button>
      </div>
    );
  }

  // Multiple lists - show dropdown/drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <div className="inline-flex items-center justify-between gap-2 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:shadow">
          <Link
            href={`/groups/${groupHumanNameId}`}
            className="px-5 py-2.5 w-full"
          >
            {groupName}
          </Link>
          <DrawerTrigger asChild>
            <button
              type="button"
              className={addButtonClassName}
              style={addButtonStyle}
              disabled={isLoading || isLoadingLists || isMutating}
            >
              {addButtonContent}
            </button>
          </DrawerTrigger>
        </div>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Agregar categoría a lista</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-3">
            {lists.map((list) => {
              const isChecked = isGroupInList(groupId, list.id);
              return (
                <div
                  key={list.id}
                  className="flex items-center space-x-3 py-2 cursor-pointer"
                  onClick={() => handleToggleList(list.id)}
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={isMutating}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-sm font-medium leading-none flex-1">
                    {list.name}
                  </span>
                </div>
              );
            })}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <div className="inline-flex items-center justify-between gap-2 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:shadow">
        <Link
          href={`/groups/${groupHumanNameId}`}
          className="px-5 py-2.5 w-full"
        >
          {groupName}
        </Link>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={addButtonClassName}
            style={addButtonStyle}
            disabled={isLoading || isLoadingLists || isMutating}
          >
            {addButtonContent}
          </button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Agregar categoría a lista</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {lists.map((list) => {
          const isChecked = isGroupInList(groupId, list.id);
          return (
            <DropdownMenuCheckboxItem
              key={list.id}
              checked={isChecked}
              onCheckedChange={() => handleToggleList(list.id)}
              disabled={isMutating}
            >
              {list.name}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

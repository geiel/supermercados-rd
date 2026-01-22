"use client";

import { useCallback, useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Checkbox } from "@/components/ui/checkbox";
import { CreateListDialog } from "@/components/create-list-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAddToList } from "@/hooks/use-add-to-list";

const DEFAULT_LIST_NAME = "Lista de compras";
const CHECKED_COLOR = "#ce1126";

type AddGroupToListButtonProps = {
  groupId: number;
  groupName: string;
  variant?: "default" | "icon";
};

export function AddGroupToListButton({ groupId, groupName, variant = "default" }: AddGroupToListButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();

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
  const handleGuestClick = useCallback(() => {
    toggleGroup(groupId);
    if (isInAnyList) {
      toast.success(`${groupName} ha sido eliminado de la lista`);
    } else {
      showAddedToast(`${groupName} ha sido agregado a la lista`);
    }
  }, [toggleGroup, groupId, groupName, isInAnyList, showAddedToast]);

  // Handle click for logged-in users
  const handleLoggedInClick = useCallback(async () => {
    // No lists - create default and add
    if (!lists || lists.length === 0) {
      toast.info("Creando lista...");
      try {
        const newList = await createList(DEFAULT_LIST_NAME);
        if (!newList) {
          toast.error("No se pudo crear la lista");
          return;
        }
        addGroup(groupId, newList.id);
        showAddedToast(`${groupName} ha sido agregado a ${newList.name}`, newList.id);
      } catch {
        toast.error("No se pudo crear la lista");
      }
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

    // Multiple lists - open dropdown/drawer so user can choose
    setIsOpen(true);
  }, [lists, groupId, groupName, isGroupInList, addGroup, removeGroup, createList, showAddedToast]);

  const handleClick = useCallback(() => {
    if (isLocalMode) {
      handleGuestClick();
    } else {
      handleLoggedInClick();
    }
  }, [isLocalMode, handleGuestClick, handleLoggedInClick]);

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

  // Handler for when a new list is created
  const handleListCreated = useCallback(() => {
    setCreateListOpen(false);
  }, []);

  const isMutating = isCreatingList;
  const isIconVariant = variant === "icon";

  const buttonContent = isIconVariant ? (
    isInAnyList ? <Check className="size-4" /> : <Plus className="size-4" />
  ) : (
    <>
      {isInAnyList ? <Check className="size-4" /> : <Plus className="size-4" />}
      Comparar
    </>
  );

  const buttonStyle = isInAnyList
    ? { backgroundColor: CHECKED_COLOR, borderColor: CHECKED_COLOR, color: "white" }
    : { backgroundColor: "black", color: "white" };

  const buttonClassName = isIconVariant
    ? "shrink-0 size-8 rounded-full p-0 bg-white/90 hover:bg-white shadow-sm"
    : "shrink-0";

  // Guest users or users with 0-1 lists - simple button
  if (isLocalMode || !lists || lists.length <= 1) {
    return (
      <Button
        variant="outline"
        size={isIconVariant ? "icon" : "sm"}
        className={buttonClassName}
        style={buttonStyle}
        onClick={handleClick}
        disabled={isLoading || isLoadingLists || isMutating}
      >
        {buttonContent}
      </Button>
    );
  }

  // Multiple lists - show dropdown/drawer so user can choose which list(s)
  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size={isIconVariant ? "icon" : "sm"}
              className={buttonClassName}
              style={buttonStyle}
              disabled={isLoading || isLoadingLists || isMutating}
            >
              {buttonContent}
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Agregar a lista</DrawerTitle>
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
              
              {/* Create new list option */}
              <div className="pt-2 border-t">
                <div
                  className="flex items-center space-x-3 py-2 cursor-pointer text-primary"
                  onClick={() => {
                    setIsOpen(false);
                    setCreateListOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  <span className="text-sm font-medium leading-none">
                    Crear nueva lista
                  </span>
                </div>
              </div>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Cerrar</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* Create List Dialog */}
        <CreateListDialog
          open={createListOpen}
          onOpenChange={setCreateListOpen}
          onSuccess={handleListCreated}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={isIconVariant ? "icon" : "sm"}
            className={buttonClassName}
            style={buttonStyle}
            disabled={isLoading || isLoadingLists || isMutating}
          >
            {buttonContent}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Agregar a lista</DropdownMenuLabel>
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
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              setCreateListOpen(true);
            }}
          >
            <Plus className="size-4 mr-2" />
            Crear nueva lista
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create List Dialog */}
      <CreateListDialog
        open={createListOpen}
        onOpenChange={setCreateListOpen}
        onSuccess={handleListCreated}
      />
    </>
  );
}

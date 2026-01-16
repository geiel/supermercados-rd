"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";

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

type AddToListButtonProps = {
  productId: number;
  variant?: "default" | "icon";
};

export function AddToListButton({ productId, variant = "default" }: AddToListButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const isMobile = useIsMobile();

  // Track when component has mounted to avoid hydration mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Unified hook for both guests and logged-in users
  const {
    hasProduct,
    isProductInList,
    addProduct,
    removeProduct,
    toggleProduct,
    lists,
    isLoadingLists,
    createList,
    isCreatingList,
    isLocalMode,
    isLoading,
  } = useAddToList();

  const isInAnyList = hasProduct(productId);

  // Handle click for guests (local mode)
  const handleGuestClick = useCallback(() => {
    toggleProduct(productId);
    if (isInAnyList) {
      toast.success("El producto ha sido eliminado de la lista");
    } else {
      toast.success("El producto ha sido agregado a la lista");
    }
  }, [toggleProduct, productId, isInAnyList]);

  // Handle click for logged-in users
  const handleLoggedInClick = useCallback(async () => {
    // No lists - create default and add
    if (!lists || lists.length === 0) {
      createList(DEFAULT_LIST_NAME);
      // Note: We'd need to wait for list creation and then add
      // For now, we'll handle this case by opening the dropdown
      toast.info("Creando lista...");
      return;
    }

    // Single list - toggle directly
    if (lists.length === 1) {
      const listId = lists[0].id;
      const listName = lists[0].name;
      if (isProductInList(productId, listId)) {
        removeProduct(productId, listId);
        toast.success(`El producto ha sido eliminado de ${listName}`);
      } else {
        addProduct(productId, listId);
        toast.success(`El producto ha sido agregado a ${listName}`);
      }
      return;
    }

    // Multiple lists - open dropdown/drawer so user can choose
    setIsOpen(true);
  }, [lists, productId, isProductInList, addProduct, removeProduct, createList]);

  const handleClick = useCallback(() => {
    if (isLocalMode) {
      handleGuestClick();
    } else {
      handleLoggedInClick();
    }
  }, [isLocalMode, handleGuestClick, handleLoggedInClick]);

  // Toggle product in a specific list (for dropdown/drawer)
  const handleToggleList = useCallback(
    (listId: number) => {
      const listName = lists?.find((l) => l.id === listId)?.name ?? "la lista";
      if (isProductInList(productId, listId)) {
        removeProduct(productId, listId);
        toast.success(`El producto ha sido eliminado de ${listName}`);
      } else {
        addProduct(productId, listId);
        toast.success(`El producto ha sido agregado a ${listName}`);
      }
    },
    [lists, productId, isProductInList, addProduct, removeProduct]
  );

  // Handler for when a new list is created (must be before early returns to respect Rules of Hooks)
  const handleListCreated = useCallback(() => {
    // The list is automatically added to the query cache by CreateListDialog
    // Close the create dialog and keep the main dropdown open
    setCreateListOpen(false);
  }, []);

  const isMutating = isCreatingList;
  const isIconVariant = variant === "icon";
  // Only show loading state after mount to avoid hydration mismatch
  const isDisabled = hasMounted && (isLoading || isLoadingLists || isMutating);

  const buttonContent = isIconVariant ? (
    isInAnyList ? <Check className="size-4" /> : <Plus className="size-4" />
  ) : (
    <>
      {isInAnyList ? <Check className="size-4" /> : <Plus className="size-4" />}
      Lista
    </>
  );

  const buttonStyle = isInAnyList
    ? { backgroundColor: CHECKED_COLOR, borderColor: CHECKED_COLOR, color: "white" }
    : undefined;

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
        disabled={isDisabled}
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
              disabled={isDisabled}
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
                const isChecked = isProductInList(productId, list.id);
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
            disabled={isDisabled}
          >
            {buttonContent}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Agregar a lista</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {lists.map((list) => {
            const isChecked = isProductInList(productId, list.id);
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

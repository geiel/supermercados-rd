"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ListSelect } from "@/db/schema";

const LIST_QUERY_KEY = ["user-lists"];
const USER_LIST_QUERY_KEY = ["user-list"];

type EditListDialogProps = {
  list: ListSelect;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function EditListDialog({
  list,
  open,
  onOpenChange,
  onDeleted,
}: EditListDialogProps) {
  const [name, setName] = useState(list.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Reset name when dialog opens
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setName(list.name);
      }
      onOpenChange(nextOpen);
    },
    [list.name, onOpenChange]
  );

  // Update list name mutation
  const updateMutation = useMutation({
    mutationFn: async (newName: string) => {
      const response = await fetch("/api/user/lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: list.id, name: newName }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar la lista");
      }
      return response.json() as Promise<ListSelect>;
    },
    onSuccess: (updatedList) => {
      // Update the lists cache
      queryClient.setQueryData<ListSelect[]>(LIST_QUERY_KEY, (old) =>
        old?.map((l) => (l.id === updatedList.id ? updatedList : l)) ?? []
      );
      // Update the single list cache used by useUserList
      queryClient.setQueryData<ListSelect | null>(
        [...USER_LIST_QUERY_KEY, updatedList.id],
        updatedList
      );
      toast.success("Lista actualizada");
      onOpenChange(false);
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete list mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/user/lists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: list.id }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al eliminar la lista");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData<ListSelect[]>(LIST_QUERY_KEY, (old) =>
        old?.filter((l) => l.id !== list.id) ?? []
      );
      toast.success("Lista eliminada");
      onOpenChange(false);
      setShowDeleteConfirm(false);
      onDeleted?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setShowDeleteConfirm(false);
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) {
        toast.error("El nombre de la lista no puede estar vacío");
        return;
      }
      if (trimmedName === list.name) {
        onOpenChange(false);
        return;
      }
      updateMutation.mutate(trimmedName);
    },
    [name, list.name, updateMutation, onOpenChange]
  );

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    deleteMutation.mutate();
  }, [deleteMutation]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isLoading = isUpdating || isDeleting;

  const formContent = (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="edit-list-name">Nombre de la lista</Label>
        <Input
          id="edit-list-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || !name.trim()}>
          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </form>
  );

  const deleteButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isLoading}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      aria-label="Eliminar lista"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  // Delete confirmation dialog content
  const deleteConfirmContent = (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Esta acción no se puede deshacer. Se eliminarán todos los productos y
        categorías de la lista &quot;{list.name}&quot;.
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={handleCancelDelete}
          disabled={isDeleting}
        >
          Cancelar
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirmDelete}
          disabled={isDeleting}
        >
          {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Eliminar
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open && !showDeleteConfirm} onOpenChange={handleOpenChange}>
          <DrawerContent>
            <DrawerHeader className="flex flex-row items-center justify-between px-4">
              <div className="w-10">{deleteButton}</div>
              <DrawerTitle>Editar lista</DrawerTitle>
              <div className="w-10" /> {/* Spacer to balance the delete button */}
            </DrawerHeader>
            <div className="px-4 pb-4">{formContent}</div>
          </DrawerContent>
        </Drawer>

        {/* Delete confirmation drawer */}
        <Drawer open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="text-center">¿Eliminar lista?</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">{deleteConfirmContent}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      <Dialog open={open && !showDeleteConfirm} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="w-10">{deleteButton}</div>
            <DialogTitle>Editar lista</DialogTitle>
            <div className="w-10" /> {/* Spacer to balance the delete button */}
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">¿Eliminar lista?</DialogTitle>
          </DialogHeader>
          {deleteConfirmContent}
        </DialogContent>
      </Dialog>
    </>
  );
}

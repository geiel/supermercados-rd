"use client";

import { useState, useCallback } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ListSelect } from "@/db/schema";

const LIST_QUERY_KEY = ["user-lists"];

type CreateListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (list: ListSelect) => void;
};

export function CreateListDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateListDialogProps) {
  const [name, setName] = useState("");
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const createListMutation = useMutation({
    mutationFn: async (listName: string) => {
      const response = await fetch("/api/user/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: listName }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear la lista");
      }
      return response.json() as Promise<ListSelect>;
    },
    onSuccess: (newList) => {
      queryClient.setQueryData<ListSelect[]>(LIST_QUERY_KEY, (old) =>
        old ? [...old, newList] : [newList]
      );
      toast.success(`Lista "${newList.name}" creada`);
      setName("");
      onOpenChange(false);
      onSuccess?.(newList);
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
      createListMutation.mutate(trimmedName);
    },
    [name, createListMutation]
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setName("");
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  const isLoading = createListMutation.isPending;

  const formContent = (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="list-name">Nombre de la lista</Label>
        <Input
          id="list-name"
          type="text"
          placeholder="Ej: Lista semanal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          autoFocus={!isMobile}
        />
      </div>
      <Button type="submit" disabled={isLoading || !name.trim()}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Crear lista
      </Button>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Crear nueva lista</DrawerTitle>
            <DrawerDescription>
              Dale un nombre a tu nueva lista de compras
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">{formContent}</div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" disabled={isLoading}>
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear nueva lista</DialogTitle>
          <DialogDescription>
            Dale un nombre a tu nueva lista de compras
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}

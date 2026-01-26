"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Check, FolderTree, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Group = {
  id: number;
  name: string;
  description: string | null;
  humanNameId: string;
  showSearch: boolean;
  isComparable: boolean;
  parentGroupId: number | null;
};

type GroupsManagerProps = {
  groups: Group[];
  createGroup: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  updateGroup: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  deleteGroup: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

export function GroupsManager({
  groups,
  createGroup,
  updateGroup,
}: GroupsManagerProps) {
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");

  // Get the selected parent group
  const selectedParent = selectedParentId
    ? groups.find((g) => g.id === selectedParentId)
    : null;

  // Filter groups for left panel (all groups)
  const leftFilteredGroups = leftSearch.trim()
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(leftSearch.toLowerCase())
      )
    : groups;

  // Filter groups for right panel (exclude selected parent and its ancestors)
  const getAncestorIds = (groupId: number): number[] => {
    const ancestors: number[] = [];
    let currentId: number | null = groupId;
    const groupById = new Map(groups.map((g) => [g.id, g]));

    while (currentId !== null) {
      const group = groupById.get(currentId);
      if (group && group.parentGroupId !== null) {
        ancestors.push(group.parentGroupId);
        currentId = group.parentGroupId;
      } else {
        break;
      }
    }
    return ancestors;
  };

  const ancestorIds = selectedParentId ? getAncestorIds(selectedParentId) : [];
  const excludeIds = selectedParentId
    ? [selectedParentId, ...ancestorIds]
    : [];

  const availableChildren = groups.filter((g) => !excludeIds.includes(g.id));

  const rightFilteredGroups = rightSearch.trim()
    ? availableChildren.filter((g) =>
        g.name.toLowerCase().includes(rightSearch.toLowerCase())
      )
    : availableChildren;

  // Get current children of selected parent
  const currentChildIds = new Set(
    groups
      .filter((g) => g.parentGroupId === selectedParentId)
      .map((g) => g.id)
  );

  async function handleCreateGroup(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createGroup(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setCreateDialogOpen(false);
      }
    });
  }

  async function toggleChildGroup(childId: number, isCurrentlyChild: boolean) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("groupId", String(childId));

      const childGroup = groups.find((g) => g.id === childId);
      if (!childGroup) return;

      formData.set("name", childGroup.name);
      formData.set("description", childGroup.description ?? "");
      formData.set(
        "parentGroupId",
        isCurrentlyChild ? "" : String(selectedParentId)
      );
      formData.set("showSearch", childGroup.showSearch ? "true" : "false");
      formData.set("isComparable", childGroup.isComparable ? "true" : "false");

      await updateGroup(formData);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Create Group Button */}
      <div className="flex justify-end">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Grupo</DialogTitle>
              <DialogDescription>
                Crea un nuevo grupo para organizar productos.
              </DialogDescription>
            </DialogHeader>
            <CreateGroupForm
              onSubmit={handleCreateGroup}
              isPending={isPending}
              error={error}
            />
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <FolderTree className="h-10 w-10 text-muted-foreground" />
            <EmptyTitle>No hay grupos</EmptyTitle>
            <EmptyDescription>
              Crea tu primer grupo para empezar a organizar productos.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[500px]">
          {/* Left Panel - Select Parent Group */}
          <div className="flex flex-col border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold mb-2">Seleccionar Grupo Padre</h3>
              <Input
                placeholder="Buscar grupo..."
                value={leftSearch}
                onChange={(e) => setLeftSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="flex-1 h-[400px]">
              <div className="p-2">
                {leftFilteredGroups.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No se encontraron grupos
                  </div>
                ) : (
                  leftFilteredGroups.map((group) => {
                    const childCount = groups.filter(
                      (g) => g.parentGroupId === group.id
                    ).length;

                    return (
                      <button
                        key={group.id}
                        onClick={() => setSelectedParentId(group.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between",
                          selectedParentId === group.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        <span className="font-medium">{group.name}</span>
                        {childCount > 0 && (
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              selectedParentId === group.id
                                ? "bg-primary-foreground/20"
                                : "bg-muted-foreground/20"
                            )}
                          >
                            {childCount} hijos
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Select Child Groups */}
          <div className="flex flex-col border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold mb-2">
                {selectedParent
                  ? `Hijos de "${selectedParent.name}"`
                  : "Selecciona un grupo padre"}
              </h3>
              <Input
                placeholder="Buscar grupo..."
                value={rightSearch}
                onChange={(e) => setRightSearch(e.target.value)}
                disabled={!selectedParent}
              />
            </div>
            <ScrollArea className="flex-1 h-[400px]">
              <div className="p-2">
                {!selectedParent ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Selecciona un grupo padre a la izquierda
                  </div>
                ) : rightFilteredGroups.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No hay grupos disponibles
                  </div>
                ) : (
                  rightFilteredGroups.map((group) => {
                    const isChild = currentChildIds.has(group.id);
                    const currentParent = group.parentGroupId
                      ? groups.find((g) => g.id === group.parentGroupId)
                      : null;

                    return (
                      <button
                        key={group.id}
                        onClick={() => toggleChildGroup(group.id, isChild)}
                        disabled={isPending}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3",
                          isChild
                            ? "bg-primary/10 hover:bg-primary/20"
                            : "hover:bg-muted",
                          isPending && "opacity-50"
                        )}
                      >
                        <div
                          className={cn(
                            "h-5 w-5 rounded border flex items-center justify-center shrink-0",
                            isChild
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-input"
                          )}
                        >
                          {isChild && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{group.name}</span>
                          {currentParent && !isChild && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (padre actual: {currentParent.name})
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}

type CreateGroupFormProps = {
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
};

function CreateGroupForm({ onSubmit, isPending, error }: CreateGroupFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showSearch, setShowSearch] = useState(true);
  const [isComparable, setIsComparable] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("parentGroupId", "");
    formData.set("showSearch", showSearch ? "true" : "false");
    formData.set("isComparable", isComparable ? "true" : "false");
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Lácteos"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción opcional"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="showSearch"
          checked={showSearch}
          onCheckedChange={(checked) => setShowSearch(checked === true)}
        />
        <Label htmlFor="showSearch" className="cursor-pointer">
          Mostrar en búsqueda
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="isComparable"
          checked={isComparable}
          onCheckedChange={(checked) => setIsComparable(checked === true)}
        />
        <Label htmlFor="isComparable" className="cursor-pointer">
          Es comparable
        </Label>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando..." : "Crear Grupo"}
        </Button>
      </DialogFooter>
    </form>
  );
}

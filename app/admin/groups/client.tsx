"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { ChevronDown, ChevronRight, FolderTree, Plus } from "lucide-react";
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
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => {
    const groupIds = new Set(groups.map((group) => group.id));
    const parentIds = new Set<number>();

    for (const group of groups) {
      if (group.parentGroupId !== null && groupIds.has(group.parentGroupId)) {
        parentIds.add(group.parentGroupId);
      }
    }

    return parentIds;
  });

  const groupById = useMemo(
    () => new Map(groups.map((group) => [group.id, group])),
    [groups]
  );

  const childrenByParentId = useMemo(() => {
    const map = new Map<number | null, Group[]>();

    for (const group of groups) {
      const parentId =
        group.parentGroupId !== null && groupById.has(group.parentGroupId)
          ? group.parentGroupId
          : null;
      const entry = map.get(parentId);

      if (entry) {
        entry.push(group);
      } else {
        map.set(parentId, [group]);
      }
    }

    for (const entry of map.values()) {
      entry.sort((a, b) => a.name.localeCompare(b.name));
    }

    return map;
  }, [groups, groupById]);

  const childCountById = useMemo(() => {
    const counts = new Map<number, number>();

    for (const [parentId, children] of childrenByParentId) {
      if (parentId !== null) {
        counts.set(parentId, children.length);
      }
    }

    return counts;
  }, [childrenByParentId]);

  // Get the selected parent group
  const selectedParent = selectedParentId
    ? groupById.get(selectedParentId) ?? null
    : null;

  const getAncestorIds = useCallback(
    (groupId: number): number[] => {
      const ancestors: number[] = [];
      const visited = new Set<number>();
      let currentId: number | null = groupId;

      while (currentId !== null && !visited.has(currentId)) {
        visited.add(currentId);
        const group = groupById.get(currentId);

        if (group && group.parentGroupId !== null) {
          ancestors.push(group.parentGroupId);
          currentId = group.parentGroupId;
        } else {
          break;
        }
      }

      return ancestors;
    },
    [groupById]
  );

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

  const leftSearchValue = leftSearch.trim().toLowerCase();
  const isLeftSearchActive = leftSearchValue.length > 0;
  const visibleGroupIds = useMemo(() => {
    if (!isLeftSearchActive) {
      return null;
    }

    const visibleIds = new Set<number>();

    for (const group of groups) {
      if (group.name.toLowerCase().includes(leftSearchValue)) {
        visibleIds.add(group.id);
        for (const ancestorId of getAncestorIds(group.id)) {
          visibleIds.add(ancestorId);
        }
      }
    }

    return visibleIds;
  }, [groups, getAncestorIds, isLeftSearchActive, leftSearchValue]);

  const handleSelectParent = useCallback(
    (value: string) => {
      const nextId = Number(value);
      if (!Number.isFinite(nextId)) {
        setSelectedParentId(null);
        return;
      }

      setSelectedParentId(nextId);
      const ancestorIds = getAncestorIds(nextId);

      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(nextId);
        for (const ancestorId of ancestorIds) {
          next.add(ancestorId);
        }
        return next;
      });
    },
    [getAncestorIds]
  );

  const toggleExpanded = useCallback((groupId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

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

  function renderTreeRows(
    parentId: number | null,
    depth: number,
    visited: Set<number>
  ): ReactNode[] {
    const rows: ReactNode[] = [];
    const children = childrenByParentId.get(parentId) ?? [];

    for (const group of children) {
      if (visited.has(group.id)) {
        continue;
      }

      if (visibleGroupIds && !visibleGroupIds.has(group.id)) {
        continue;
      }

      visited.add(group.id);
      const childGroups = childrenByParentId.get(group.id) ?? [];
      const hasChildren = childGroups.length > 0;
      const isExpanded = isLeftSearchActive ? true : expandedIds.has(group.id);
      const isSelected = selectedParentId === group.id;
      const childCount = childCountById.get(group.id) ?? 0;

      rows.push(
        <div
          key={group.id}
          className={cn(
            "rounded-md px-2 py-1.5 transition-colors",
            isSelected ? "bg-primary/10" : "hover:bg-muted"
          )}
        >
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: depth * 16 }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toggleExpanded(group.id);
                }}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted"
                aria-label={
                  isExpanded ? "Contraer hijos" : "Expandir hijos"
                }
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="h-5 w-5" />
            )}
            <RadioGroupItem
              id={`parent-${group.id}`}
              value={String(group.id)}
            />
            <Label
              htmlFor={`parent-${group.id}`}
              className="flex-1 min-w-0 cursor-pointer"
            >
              <span className="truncate">{group.name}</span>
              {childCount > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {childCount} hijos
                </span>
              )}
            </Label>
          </div>
        </div>
      );

      if (hasChildren && isExpanded) {
        rows.push(...renderTreeRows(group.id, depth + 1, visited));
      }
    }

    return rows;
  }

  const treeRows = renderTreeRows(null, 0, new Set<number>());

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
              <h3 className="font-semibold mb-2">
                Mapa de grupos y subgrupos
              </h3>
              <Input
                placeholder="Buscar grupo..."
                value={leftSearch}
                onChange={(e) => setLeftSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="flex-1 h-[400px]">
              <div className="p-2">
                {treeRows.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No se encontraron grupos
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedParentId ? String(selectedParentId) : undefined}
                    onValueChange={handleSelectParent}
                    className="gap-1"
                  >
                    {treeRows}
                  </RadioGroup>
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
                      <div
                        key={group.id}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3",
                          isChild ? "bg-primary/10" : "hover:bg-muted",
                          isPending && "opacity-50"
                        )}
                      >
                        <Checkbox
                          id={`child-${group.id}`}
                          checked={isChild}
                          disabled={isPending}
                          onCheckedChange={(checked) => {
                            if (!selectedParentId) {
                              return;
                            }

                            const shouldBeChild = checked === true;
                            if (shouldBeChild === isChild) {
                              return;
                            }

                            toggleChildGroup(group.id, isChild);
                          }}
                        />
                        <Label
                          htmlFor={`child-${group.id}`}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <span className="font-medium">{group.name}</span>
                          {currentParent && !isChild && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (padre actual: {currentParent.name})
                            </span>
                          )}
                        </Label>
                      </div>
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

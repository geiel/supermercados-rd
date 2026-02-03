"use client";

import { useMemo, useState, useTransition } from "react";
import { Layers, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Category = {
  id: number;
  name: string;
  humanNameId: string;
  icon: string | null;
};

type Group = {
  id: number;
  name: string;
  parentGroupId: number | null;
};

type CategoryGroup = {
  categoryId: number;
  groupId: number;
};

type CategoriesManagerProps = {
  categories: Category[];
  groups: Group[];
  categoryGroups: CategoryGroup[];
  createCategory: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  toggleCategoryGroup: (
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

export function CategoriesManager({
  categories,
  groups,
  categoryGroups,
  createCategory,
  toggleCategoryGroup,
}: CategoriesManagerProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const groupIdsByCategory = useMemo(() => {
    const map = new Map<number, Set<number>>();

    for (const entry of categoryGroups) {
      const existing = map.get(entry.categoryId);
      if (existing) {
        existing.add(entry.groupId);
      } else {
        map.set(entry.categoryId, new Set([entry.groupId]));
      }
    }

    return map;
  }, [categoryGroups]);

  const groupCountByCategory = useMemo(() => {
    const counts = new Map<number, number>();

    for (const [categoryId, groupIds] of groupIdsByCategory) {
      counts.set(categoryId, groupIds.size);
    }

    return counts;
  }, [groupIdsByCategory]);

  const selectedCategory = selectedCategoryId
    ? categoryById.get(selectedCategoryId) ?? null
    : null;

  const selectedGroupIds = selectedCategoryId
    ? groupIdsByCategory.get(selectedCategoryId) ?? new Set<number>()
    : new Set<number>();

  const leftFilteredCategories = leftSearch.trim()
    ? categories.filter((category) =>
        category.name.toLowerCase().includes(leftSearch.toLowerCase())
      )
    : categories;

  const rightFilteredGroups = rightSearch.trim()
    ? groups.filter((group) =>
        group.name.toLowerCase().includes(rightSearch.toLowerCase())
      )
    : groups;

  async function handleCreateCategory(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCategory(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setCreateDialogOpen(false);
      }
    });
  }

  async function handleToggleGroup(groupId: number, assign: boolean) {
    if (!selectedCategoryId) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("categoryId", String(selectedCategoryId));
      formData.set("groupId", String(groupId));
      formData.set("assign", assign ? "true" : "false");

      await toggleCategoryGroup(formData);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Categoría</DialogTitle>
              <DialogDescription>
                Crea una categoría para organizar grupos.
              </DialogDescription>
            </DialogHeader>
            <CreateCategoryForm
              onSubmit={handleCreateCategory}
              isPending={isPending}
              error={error}
            />
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <Layers className="h-10 w-10 text-muted-foreground" />
            <EmptyTitle>No hay categorías</EmptyTitle>
            <EmptyDescription>
              Crea una categoría para comenzar a agrupar los grupos.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 min-h-[500px]">
          <div className="flex flex-col border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold mb-2">Seleccionar categoría</h3>
              <Input
                placeholder="Buscar categoría..."
                value={leftSearch}
                onChange={(event) => setLeftSearch(event.target.value)}
              />
            </div>
            <ScrollArea className="flex-1 h-[400px]">
              <div className="p-2">
                {leftFilteredCategories.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No se encontraron categorías
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedCategoryId ? String(selectedCategoryId) : undefined}
                    onValueChange={(value) =>
                      setSelectedCategoryId(Number(value))
                    }
                    className="gap-1"
                  >
                    {leftFilteredCategories.map((category) => {
                      const groupCount =
                        groupCountByCategory.get(category.id) ?? 0;

                      return (
                        <div
                          key={category.id}
                          className={cn(
                            "rounded-md px-3 py-2 transition-colors",
                            selectedCategoryId === category.id
                              ? "bg-primary/10"
                              : "hover:bg-muted"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem
                              id={`category-${category.id}`}
                              value={String(category.id)}
                            />
                            <Label
                              htmlFor={`category-${category.id}`}
                              className="flex-1 min-w-0 cursor-pointer"
                            >
                              <span className="truncate">{category.name}</span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {groupCount} grupos
                              </span>
                            </Label>
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold mb-2">
                {selectedCategory
                  ? `Grupos en "${selectedCategory.name}"`
                  : "Selecciona una categoría"}
              </h3>
              <Input
                placeholder="Buscar grupo..."
                value={rightSearch}
                onChange={(event) => setRightSearch(event.target.value)}
                disabled={!selectedCategory}
              />
            </div>
            <ScrollArea className="flex-1 h-[400px]">
              <div className="p-2">
                {!selectedCategory ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Selecciona una categoría a la izquierda
                  </div>
                ) : rightFilteredGroups.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No hay grupos disponibles
                  </div>
                ) : (
                  rightFilteredGroups.map((group) => {
                    const isAssigned = selectedGroupIds.has(group.id);

                    return (
                      <div
                        key={group.id}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3",
                          isAssigned ? "bg-primary/10" : "hover:bg-muted",
                          isPending && "opacity-50"
                        )}
                      >
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={isAssigned}
                          disabled={isPending}
                          onCheckedChange={(checked) => {
                            const shouldAssign = checked === true;
                            if (shouldAssign === isAssigned) {
                              return;
                            }

                            handleToggleGroup(group.id, shouldAssign);
                          }}
                        />
                        <Label
                          htmlFor={`group-${group.id}`}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <span className="font-medium">{group.name}</span>
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

type CreateCategoryFormProps = {
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
};

function CreateCategoryForm({
  onSubmit,
  isPending,
  error,
}: CreateCategoryFormProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("name", name);
    formData.set("icon", icon);
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
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej: Hogar"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="icon">Icono</Label>
        <Input
          id="icon"
          value={icon}
          onChange={(event) => setIcon(event.target.value)}
          placeholder="Ej: home"
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando..." : "Crear Categoría"}
        </Button>
      </DialogFooter>
    </form>
  );
}

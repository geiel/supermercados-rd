"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MainCategory = {
  id: number;
  name: string;
  description: string | null;
  humanNameId: string;
  imageUrl: string | null;
};

type SubCategory = {
  id: number;
  name: string;
  description: string | null;
  humanNameId: string;
  mainCategoryId: number;
  imageUrl: string | null;
};

type Group = {
  id: number;
  name: string;
  humanNameId: string;
  description: string | null;
  parentGroupId: number | null;
};

type SubCategoryGroup = {
  subCategoryId: number;
  groupId: number;
};

type CategoryManagerProps = {
  initialMainCategories: MainCategory[];
  initialSubCategories: SubCategory[];
  initialGroups: Group[];
  initialAssignments: SubCategoryGroup[];
};

const emptyList = (
  <Empty>
    <EmptyHeader>
      <EmptyTitle>Sin resultados</EmptyTitle>
      <EmptyDescription>
        Ajusta tu busqueda o crea un elemento nuevo.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function CategoryManager({
  initialMainCategories,
  initialSubCategories,
  initialGroups,
  initialAssignments,
}: CategoryManagerProps) {
  const [mainCategories, setMainCategories] =
    useState<MainCategory[]>(initialMainCategories);
  const [subCategories, setSubCategories] =
    useState<SubCategory[]>(initialSubCategories);
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [assignments, setAssignments] =
    useState<SubCategoryGroup[]>(initialAssignments);

  const [categorySearch, setCategorySearch] = useState("");
  const [subCategorySearch, setSubCategorySearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [parentGroupSearch, setParentGroupSearch] = useState("");
  const [childGroupSearch, setChildGroupSearch] = useState("");

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    initialMainCategories[0]?.id ?? null
  );
  const [selectedSubCategoryId, setSelectedSubCategoryId] =
    useState<number | null>(() => {
      const initialCategoryId = initialMainCategories[0]?.id;
      if (!initialCategoryId) return null;
      const initialSub = initialSubCategories.find(
        (subCategory) => subCategory.mainCategoryId === initialCategoryId
      );
      return initialSub?.id ?? null;
    });
  const [selectedParentGroupId, setSelectedParentGroupId] = useState<
    number | null
  >(initialGroups[0]?.id ?? null);

  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    imageUrl: "",
  });
  const [newSubCategory, setNewSubCategory] = useState({
    name: "",
    description: "",
    imageUrl: "",
  });

  const [categoryDraft, setCategoryDraft] = useState({
    name: "",
    description: "",
    imageUrl: "",
  });
  const [subCategoryDraft, setSubCategoryDraft] = useState({
    name: "",
    description: "",
    imageUrl: "",
  });

  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [subCategoryError, setSubCategoryError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const selectedCategory = mainCategories.find(
      (category) => category.id === selectedCategoryId
    );
    if (!selectedCategory) {
      setCategoryDraft({ name: "", description: "", imageUrl: "" });
      return;
    }

    setCategoryDraft({
      name: selectedCategory.name,
      description: selectedCategory.description ?? "",
      imageUrl: selectedCategory.imageUrl ?? "",
    });
  }, [mainCategories, selectedCategoryId]);

  useEffect(() => {
    const availableSubCategories = subCategories.filter(
      (subCategory) => subCategory.mainCategoryId === selectedCategoryId
    );
    if (
      selectedSubCategoryId &&
      !availableSubCategories.some(
        (subCategory) => subCategory.id === selectedSubCategoryId
      )
    ) {
      setSelectedSubCategoryId(availableSubCategories[0]?.id ?? null);
    } else if (!selectedSubCategoryId && availableSubCategories.length > 0) {
      setSelectedSubCategoryId(availableSubCategories[0]?.id ?? null);
    }
  }, [selectedCategoryId, selectedSubCategoryId, subCategories]);

  useEffect(() => {
    const selectedSubCategory = subCategories.find(
      (subCategory) => subCategory.id === selectedSubCategoryId
    );
    if (!selectedSubCategory) {
      setSubCategoryDraft({ name: "", description: "", imageUrl: "" });
      return;
    }

    setSubCategoryDraft({
      name: selectedSubCategory.name,
      description: selectedSubCategory.description ?? "",
      imageUrl: selectedSubCategory.imageUrl ?? "",
    });
  }, [subCategories, selectedSubCategoryId]);

  const visibleCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return mainCategories;
    return mainCategories.filter((category) =>
      category.name.toLowerCase().includes(query)
    );
  }, [categorySearch, mainCategories]);

  const visibleSubCategories = useMemo(() => {
    const query = subCategorySearch.trim().toLowerCase();
    return subCategories.filter((subCategory) => {
      if (selectedCategoryId && subCategory.mainCategoryId !== selectedCategoryId)
        return false;
      if (!query) return true;
      return subCategory.name.toLowerCase().includes(query);
    });
  }, [selectedCategoryId, subCategories, subCategorySearch]);

  const visibleGroups = useMemo(() => {
    const query = groupSearch.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) =>
      group.name.toLowerCase().includes(query)
    );
  }, [groupSearch, groups]);

  const visibleParentGroups = useMemo(() => {
    const query = parentGroupSearch.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) =>
      group.name.toLowerCase().includes(query)
    );
  }, [groups, parentGroupSearch]);

  const visibleChildGroups = useMemo(() => {
    const query = childGroupSearch.trim().toLowerCase();
    return groups.filter((group) => {
      if (selectedParentGroupId && group.id === selectedParentGroupId) {
        return false;
      }
      if (!query) return true;
      return group.name.toLowerCase().includes(query);
    });
  }, [childGroupSearch, groups, selectedParentGroupId]);

  const selectedCategory = mainCategories.find(
    (category) => category.id === selectedCategoryId
  );
  const selectedSubCategory = subCategories.find(
    (subCategory) => subCategory.id === selectedSubCategoryId
  );

  const assignedGroupIds = useMemo(() => {
    if (!selectedSubCategoryId) return new Set<number>();
    return new Set(
      assignments
        .filter((assignment) => assignment.subCategoryId === selectedSubCategoryId)
        .map((assignment) => assignment.groupId)
    );
  }, [assignments, selectedSubCategoryId]);

  const selectedParentGroup = useMemo(() => {
    if (!selectedParentGroupId) return null;
    return groups.find((group) => group.id === selectedParentGroupId) ?? null;
  }, [groups, selectedParentGroupId]);

  const groupedTree = useMemo(() => {
    return mainCategories.map((category) => {
      const subCategoryItems = subCategories
        .filter((subCategory) => subCategory.mainCategoryId === category.id)
        .map((subCategory) => {
          const groupIds = assignments
            .filter((assignment) => assignment.subCategoryId === subCategory.id)
            .map((assignment) => assignment.groupId);
          return {
            ...subCategory,
            groups: groups.filter((group) => groupIds.includes(group.id)),
          };
        });
      return { ...category, subCategories: subCategoryItems };
    });
  }, [assignments, groups, mainCategories, subCategories]);

  const requestJson = async <T,>(
    url: string,
    options: RequestInit
  ): Promise<T> => {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? "Error inesperado");
    }

    return (await response.json()) as T;
  };

  const refreshCategoriesFromServer = async () => {
    const query = categorySearch.trim();
    const data = await requestJson<MainCategory[]>(
      `/api/admin/categories/main-categories?q=${encodeURIComponent(query)}`,
      { method: "GET" }
    );
    setMainCategories(data);
    if (data.length === 0) {
      setSelectedCategoryId(null);
    }
  };

  const refreshSubCategoriesFromServer = async () => {
    const query = subCategorySearch.trim();
    const mainCategoryId = selectedCategoryId ?? 0;
    const data = await requestJson<SubCategory[]>(
      `/api/admin/categories/sub-categories?mainCategoryId=${mainCategoryId}&q=${encodeURIComponent(
        query
      )}`,
      { method: "GET" }
    );
    setSubCategories((prev) => {
      const other = prev.filter(
        (subCategory) => subCategory.mainCategoryId !== mainCategoryId
      );
      return [...other, ...data];
    });
  };

  const handleCreateCategory = async () => {
    setCategoryError(null);
    if (!newCategory.name.trim()) {
      setCategoryError("El nombre es requerido.");
      return;
    }

    const payload = {
      name: newCategory.name.trim(),
      description: newCategory.description.trim() || null,
      imageUrl: newCategory.imageUrl.trim() || null,
      humanNameId: slugify(newCategory.name),
    };

    setIsLoading(true);
    try {
      const created = await requestJson<MainCategory>(
        "/api/admin/categories/main-categories",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
      setMainCategories((prev) => [...prev, created].sort(sortByName));
      setSelectedCategoryId(created.id);
      setNewCategory({ name: "", description: "", imageUrl: "" });
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory) return;

    setCategoryError(null);
    if (!categoryDraft.name.trim()) {
      setCategoryError("El nombre es requerido.");
      return;
    }

    const payload = {
      id: selectedCategory.id,
      name: categoryDraft.name.trim(),
      description: categoryDraft.description.trim() || null,
      imageUrl: categoryDraft.imageUrl.trim() || null,
    };

    const previous = [...mainCategories];
    const optimistic = mainCategories.map((category) =>
      category.id === selectedCategory.id
        ? {
            ...category,
            ...payload,
            description: payload.description,
            imageUrl: payload.imageUrl,
          }
        : category
    );

    setMainCategories(optimistic);
    setIsLoading(true);
    try {
      const updated = await requestJson<MainCategory>(
        "/api/admin/categories/main-categories",
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );
      setMainCategories((prev) =>
        prev.map((category) => (category.id === updated.id ? updated : category))
      );
    } catch (error) {
      setMainCategories(previous);
      setCategoryError(error instanceof Error ? error.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubCategory = async () => {
    setSubCategoryError(null);
    if (!selectedCategoryId) {
      setSubCategoryError("Selecciona una categoria primero.");
      return;
    }
    if (!newSubCategory.name.trim()) {
      setSubCategoryError("El nombre es requerido.");
      return;
    }

    const payload = {
      name: newSubCategory.name.trim(),
      description: newSubCategory.description.trim() || null,
      imageUrl: newSubCategory.imageUrl.trim() || null,
      mainCategoryId: selectedCategoryId,
      humanNameId: slugify(newSubCategory.name),
    };

    setIsLoading(true);
    try {
      const created = await requestJson<SubCategory>(
        "/api/admin/categories/sub-categories",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
      setSubCategories((prev) => [...prev, created].sort(sortByName));
      setSelectedSubCategoryId(created.id);
      setNewSubCategory({ name: "", description: "", imageUrl: "" });
    } catch (error) {
      setSubCategoryError(error instanceof Error ? error.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSubCategory = async () => {
    if (!selectedSubCategory) return;
    setSubCategoryError(null);

    if (!subCategoryDraft.name.trim()) {
      setSubCategoryError("El nombre es requerido.");
      return;
    }

    const payload = {
      id: selectedSubCategory.id,
      name: subCategoryDraft.name.trim(),
      description: subCategoryDraft.description.trim() || null,
      imageUrl: subCategoryDraft.imageUrl.trim() || null,
      mainCategoryId: selectedSubCategory.mainCategoryId,
    };

    const previous = [...subCategories];
    const optimistic = subCategories.map((subCategory) =>
      subCategory.id === selectedSubCategory.id
        ? { ...subCategory, ...payload }
        : subCategory
    );

    setSubCategories(optimistic);
    setIsLoading(true);
    try {
      const updated = await requestJson<SubCategory>(
        "/api/admin/categories/sub-categories",
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );
      setSubCategories((prev) =>
        prev.map((subCategory) =>
          subCategory.id === updated.id ? updated : subCategory
        )
      );
    } catch (error) {
      setSubCategories(previous);
      setSubCategoryError(error instanceof Error ? error.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleGroup = async (groupId: number, checked: boolean) => {
    if (!selectedSubCategoryId) return;
    setGroupError(null);

    const previous = [...assignments];
    const optimistic = checked
      ? [...assignments, { subCategoryId: selectedSubCategoryId, groupId }]
      : assignments.filter(
          (assignment) =>
            !(
              assignment.subCategoryId === selectedSubCategoryId &&
              assignment.groupId === groupId
            )
        );

    setAssignments(optimistic);
    try {
      await requestJson<{ ok: boolean }>(
        "/api/admin/categories/sub-category-groups",
        {
          method: checked ? "POST" : "DELETE",
          body: JSON.stringify({
            subCategoryId: selectedSubCategoryId,
            groupId,
          }),
        }
      );
    } catch (error) {
      setAssignments(previous);
      setGroupError(error instanceof Error ? error.message : "Error");
    }
  };

  const handleToggleChildGroup = async (
    groupId: number,
    checked: boolean
  ) => {
    if (!selectedParentGroupId) return;
    setGroupError(null);

    const previous = [...groups];
    const optimistic = groups.map((group) => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        parentGroupId: checked ? selectedParentGroupId : null,
      };
    });

    setGroups(optimistic);
    try {
      await requestJson<{ ok: boolean }>("/api/admin/groups/parent", {
        method: checked ? "POST" : "DELETE",
        body: JSON.stringify({
          parentGroupId: selectedParentGroupId,
          childGroupId: groupId,
        }),
      });
    } catch (error) {
      setGroups(previous);
      setGroupError(error instanceof Error ? error.message : "Error");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1.2fr_1.6fr]">
      <Card className="min-h-[680px]">
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between">
            <CardTitle>Categorias</CardTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={refreshCategoriesFromServer}
              disabled={isLoading}
            >
              Buscar en servidor
            </Button>
          </div>
          <Input
            placeholder="Buscar categorias"
            value={categorySearch}
            onChange={(event) => setCategorySearch(event.target.value)}
          />
        </CardHeader>
        <CardContent className="flex h-full flex-col gap-4">
          <ScrollArea className="h-64 pr-2">
            {visibleCategories.length === 0 ? (
              emptyList
            ) : (
              <RadioGroup
                value={selectedCategoryId?.toString() ?? ""}
                onValueChange={(value) => setSelectedCategoryId(Number(value))}
                className="gap-2"
              >
                {visibleCategories.map((category) => (
                  <label
                    key={category.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                      selectedCategoryId === category.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    )}
                  >
                    <RadioGroupItem value={category.id.toString()} />
                    <div className="flex flex-1 flex-col">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {category.humanNameId}
                      </span>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            )}
          </ScrollArea>

          <Separator />

          <div className="space-y-3">
            <div className="text-sm font-semibold">Crear categoria</div>
            <div className="grid gap-2">
              <Label htmlFor="new-category-name">Nombre</Label>
              <Input
                id="new-category-name"
                value={newCategory.name}
                onChange={(event) =>
                  setNewCategory((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
              <Label htmlFor="new-category-description">Descripcion</Label>
              <Textarea
                id="new-category-description"
                value={newCategory.description}
                onChange={(event) =>
                  setNewCategory((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
              <Label htmlFor="new-category-image">Imagen URL</Label>
              <Input
                id="new-category-image"
                value={newCategory.imageUrl}
                onChange={(event) =>
                  setNewCategory((prev) => ({
                    ...prev,
                    imageUrl: event.target.value,
                  }))
                }
              />
              {categoryError ? (
                <p className="text-sm text-destructive">{categoryError}</p>
              ) : null}
              <Button onClick={handleCreateCategory} disabled={isLoading}>
                Crear categoria
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="text-sm font-semibold">Editar categoria</div>
            {selectedCategory ? (
              <div className="grid gap-2">
                <Label htmlFor="edit-category-name">Nombre</Label>
                <Input
                  id="edit-category-name"
                  value={categoryDraft.name}
                  onChange={(event) =>
                    setCategoryDraft((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
                <Label htmlFor="edit-category-description">Descripcion</Label>
                <Textarea
                  id="edit-category-description"
                  value={categoryDraft.description}
                  onChange={(event) =>
                    setCategoryDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
                <Label htmlFor="edit-category-image">Imagen URL</Label>
                <Input
                  id="edit-category-image"
                  value={categoryDraft.imageUrl}
                  onChange={(event) =>
                    setCategoryDraft((prev) => ({
                      ...prev,
                      imageUrl: event.target.value,
                    }))
                  }
                />
                {categoryError ? (
                  <p className="text-sm text-destructive">{categoryError}</p>
                ) : null}
                <Button
                  variant="secondary"
                  onClick={handleUpdateCategory}
                  disabled={isLoading}
                >
                  Guardar cambios
                </Button>
              </div>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Sin categoria seleccionada</EmptyTitle>
                  <EmptyDescription>
                    Selecciona una categoria para editar sus datos.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-[680px]">
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between">
            <CardTitle>Subcategorias</CardTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={refreshSubCategoriesFromServer}
              disabled={isLoading || !selectedCategoryId}
            >
              Buscar en servidor
            </Button>
          </div>
          <Input
            placeholder="Buscar subcategorias"
            value={subCategorySearch}
            onChange={(event) => setSubCategorySearch(event.target.value)}
          />
        </CardHeader>
        <CardContent className="flex h-full flex-col gap-4">
          <ScrollArea className="h-64 pr-2">
            {visibleSubCategories.length === 0 ? (
              emptyList
            ) : (
              <RadioGroup
                value={selectedSubCategoryId?.toString() ?? ""}
                onValueChange={(value) =>
                  setSelectedSubCategoryId(Number(value))
                }
                className="gap-2"
              >
                {visibleSubCategories.map((subCategory) => (
                  <label
                    key={subCategory.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                      selectedSubCategoryId === subCategory.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    )}
                  >
                    <RadioGroupItem value={subCategory.id.toString()} />
                    <div className="flex flex-1 flex-col">
                      <span className="font-medium">{subCategory.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {subCategory.humanNameId}
                      </span>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            )}
          </ScrollArea>

          <Separator />

          <div className="space-y-3">
            <div className="text-sm font-semibold">Crear subcategoria</div>
            <div className="grid gap-2">
              <Label htmlFor="new-sub-category-name">Nombre</Label>
              <Input
                id="new-sub-category-name"
                value={newSubCategory.name}
                onChange={(event) =>
                  setNewSubCategory((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                disabled={!selectedCategoryId}
              />
              <Label htmlFor="new-sub-category-description">Descripcion</Label>
              <Textarea
                id="new-sub-category-description"
                value={newSubCategory.description}
                onChange={(event) =>
                  setNewSubCategory((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                disabled={!selectedCategoryId}
              />
              <Label htmlFor="new-sub-category-image">Imagen URL</Label>
              <Input
                id="new-sub-category-image"
                value={newSubCategory.imageUrl}
                onChange={(event) =>
                  setNewSubCategory((prev) => ({
                    ...prev,
                    imageUrl: event.target.value,
                  }))
                }
                disabled={!selectedCategoryId}
              />
              {subCategoryError ? (
                <p className="text-sm text-destructive">{subCategoryError}</p>
              ) : null}
              <Button
                onClick={handleCreateSubCategory}
                disabled={isLoading || !selectedCategoryId}
              >
                Crear subcategoria
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="text-sm font-semibold">Editar subcategoria</div>
            {selectedSubCategory ? (
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-category-name">Nombre</Label>
                <Input
                  id="edit-sub-category-name"
                  value={subCategoryDraft.name}
                  onChange={(event) =>
                    setSubCategoryDraft((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
                <Label htmlFor="edit-sub-category-description">Descripcion</Label>
                <Textarea
                  id="edit-sub-category-description"
                  value={subCategoryDraft.description}
                  onChange={(event) =>
                    setSubCategoryDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
                <Label htmlFor="edit-sub-category-image">Imagen URL</Label>
                <Input
                  id="edit-sub-category-image"
                  value={subCategoryDraft.imageUrl}
                  onChange={(event) =>
                    setSubCategoryDraft((prev) => ({
                      ...prev,
                      imageUrl: event.target.value,
                    }))
                  }
                />
                {subCategoryError ? (
                  <p className="text-sm text-destructive">{subCategoryError}</p>
                ) : null}
                <Button
                  variant="secondary"
                  onClick={handleUpdateSubCategory}
                  disabled={isLoading}
                >
                  Guardar cambios
                </Button>
              </div>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Sin subcategoria seleccionada</EmptyTitle>
                  <EmptyDescription>
                    Selecciona una subcategoria para editar sus datos.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-[680px]">
        <CardHeader>
          <CardTitle>Asignar grupos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="assignments" className="space-y-4">
            <TabsList>
              <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
            <TabsTrigger value="tree">Vista jerarquica</TabsTrigger>
            <TabsTrigger value="group-links">Grupos</TabsTrigger>
            </TabsList>
            <TabsContent value="assignments" className="space-y-4">
              {!selectedSubCategory ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Selecciona una subcategoria</EmptyTitle>
                    <EmptyDescription>
                      Necesitas una subcategoria para asignar grupos.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">
                      {selectedCategory?.name ?? "Sin categoria"}
                    </Badge>
                    <span>→</span>
                    <Badge>{selectedSubCategory.name}</Badge>
                  </div>
                  <Input
                    placeholder="Buscar grupos"
                    value={groupSearch}
                    onChange={(event) => setGroupSearch(event.target.value)}
                  />
                  {groupError ? (
                    <p className="text-sm text-destructive">{groupError}</p>
                  ) : null}
                  <ScrollArea className="h-[420px] pr-2">
                    {visibleGroups.length === 0 ? (
                      emptyList
                    ) : (
                      <div className="space-y-2">
                        {visibleGroups.map((group) => {
                          const isChecked = assignedGroupIds.has(group.id);
                          return (
                            <label
                              key={group.id}
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                                isChecked
                                  ? "border-primary bg-primary/5"
                                  : "hover:bg-muted"
                              )}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(value) =>
                                  handleToggleGroup(group.id, Boolean(value))
                                }
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{group.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {group.humanNameId}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
            <TabsContent value="tree" className="space-y-4">
              <ScrollArea className="h-[560px] pr-2">
                {groupedTree.length === 0 ? (
                  emptyList
                ) : (
                  <div className="space-y-4">
                    {groupedTree.map((category) => (
                      <div key={category.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">
                            {category.name}
                          </div>
                          <Badge variant="secondary">
                            {category.subCategories.length} subcategorias
                          </Badge>
                        </div>
                        <div className="mt-3 space-y-3">
                          {category.subCategories.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Sin subcategorias asignadas.
                            </p>
                          ) : (
                            category.subCategories.map((subCategory) => (
                              <div
                                key={subCategory.id}
                                className="rounded-md border bg-muted/30 p-3"
                              >
                                <div className="text-sm font-medium">
                                  {subCategory.name}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                  {subCategory.groups.length === 0 ? (
                                    <span className="text-muted-foreground">
                                      Sin grupos.
                                    </span>
                                  ) : (
                                    subCategory.groups.map((group) => (
                                      <Badge
                                        key={group.id}
                                        variant="outline"
                                      >
                                        {group.name}
                                      </Badge>
                                    ))
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="group-links" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="text-sm font-semibold">
                    Grupo padre (seleccion unica)
                  </div>
                  <Input
                    placeholder="Buscar grupo padre"
                    value={parentGroupSearch}
                    onChange={(event) => setParentGroupSearch(event.target.value)}
                  />
                  <ScrollArea className="h-[380px] pr-2">
                    {visibleParentGroups.length === 0 ? (
                      emptyList
                    ) : (
                      <RadioGroup
                        value={selectedParentGroupId?.toString() ?? ""}
                        onValueChange={(value) =>
                          setSelectedParentGroupId(Number(value))
                        }
                        className="gap-2"
                      >
                        {visibleParentGroups.map((group) => (
                          <label
                            key={group.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                              selectedParentGroupId === group.id
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted"
                            )}
                          >
                            <RadioGroupItem value={group.id.toString()} />
                            <div className="flex flex-col">
                              <span className="font-medium">{group.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {group.humanNameId}
                              </span>
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    )}
                  </ScrollArea>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-semibold">
                    Grupos hijos (seleccion multiple)
                  </div>
                  <Input
                    placeholder="Buscar grupos hijos"
                    value={childGroupSearch}
                    onChange={(event) => setChildGroupSearch(event.target.value)}
                  />
                  {groupError ? (
                    <p className="text-sm text-destructive">{groupError}</p>
                  ) : null}
                  {!selectedParentGroup ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>Selecciona un grupo padre</EmptyTitle>
                        <EmptyDescription>
                          Elige un grupo para asignar sus grupos hijos.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <ScrollArea className="h-[380px] pr-2">
                      {visibleChildGroups.length === 0 ? (
                        emptyList
                      ) : (
                        <div className="space-y-2">
                          {visibleChildGroups.map((group) => {
                            const isChecked =
                              group.parentGroupId === selectedParentGroup.id;
                            return (
                              <label
                                key={group.id}
                                className={cn(
                                  "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                                  isChecked
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-muted"
                                )}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(value) =>
                                    handleToggleChildGroup(
                                      group.id,
                                      Boolean(value)
                                    )
                                  }
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {group.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {group.humanNameId}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function sortByName<T extends { name: string }>(a: T, b: T) {
  return a.name.localeCompare(b.name);
}

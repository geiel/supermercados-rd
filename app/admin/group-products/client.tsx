"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/combobox";
import { Button } from "@/components/ui/button";

type GroupOption = {
  id: number;
  name: string;
  description: string | null;
};

type GroupProductsToolbarProps = {
  groups: GroupOption[];
  initialValue: string;
  initialGroupId?: number;
  initialMultiTree?: boolean;
  createGroup: (formData: FormData) => void;
};

export function GroupProductsToolbar({
  groups,
  initialValue,
  initialGroupId,
  initialMultiTree,
  createGroup,
}: GroupProductsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const [groupId, setGroupId] = useState<string | undefined>(
    initialGroupId ? String(initialGroupId) : undefined
  );
  const [multiTreeOnly, setMultiTreeOnly] = useState(
    initialMultiTree ?? false
  );

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    setGroupId(initialGroupId ? String(initialGroupId) : undefined);
  }, [initialGroupId]);

  useEffect(() => {
    setMultiTreeOnly(initialMultiTree ?? false);
  }, [initialMultiTree]);

  function updateParams({
    value: nextValue,
    groupId: nextGroupId,
    multiTree: nextMultiTree,
    resetPage,
  }: {
    value?: string;
    groupId?: string;
    multiTree?: boolean;
    resetPage?: boolean;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    if (typeof nextValue !== "undefined") {
      const trimmed = nextValue.trim();
      if (trimmed) {
        params.set("value", trimmed);
      } else {
        params.delete("value");
      }
    }

    if (typeof nextGroupId !== "undefined") {
      if (nextGroupId) {
        params.set("groupId", nextGroupId);
      } else {
        params.delete("groupId");
      }
    }

    if (typeof nextMultiTree !== "undefined") {
      if (nextMultiTree) {
        params.set("multi_tree", "1");
      } else {
        params.delete("multi_tree");
      }
    }

    if (resetPage) {
      params.delete("page");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleSearch() {
    updateParams({
      value,
      groupId,
      multiTree: multiTreeOnly,
      resetPage: true,
    });
  }

  function handleMultiTreeToggle() {
    const nextValue = !multiTreeOnly;
    setMultiTreeOnly(nextValue);
    updateParams({
      value,
      groupId,
      multiTree: nextValue,
      resetPage: true,
    });
  }

  const groupOptions = groups.map((group) => ({
    value: group.id.toString(),
    label: group.name,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar..."
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearch();
              }
            }}
          />
        </div>
        <div className="w-full md:w-[240px]">
          <Combobox
            options={groupOptions}
            placeholder="Grupo"
            emptyMessage="Grupo no encontrado"
            value={groupId}
            className="w-full justify-between"
            contentClassName="w-[--radix-popover-trigger-width]"
            onValueChange={(option) => {
              setGroupId(option.value);
              updateParams({ groupId: option.value });
            }}
          />
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          <Button
            type="button"
            variant={multiTreeOnly ? "secondary" : "outline"}
            className="w-full md:w-auto"
            onClick={handleMultiTreeToggle}
          >
            {multiTreeOnly
              ? "Quitar filtro multi-categor\u00eda"
              : "Buscar multi-categor\u00eda"}
          </Button>
        </div>
      </div>
      <form
        action={createGroup}
        className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
      >
        <Input
          name="groupName"
          placeholder="Nuevo grupo"
          aria-label="Nuevo grupo"
          required
        />
        <input
          type="hidden"
          name="returnParams"
          value={searchParams.toString()}
        />
        <Button type="submit" size="sm" className="sm:w-auto">
          Crear grupo
        </Button>
      </form>
    </div>
  );
}

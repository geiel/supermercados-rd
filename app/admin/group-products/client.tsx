"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/combobox";

type GroupOption = {
  id: number;
  name: string;
  description: string | null;
};

type GroupProductsToolbarProps = {
  groups: GroupOption[];
  initialValue: string;
  initialGroupId?: number;
};

export function GroupProductsToolbar({
  groups,
  initialValue,
  initialGroupId,
}: GroupProductsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const [groupId, setGroupId] = useState<string | undefined>(
    initialGroupId ? String(initialGroupId) : undefined
  );

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    setGroupId(initialGroupId ? String(initialGroupId) : undefined);
  }, [initialGroupId]);

  function updateParams(nextValue?: string, nextGroupId?: string) {
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

    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleSearch() {
    updateParams(value, groupId);
  }

  const groupOptions = groups.map((group) => ({
    value: group.id.toString(),
    label: group.name,
  }));

  return (
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
            updateParams(undefined, option.value);
          }}
        />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { AutoComplete } from "./autocomplete";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

type SearchBarProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoFocus?: boolean;
};

export function SearchBar({ open, onOpenChange, autoFocus }: SearchBarProps) {
  const [value, setValue] = useState("");
  const router = useRouter();
  const params = useParams<{ value?: string }>();
  let searchValue = "";

  if (params.value) {
    searchValue = decodeURIComponent(
      params.value.replace(/%(?![0-9A-Fa-f]{2})/g, "%25")
    );
  }

  const shouldFetch = value.length >= 2;
  const { data } = useQuery({
    queryKey: ["suggestions", value],
    enabled: shouldFetch,
    queryFn: async () => {
      const response = await fetch(`/api/suggestions?value=${value}`);

      return z
        .array(z.object({
          phrase: z.string(),
          sml: z.number(),
          groupId: z.number().nullable(),
          groupName: z.string().nullable(),
          groupHumanId: z.string().nullable(),
          parentGroupName: z.string().nullable(),
        }))
        .parse(await response.json());
    },
    placeholderData: shouldFetch ? keepPreviousData : undefined,
  });

  function explore(value: string, groupHumanId?: string | null) {
    if (!value) return;

    if (groupHumanId) {
      router.push(`/grupos/${groupHumanId}`);
    } else {
      router.push(`/explorar/${encodeURIComponent(value)}`);
    }
  }

  return (
    <AutoComplete
      suggestions={data ? data : []}
      placeholder="¿Qué quieres comprar hoy?"
      emptyMessage="No encontrado."
      onInputChange={setValue}
      onSearch={explore}
      productName={searchValue}
      open={open}
      onOpenChange={onOpenChange}
      autoFocus={autoFocus}
    />
  );
}

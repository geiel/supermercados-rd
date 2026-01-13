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

  const shouldFetch = Boolean(value);
  const { data } = useQuery({
    queryKey: ["suggestions", value],
    enabled: shouldFetch,
    queryFn: async () => {
      const response = await fetch(`/api/suggestions?value=${value}`);

      return z
        .array(z.object({ phrase: z.string(), sml: z.number() }))
        .parse(await response.json());
    },
    placeholderData: shouldFetch ? keepPreviousData : undefined,
  });

  function explore(value: string) {
    if (!value) return;

    router.push(`/explore/${encodeURIComponent(value)}`);
  }

  return (
    <AutoComplete
      suggestions={data ? data : []}
      placeholder="Buscar..."
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

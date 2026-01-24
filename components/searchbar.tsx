"use client";

import { useState } from "react";
import { AutoComplete } from "./autocomplete";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@tanstack/react-pacer";

type SearchBarProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoFocus?: boolean;
};

export function SearchBar({ open, onOpenChange, autoFocus }: SearchBarProps) {
  const [value, setValue] = useState("");
  const [debouncedValue] = useDebouncedValue(value, { wait: 300 });
  const router = useRouter();
  const params = useParams<{ value?: string }>();
  let searchValue = "";

  if (params.value) {
    searchValue = decodeURIComponent(
      params.value.replace(/%(?![0-9A-Fa-f]{2})/g, "%25")
    );
  }

  const shouldFetch = debouncedValue.length >= 2;
  const { data } = useQuery({
    queryKey: ["suggestions", debouncedValue],
    enabled: shouldFetch,
    queryFn: async () => {
      const response = await fetch(`/api/suggestions?value=${debouncedValue}`);

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

"use client";

import { useState } from "react";
import { AutoComplete } from "./autocomplete";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";

export function SearchBar() {
  const [value, setValue] = useState("");
  const router = useRouter();
  const params = useParams<{ value?: string }>();

  if (params.value) {
    params.value = decodeURIComponent(
      params.value.replace(/%(?![0-9A-Fa-f]{2})/g, "%25")
    );
  }

  const { data } = useSWR(
    value ? `/api/suggestions?value=${value}` : null,
    async (key) => {
      const response = await fetch(key);

      return z
        .array(z.object({ phrase: z.string() }))
        .parse(await response.json());
    }
  );

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
      productName={params.value}
    />
  );
}

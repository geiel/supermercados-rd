"use client";

import { useState } from "react";
import { AutoComplete } from "./autocomplete";
import { createSelectSchema } from "drizzle-zod";
import { products } from "@/db/schema";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";

export function SearchBar() {
  const [value, setValue] = useState("");
  const router = useRouter();
  const params = useParams<{ value?: string }>();

  if (params.value) {
    params.value = decodeURIComponent(params.value);
  }

  const { data } = useSWR(
    value ? `/api/suggestions?value=${value}` : null,
    async (key) => {
      const response = await fetch(key);

      return createSelectSchema(products)
        .array()
        .parse(await response.json());
    }
  );

  function explore(value: string) {
    if (!value) return;

    router.push(`/explore/${value}`);
  }

  return (
    <AutoComplete
      products={data ? data : []}
      placeholder="Buscar..."
      emptyMessage="No encontrado."
      onInputChange={setValue}
      onSearch={explore}
      productName={params.value}
    />
  );
}

"use client";

import { useState } from "react";
import { AutoComplete } from "./autocomplete";
import { createSelectSchema } from "drizzle-zod";
import { products } from "@/db/schema";
import useSWR from "swr";

export function SearchBar() {
  const [value, setValue] = useState("");

  const { data } = useSWR(
    value ? `/api/suggestions?value=${value}` : null,
    async (key) => {
      const response = await fetch(key);

      return createSelectSchema(products)
        .array()
        .parse(await response.json());
    }
  );

  return (
    <AutoComplete
      products={data ? data : []}
      placeholder="Buscar..."
      emptyMessage="No encontrado."
      onInputChange={setValue}
    />
  );
}

"use client"

import { createContext } from "react";
import useSWR, { KeyedMutator } from "swr";
import { createSelectSchema } from 'drizzle-zod';
import { listItems, listItemsSelect } from "@/db/schema";

const listItemsSchema = createSelectSchema(listItems);

export const ListContext = createContext<{ listItems: listItemsSelect[] | undefined, isLoading: boolean, mutate: KeyedMutator<listItemsSelect[]> }>({ listItems: undefined, isLoading: false, mutate: () => Promise.resolve([]) });

export default function ListItemsProvider({ children }: { children: React.ReactNode }) {
    const { data, mutate, isLoading } = useSWR('/api/user/lists/items', async (key) => {
        const response = await fetch(key, { credentials: 'include' });
        return listItemsSchema.array().parse(await response.json());
    })

    return <ListContext.Provider value={{ listItems: data, mutate, isLoading }}>{children}</ListContext.Provider>
}
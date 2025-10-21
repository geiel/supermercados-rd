"use client"

import { createContext } from "react";
import useSWR, { KeyedMutator } from "swr";
import { createSelectSchema } from 'drizzle-zod';
import { listItems, listItemsSelect } from "@/db/schema";

const listItemsSchema = createSelectSchema(listItems);

export const ListContext = createContext<{ listItems: listItemsSelect[] | undefined, mutate: KeyedMutator<listItemsSelect[]> }>({ listItems: undefined, mutate: () => Promise.resolve([]) });

export default function ListItemsProvider({ children }: { children: React.ReactNode }) {
    const { data, mutate } = useSWR('/api/user/lists/items', async (key) => {
        const response = await fetch(key, { credentials: 'include' });
        return listItemsSchema.array().parse(await response.json());
    })

    return <ListContext.Provider value={{ listItems: data, mutate }}>{children}</ListContext.Provider>
}
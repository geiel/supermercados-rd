"use client"

import { createContext } from "react";
import useSWR, { KeyedMutator } from "swr";
import { createSelectSchema } from 'drizzle-zod';
import { listGroupItems, listItems, listItemsSelect } from "@/db/schema";

const listItemsSchema = createSelectSchema(listItems);
const listGroupItemsSchema = createSelectSchema(listGroupItems);
type ListGroupItem = typeof listGroupItems.$inferSelect;

export const ListContext = createContext<{ listItems: listItemsSelect[] | undefined, isLoading: boolean, mutate: KeyedMutator<listItemsSelect[]> }>({ listItems: undefined, isLoading: false, mutate: () => Promise.resolve([]) });
export const ListGroupContext = createContext<{ listGroupItems: ListGroupItem[] | undefined, isLoading: boolean, mutate: KeyedMutator<ListGroupItem[]> }>({ listGroupItems: undefined, isLoading: false, mutate: () => Promise.resolve([]) });

export default function ListItemsProvider({ children }: { children: React.ReactNode }) {
    const { data, mutate, isLoading } = useSWR('/api/user/lists/items', async (key) => {
        const response = await fetch(key, { credentials: 'include' });
        return listItemsSchema.array().parse(await response.json());
    })

    const { data: listGroupItemsData, mutate: mutateGroupItems, isLoading: isLoadingGroupItems } = useSWR('/api/user/lists/groups', async (key) => {
        const response = await fetch(key, { credentials: 'include' });
        return listGroupItemsSchema.array().parse(await response.json());
    })

    return (
        <ListContext.Provider value={{ listItems: data, mutate, isLoading }}>
            <ListGroupContext.Provider value={{ listGroupItems: listGroupItemsData, mutate: mutateGroupItems, isLoading: isLoadingGroupItems }}>
                {children}
            </ListGroupContext.Provider>
        </ListContext.Provider>
    );
}

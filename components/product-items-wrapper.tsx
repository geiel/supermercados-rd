"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { ProductItems } from "./products-items";

// Context to share drawer state across multiple ProductItems instances
type DrawerStateContextValue = {
    openRowKey: string | null;
    setOpenRowKey: (key: string | null) => void;
};

const DrawerStateContext = createContext<DrawerStateContextValue | null>(null);

// Provider that wraps all ProductItems sections
type ProductItemsProviderProps = {
    children: ReactNode;
};

export function ProductItemsProvider({ children }: ProductItemsProviderProps) {
    const [openRowKey, setOpenRowKey] = useState<string | null>(null);

    return (
        <DrawerStateContext.Provider value={{ openRowKey, setOpenRowKey }}>
            {children}
        </DrawerStateContext.Provider>
    );
}

// Wrapper for individual ProductItems that uses the shared context
type ProductItemsWrapperProps = {
    items: Parameters<typeof ProductItems>[0]["items"];
};

export function ProductItemsWrapper({ items }: ProductItemsWrapperProps) {
    const context = useContext(DrawerStateContext);

    // If no provider, fall back to uncontrolled mode
    if (!context) {
        return <ProductItems items={items} />;
    }

    return (
        <ProductItems
            items={items}
            openRowKey={context.openRowKey}
            onOpenChange={context.setOpenRowKey}
        />
    );
}

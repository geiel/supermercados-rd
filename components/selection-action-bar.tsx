"use client"

import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { X, Layers, Plus } from "lucide-react"

interface SelectionActionBarProps {
  selectedCount: number
  onGroup: (addToGroup: boolean) => void
  onClear: () => void,
  addToGroup?: {
    groupName: string
  },
}

export function SelectionActionBar({ selectedCount, onGroup, onClear, addToGroup }: SelectionActionBarProps) {
  const isMobile = useIsMobile();
  if (selectedCount <= 1) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 shadow-lg shadow-black/20">
        {addToGroup ? (
          <span className="text-sm font-medium text-foreground">
            Agregar a grupo
          </span>
        ) : (
          <span className="text-sm font-medium text-foreground">
            {selectedCount} {selectedCount === 1 ? "producto seleccionado" : "productos seleccionados"}
          </span>
        )}
        <div className="h-4 w-px bg-border" />
        <Button onClick={() => onGroup(Boolean(addToGroup))} size="sm" className="rounded-full">
          {addToGroup ? (
            <>
              <Plus /> {addToGroup.groupName}
            </>
          ): (
            <>
              <Layers /> Agrupar productos
            </>
          )}
        </Button>
        {isMobile ? (
          <Button onClick={onClear} size="icon" variant="ghost" className="rounded-full">
            <X />
          </Button>
        ) : (
          <Button
            onClick={onClear}
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            <X />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  )
}

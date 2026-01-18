"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevancia" },
  { value: "lowest_price", label: "Precio más bajo" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function normalizeSort(value: string | null): SortValue {
  if (value === "lowest_price") {
    return "lowest_price";
  }

  return "relevance";
}

export function ExploreSortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const isMobile = useIsMobile();
  const [isSortOpen, setIsSortOpen] = useState(false);

  const value = normalizeSort(searchParams.get("sort"));
  const sortLabel = useMemo(() => {
    return SORT_OPTIONS.find((option) => option.value === value)?.label ?? "Relevancia";
  }, [value]);

  const handleChange = useCallback(
    (nextValue: SortValue) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextValue === "relevance") {
        params.delete("sort");
      } else {
        params.set("sort", nextValue);
      }

      params.delete("page");

      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  const handleSortChange = useCallback(
    (nextValue: SortValue) => {
      if (nextValue === value) {
        setIsSortOpen(false);
        return;
      }

      setIsSortOpen(false);
      handleChange(nextValue);
    },
    [handleChange, value]
  );

  const handleSelectChange = useCallback(
    (nextValue: string) => {
      if (nextValue === "relevance" || nextValue === "lowest_price") {
        handleSortChange(nextValue);
      }
    },
    [handleSortChange]
  );

  if (isMobile) {
    return (
      <Drawer open={isSortOpen} onOpenChange={setIsSortOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" disabled={isPending} aria-busy={isPending}>
            {isPending ? (
              <>
                <Spinner /> {sortLabel}
              </>
            ) : (
              <>
                {sortLabel} <ChevronDown />
              </>
            )}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Ordenar por</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <RadioGroup
              value={value}
              onValueChange={handleSelectChange}
              className="gap-0"
              disabled={isPending}
            >
              {SORT_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 py-2 cursor-pointer"
                  onClick={() => handleSortChange(option.value)}
                >
                  <RadioGroupItem
                    value={option.value}
                    disabled={isPending}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <span className="text-sm font-medium leading-none flex-1">
                    {option.label}
                  </span>
                </div>
              ))}
            </RadioGroup>
          </div>
          <DrawerFooter className="pt-0">
            <DrawerClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="min-w-[170px]" aria-label="Ordenar">
        <SelectValue placeholder="Ordenar" />
      </SelectTrigger>
      <SelectContent align="start">
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

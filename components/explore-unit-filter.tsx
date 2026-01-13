'use client';

import { useQuery } from "@tanstack/react-query";
import { useCallback, useTransition } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseUnitFilterParam, serializeUnitFilters } from "@/utils/unit-filter";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
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
} from "./ui/drawer";
import { Checkbox } from "./ui/checkbox";

type UnitOption = { label: string; value: string; count: number };

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as UnitOption[];
};

export function ExploreUnitFilter() {
  const params = useParams<{ value?: string }>();
  const searchValue = params?.value ? params.value : "";
  const shouldFetch = Boolean(searchValue);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const isMobile = useIsMobile();

  const selectedUnits = Array.from(
    new Set(parseUnitFilterParam(searchParams.get("unit_filter")))
  );

  const {
    data: unitsData,
    error,
    isPending: isUnitsPending,
  } = useQuery({
    queryKey: ["search-units", searchValue],
    enabled: shouldFetch,
    queryFn: () =>
      fetcher(`/api/search-units?value=${encodeURIComponent(searchValue)}`),
    refetchOnWindowFocus: false,
  });

  const updateUnits = useCallback(
    (nextUnits: string[]) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextUnits.length > 0) {
        params.set("unit_filter", serializeUnitFilters(nextUnits));
      } else {
        params.delete("unit_filter");
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

  const handleToggle = useCallback(
    (unit: string, checked: boolean | "indeterminate") => {
      const next = new Set(selectedUnits);
      const shouldSelect = checked === true || checked === "indeterminate";

      if (shouldSelect) {
        next.add(unit);
      } else {
        next.delete(unit);
      }

      updateUnits(Array.from(next));
    },
    [selectedUnits, updateUnits]
  );

  const isBusy = isUnitsPending || isPending;

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline" disabled={isBusy} aria-busy={isBusy}>
            {isBusy ? (
              <>
                <Spinner /> Unidades
              </>
            ) : (
              <>
                Unidades <ChevronDown />
              </>
            )}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filtrar por unidad</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-0">
            <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {unitsData?.map((option) => {
                const isChecked = selectedUnits.includes(option.value);

                return (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3 py-2 cursor-pointer"
                    onClick={() => handleToggle(option.value, !isChecked)}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={isPending}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm font-medium leading-none flex-1 truncate">
                      {option.label}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {option.count}
                    </span>
                  </div>
                );
              })}
              {error ? (
                <p className="text-sm text-destructive">
                  No se pudieron cargar las unidades.
                </p>
              ) : null}
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isBusy} aria-busy={isBusy}>
          {isBusy ? (
            <>
              <Spinner /> Unidades
            </>
          ) : (
            <>
              Unidades <ChevronDown />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-56">
        <DropdownMenuLabel>Filtrar por unidad</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {unitsData?.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedUnits.includes(option.value)}
            onCheckedChange={(value) => handleToggle(option.value, value)}
            disabled={isPending}
          >
            <span className="flex-1 truncate">{option.label}</span>
            <span className="text-muted-foreground">{option.count}</span>
          </DropdownMenuCheckboxItem>
        ))}
        {error ? (
          <p className="text-sm text-destructive px-2 py-1">
            No se pudieron cargar las unidades.
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

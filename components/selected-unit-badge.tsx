'use client';

import { useCallback, useMemo, useTransition } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { parseUnitFilterParam, serializeUnitFilters } from "@/utils/unit-filter";
import useSWR from "swr";

type UnitOption = { label: string; value: string };

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as UnitOption[];
};

export function SelectedUnitBadge() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ value?: string }>();
  const [, startTransition] = useTransition();

  const searchValue = params?.value ? params.value : "";

  const selectedUnits = Array.from(
    new Set(parseUnitFilterParam(searchParams.get("unit_filter")))
  );

  const { data: unitsData } = useSWR<UnitOption[]>(
    searchValue ? `/api/search-units?value=${encodeURIComponent(searchValue)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const unitsByValue = useMemo(() => {
    const map = new Map<string, string>();
    unitsData?.forEach((unit) => {
      map.set(unit.value, unit.label);
    });
    return map;
  }, [unitsData]);

  const buildHrefWithoutUnit = useCallback(
    (unit: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextUnits = selectedUnits.filter((u) => u !== unit);

      if (nextUnits.length > 0) {
        params.set("unit_filter", serializeUnitFilters(nextUnits));
      } else {
        params.delete("unit_filter");
      }

      params.set("page", "1");

      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams, selectedUnits]
  );

  const handleRemoveUnit = useCallback(
    (unit: string) => {
      startTransition(() => {
        router.push(buildHrefWithoutUnit(unit), { scroll: false });
      });
    },
    [buildHrefWithoutUnit, router, startTransition]
  );

  if (selectedUnits.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {selectedUnits.map((unit) => (
        <button
          key={unit}
          type="button"
          onClick={() => handleRemoveUnit(unit)}
          className="group flex items-center gap-2 rounded-full border border-muted-foreground/30 bg-muted/40 px-3 py-1 text-sm transition-colors hover:bg-muted-foreground/10"
          aria-label={`Quitar unidad ${unit} del filtro`}
        >
          <span className="max-w-[200px] truncate text-left">
            {unitsByValue.get(unit) ?? unit}
          </span>
          <X className="h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
        </button>
      ))}
    </div>
  );
}

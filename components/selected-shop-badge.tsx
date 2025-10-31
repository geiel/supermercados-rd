'use client';

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import type { shopsSelect } from "@/db/schema";

type SelectedShopBadgeProps = {
  shopIds?: number[];
  shops: shopsSelect[];
};

export function SelectedShopBadge({ shopIds, shops }: SelectedShopBadgeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const buildHref = useCallback(
    (shopId: number) => {
      const params = new URLSearchParams(searchParams.toString());

      const currentIds = params
        .get("shop_ids")
        ?.split(",")
        .map((value) => parseInt(value, 10))
        .filter((id) => !Number.isNaN(id));

      const nextIds = (currentIds ?? []).filter((id) => id !== shopId);

      if (nextIds.length > 0) {
        params.set("shop_ids", nextIds.join(","));
      } else {
        params.delete("shop_ids");
      }

      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams]
  );

  const handleRemove = useCallback(
    (shopId: number) => {
      startTransition(() => {
        router.push(buildHref(shopId), { scroll: false });
      });
    },
    [buildHref, router, startTransition]
  );

  if (!shopIds || shopIds.length === 0) {
    return null;
  }

  const selectedShops = shops.filter((shop) => shopIds.includes(shop.id));

  if (selectedShops.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {selectedShops.map((shop) => (
        <div
          key={shop.id}
          className="flex items-center gap-2 rounded-full border border-muted-foreground/30 bg-muted/40 px-3 py-1 text-sm"
        >
          <span>{shop.name}</span>
          <button
            type="button"
            onClick={() => handleRemove(shop.id)}
            className="rounded-full p-0.5 transition-colors hover:bg-muted-foreground/10"
            aria-label={`Quitar ${shop.name} del filtro`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

'use client';

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { ChevronDown } from "lucide-react";
import { shopsSelect } from "@/db/schema";
import { Spinner } from "./ui/spinner";
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

type ExploreShopFilterClientProps = {
  shops: shopsSelect[];
  selectedShopIds?: number[];
};

export function ExploreShopFilterClient({
  shops,
  selectedShopIds,
}: ExploreShopFilterClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const isMobile = useIsMobile();

  const buildHref = useCallback(
    (shopId: number, shouldSelect: boolean) => {
      const params = new URLSearchParams(searchParams.toString());

      const currentIds = params.get("shop_ids");
      const nextIds = currentIds
        ? currentIds
            .split(",")
            .map((value) => parseInt(value, 10))
            .filter((id) => !Number.isNaN(id))
        : [];

      if (shouldSelect) {
        if (!nextIds.includes(shopId)) {
          nextIds.push(shopId);
        }
      } else {
        const index = nextIds.indexOf(shopId);
        if (index !== -1) {
          nextIds.splice(index, 1);
        }
      }

      if (nextIds.length > 0) {
        params.set("shop_ids", nextIds.join(","));
      } else {
        params.delete("shop_ids");
      }

      params.delete("page");

      const query = params.toString();

      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams]
  );

  const handleCheckedChange = useCallback(
    (checked: boolean | "indeterminate", shopId: number) => {
      const shouldSelect = checked === true || checked === "indeterminate";

      startTransition(() => {
        router.push(buildHref(shopId, shouldSelect), { scroll: false });
      });
    },
    [buildHref, router, startTransition]
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline" disabled={isPending} aria-busy={isPending}>
            {isPending ? (
              <>
                <Spinner /> Supermercados
              </>
            ) : (
              <>
                Supermercados <ChevronDown />
              </>
            )}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filtrar por supermercados</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {shops.map((shop) => {
                const isChecked = selectedShopIds?.includes(shop.id) ?? false;

                return (
                  <div
                    key={shop.id}
                    className="flex items-center space-x-3 py-2 cursor-pointer"
                    onClick={() => handleCheckedChange(!isChecked, shop.id)}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={isPending}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm font-medium leading-none flex-1">
                      {shop.name}
                    </span>
                  </div>
                );
              })}
            </div>
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isPending} aria-busy={isPending}>
          {isPending ? (
            <>
              <Spinner /> Supermercados
            </>
          ) : (
            <>
              Supermercados <ChevronDown />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Filtrar por supermercados</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {shops.map((shop) => (
          <DropdownMenuCheckboxItem
            key={shop.id}
            checked={selectedShopIds?.includes(shop.id)}
            onCheckedChange={(value) => handleCheckedChange(value, shop.id)}
            disabled={isPending}
          >
            {shop.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

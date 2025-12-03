'use client';

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Toggle } from "./ui/toggle";
import { Store } from "lucide-react";

export function ExploreSupermarketToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const onlyShopProducts = searchParams.get("only_shop_products") === "true";

  const handleSupermarketToggle = useCallback(
    (pressed: boolean) => {
      const params = new URLSearchParams(searchParams.toString());

      if (pressed) {
        params.set("only_shop_products", "true");
      } else {
        params.delete("only_shop_products");
      }

      params.set("page", "1");

      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  return (
    <Toggle
      aria-label="Toggle supermarket brands"
      size="sm"
      variant="outline"
      className="py-[17px] data-[state=on]:*:[svg]:fill-blue-500 data-[state=on]:*:[svg]:stroke-black-500"
      pressed={onlyShopProducts}
      onPressedChange={handleSupermarketToggle}
    >
      <Store />
      Marcas de supermercados
    </Toggle>
  );
}

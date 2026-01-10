'use client';

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Toggle } from "./ui/toggle";
import { Store } from "lucide-react";
import { Spinner } from "./ui/spinner";

export function ExploreSupermarketToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onlyShopProducts = searchParams.get("only_shop_products") === "true";

  const handleSupermarketToggle = useCallback(
    (pressed: boolean) => {
      const params = new URLSearchParams(searchParams.toString());

      if (pressed) {
        params.set("only_shop_products", "true");
      } else {
        params.delete("only_shop_products");
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

  return (
    <>
      {isPending ? (
        <Toggle
          aria-label="Toggle supermarket brands"
          size="sm"
          variant="outline"
          className="py-[17px]"
          disabled={isPending}
          aria-busy={isPending}
        >
          <Spinner /> Marcas de supermercados
      </Toggle>
      ) : (
        <Toggle
          aria-label="Toggle supermarket brands"
          size="sm"
          variant="outline"
          className="py-[17px] data-[state=on]:*:[svg]:fill-blue-500 data-[state=on]:*:[svg]:stroke-black-500"
          pressed={onlyShopProducts}
          onPressedChange={handleSupermarketToggle}
          disabled={isPending}
          aria-busy={isPending}
        >
          <Store /> Marcas de supermercados
      </Toggle>
      )}
    </>
  );
}

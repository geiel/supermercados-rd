"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { SearchBar } from "@/components/searchbar";
import { HeaderSearch } from "@/components/header-search";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function HeaderSearchSlot() {
  const pathname = usePathname();

  return (
    <>
      {pathname === "/" ? null : (
        <div className="hidden md:block w-[50%]">
          <Suspense fallback={<div>loading...</div>}>
            <SearchBar />
          </Suspense>
        </div>
      )}
      <div className="block md:hidden">
        <Suspense
          fallback={
            <Button size="icon-lg" className="rounded-full">
              <Spinner />
            </Button>
          }
        >
          <HeaderSearch />
        </Suspense>
      </div>
    </>
  );
}

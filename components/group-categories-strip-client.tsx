"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, X } from "lucide-react";

import { CategoryIcon } from "@/components/category-icon";
import ScrollPeek from "@/components/ui/scroll-peek";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

type GroupCategoriesStripClientProps = {
  categories: {
    id: number;
    name: string;
    humanNameId: string;
    icon: string | null;
    shortName: string | null;
  }[];
};

export function GroupCategoriesStripClient({
  categories,
}: GroupCategoriesStripClientProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="space-y-3">
      <div className="md:hidden">
        <ScrollPeek showNavButtons={false} peek="26%" gutter="10px">
          <div className="flex items-center gap-2 py-1">
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
              <DrawerTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 rounded-full px-4 text-sm font-semibold"
                >
                  Elige una categoría
                  <ChevronDown className="size-6" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="h-[95dvh] max-h-[95dvh] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[95dvh] data-[vaul-drawer-direction=bottom]:rounded-t-2xl">
                <DrawerHeader className="relative">
                  <DrawerTitle className="text-center">Elige una categoría</DrawerTitle>
                  <DrawerClose asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Cerrar"
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      <X className="size-5" />
                    </Button>
                  </DrawerClose>
                </DrawerHeader>
                <div className="min-h-0 overflow-y-auto px-4 pb-6">
                  <div className="overflow-hidden rounded-2xl bg-white">
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/categorias/${category.humanNameId}`}
                        className="flex items-center gap-3 border-b px-3 py-4 transition-colors hover:bg-muted/40 last:border-b-0"
                        onClick={() => setIsOpen(false)}
                      >
                        <CategoryIcon icon={category.icon} className="size-7 shrink-0" />
                        <span className="flex-1 text-base font-medium text-foreground">
                          {category.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            {categories.map((category) => (
              <Badge
                key={category.id}
                asChild
                variant="secondary"
                className="h-9 rounded-full px-4 text-sm font-medium whitespace-nowrap"
              >
                <Link href={`/categorias/${category.humanNameId}`}>{category.name}</Link>
              </Badge>
            ))}
          </div>
        </ScrollPeek>
      </div>

      <div className="hidden md:block">
        <ScrollPeek showNavButtons={true}>
          <div className="flex gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categorias/${category.humanNameId}`}
                className="flex min-w-[84px] flex-col items-center gap-2 rounded-2xl bg-white px-3 py-3 text-center text-xs font-medium text-foreground"
              >
                <CategoryIcon icon={category.icon} className="size-7" />
                <span className="line-clamp-2">
                  {category.shortName || category.name}
                </span>
              </Link>
            ))}
          </div>
        </ScrollPeek>
      </div>
    </section>
  );
}

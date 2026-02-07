"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type CategoriesBreadcrumbProps = {
  categories: {
    id: number;
    name: string;
    humanNameId: string;
  }[];
};

export function CategoriesBreadcrumb({ categories }: CategoriesBreadcrumbProps) {
  const selectedSegment = useSelectedLayoutSegment();
  const currentCategory = selectedSegment
    ? categories.find((category) => category.humanNameId === selectedSegment)
    : null;
  const isCategoriesRoot = !selectedSegment;

  return (
    <Breadcrumb>
      <BreadcrumbList className="min-w-0 w-full flex-nowrap overflow-hidden whitespace-nowrap">
        {isCategoriesRoot ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="inline-flex max-w-[35vw] truncate md:max-w-none">
                <Link href="/">Inicio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="inline-block max-w-[55vw] truncate md:max-w-none">
                Todas las categorías
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
        {currentCategory ? (
          <>
            <BreadcrumbItem className="hidden md:inline-flex">
              <BreadcrumbLink asChild className="max-w-[35vw] truncate md:max-w-none">
                <Link href="/">Inicio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:inline-flex" />
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="inline-flex max-w-[42vw] truncate md:max-w-none">
                <Link href="/categorias">Todas las categorías</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="inline-block max-w-[42vw] truncate md:max-w-none">
                {currentCategory.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

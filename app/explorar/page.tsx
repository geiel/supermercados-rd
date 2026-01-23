import { Metadata } from "next";
import { Suspense } from "react";

import { ExplorarCategories } from "@/components/explorar-categories";
import { TypographyH3 } from "@/components/typography-h3";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Explorar categorías | SupermercadosRD",
  description:
    "Explora todas las categorías disponibles en SupermercadosRD.",
};

function ExplorarCategoriesSkeleton() {
  return (
    <>
      <div className="md:hidden px-2 md:px-0 space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 px-2 md:px-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <main className="container mx-auto pb-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="px-2 md:px-0 space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Explorar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <TypographyH3>Categorías</TypographyH3>
        </div>
        <Suspense fallback={<ExplorarCategoriesSkeleton />}>
          <ExplorarCategories />
        </Suspense>
      </div>
    </main>
  );
}

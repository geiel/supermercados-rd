import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ExplorarSubCategories } from "@/components/explorar-subcategories";
import { TypographyH3 } from "@/components/typography-h3";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { getMainCategoryByHumanId } from "@/lib/subcategory-groups";

type Props = {
  params: Promise<{ categoryHumanId: string }>;
};

function SubCategoriesSkeleton() {
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoryHumanId } = await params;
  const category = await getMainCategoryByHumanId(categoryHumanId);

  if (!category) {
    return { title: "Categoría no encontrada" };
  }

  const title = `${category.name} | SupermercadosRD`;
  const description =
    category.description ??
    `Explora las subcategorías de ${category.name} en SupermercadosRD.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/explorar/${category.humanNameId}`,
    },
    alternates: {
      canonical: `/explorar/${category.humanNameId}`,
    },
  };
}

export default async function Page({ params }: Props) {
  const { categoryHumanId } = await params;
  const category = await getMainCategoryByHumanId(categoryHumanId);

  if (!category) {
    notFound();
  }

  return (
    <main className="container mx-auto pb-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="px-2 md:px-0 space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/explorar">Explorar</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{category.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <TypographyH3>{category.name}</TypographyH3>
          {category.description ? (
            <p className="text-sm text-muted-foreground mt-1">
              {category.description}
            </p>
          ) : null}
        </div>
        <Suspense fallback={<SubCategoriesSkeleton />}>
          <ExplorarSubCategories
            categoryId={category.id}
            categoryHumanId={category.humanNameId}
          />
        </Suspense>
      </div>
    </main>
  );
}

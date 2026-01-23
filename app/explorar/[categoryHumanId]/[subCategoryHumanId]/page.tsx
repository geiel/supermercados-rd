import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ExplorarGroups } from "@/components/explorar-groups";
import { SubCategoryExplorer } from "@/components/subcategory-explorer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMainCategoryByHumanId,
  getSubCategoryByHumanId,
} from "@/lib/subcategory-groups";

type Props = {
  params: Promise<{
    categoryHumanId: string;
    subCategoryHumanId: string;
  }>;
};

function ContentSkeleton() {
  return (
    <div className="space-y-4 px-2 md:px-0">
      <div className="flex items-baseline gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-12" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoryHumanId, subCategoryHumanId } = await params;
  const category = await getMainCategoryByHumanId(categoryHumanId);

  if (!category) {
    return { title: "Categoría no encontrada" };
  }

  const subCategory = await getSubCategoryByHumanId(
    category.id,
    subCategoryHumanId
  );

  if (!subCategory) {
    return { title: "Subcategoría no encontrada" };
  }

  const title = `${subCategory.name} | SupermercadosRD`;
  const description = `Explora los productos de ${subCategory.name} en SupermercadosRD.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/explorar/${category.humanNameId}/${subCategory.humanNameId}`,
    },
    alternates: {
      canonical: `/explorar/${category.humanNameId}/${subCategory.humanNameId}`,
    },
  };
}

export default async function Page({ params }: Props) {
  const { categoryHumanId, subCategoryHumanId } = await params;
  const category = await getMainCategoryByHumanId(categoryHumanId);

  if (!category) {
    notFound();
  }

  const subCategory = await getSubCategoryByHumanId(
    category.id,
    subCategoryHumanId
  );

  if (!subCategory) {
    notFound();
  }

  return (
    <main className="container mx-auto pb-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="px-2 md:px-0">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:inline-flex">
                <BreadcrumbLink asChild>
                  <Link href="/explorar">Explorar</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/explorar/${category.humanNameId}`}>
                    {category.name}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{subCategory.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <Suspense fallback={<ContentSkeleton />}>
          {subCategory.isExplorable ? (
            <SubCategoryExplorer
              categoryId={category.id}
              subCategoryId={subCategory.id}
            />
          ) : (
            <ExplorarGroups subCategoryId={subCategory.id} />
          )}
        </Suspense>
      </div>
    </main>
  );
}

import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";

import { cacheLife, cacheTag } from "next/cache";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { getGroupCategories } from "@/lib/group-categories";

import { CategoriesNav } from "./category-nav";
import { CategoriesBreadcrumb } from "./categories-breadcrumb";

type LayoutProps = {
  children: ReactNode;
};

async function getCachedLayoutCategories() {
  "use cache";
  cacheTag("categorias-layout-categories");
  cacheLife("max");
  return await getGroupCategories();
}

async function CategoriesBreadcrumbSection() {
  await connection();
  const categories = await getCachedLayoutCategories();
  return <CategoriesBreadcrumb categories={categories} />;
}

async function CategoriesSidebar() {
  await connection();
  const categories = await getCachedLayoutCategories();
  if (categories.length === 0) {
    return null;
  }

  return <CategoriesNav categories={categories} orientation="vertical" />;
}

function CategoriesBreadcrumbFallback() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Inicio</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="container mx-auto space-y-6 py-4 px-4">
      <Suspense fallback={<CategoriesBreadcrumbFallback />}>
        <CategoriesBreadcrumbSection />
      </Suspense>

      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden lg:block">
          <Suspense fallback={null}>
            <CategoriesSidebar />
          </Suspense>
        </aside>
        <div className="min-w-0 lg:contents">{children}</div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { ChevronRight, PackageSearch } from "lucide-react";

import { CategoryIcon } from "@/components/category-icon";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getGroupCategories } from "@/lib/group-categories";

async function getCachedCategories() {
  "use cache";
  cacheTag("categorias-page-categories");
  cacheLife("max");
  return await getGroupCategories();
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CategoriesList />
    </Suspense>
  );
}

async function CategoriesList() {
  const categories = await getCachedCategories();

  if (categories.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageSearch />
          </EmptyMedia>
          <EmptyTitle>No hay categorías</EmptyTitle>
          <EmptyDescription>
            No encontramos categorías disponibles en este momento.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section className="lg:hidden">
      <div className="overflow-hidden rounded-2xl bg-white">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categorias/${category.humanNameId}`}
            className="flex items-center gap-3 border-b px-3 py-4 transition-colors hover:bg-muted/40 last:border-b-0"
          >
            <CategoryIcon icon={category.icon} className="size-7 shrink-0" />
            <span className="flex-1 text-base font-medium text-foreground">
              {category.name}
            </span>
            <ChevronRight className="size-5 text-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}

import { PackageSearch } from "lucide-react";

import { CategoryCard } from "@/components/category-card";
import { CategoryListItem } from "@/components/category-list-item";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getMainCategoriesWithSubCategories } from "@/lib/category-explorer";

export async function ExplorarCategories() {
  const categories = await getMainCategoriesWithSubCategories();

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
    <>
      <div className="md:hidden px-2 md:px-0">
        {categories.map((category) => (
          <CategoryListItem
            key={category.id}
            href={`/explorar/${category.humanId}`}
            name={category.name}
          />
        ))}
      </div>
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 px-2 md:px-0">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </>
  );
}

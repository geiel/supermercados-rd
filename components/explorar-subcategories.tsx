import { PackageSearch } from "lucide-react";

import { SubCategoryCard } from "@/components/subcategory-card";
import { SubCategoryListItem } from "@/components/subcategory-list-item";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSubCategoriesWithGroupsByCategoryId } from "@/lib/subcategory-groups";

type ExplorarSubCategoriesProps = {
  categoryId: number;
  categoryHumanId: string;
};

export async function ExplorarSubCategories({
  categoryId,
  categoryHumanId,
}: ExplorarSubCategoriesProps) {
  const subCategories = await getSubCategoriesWithGroupsByCategoryId(categoryId);

  if (subCategories.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageSearch />
          </EmptyMedia>
          <EmptyTitle>No hay subcategorías</EmptyTitle>
          <EmptyDescription>
            No encontramos subcategorías para esta categoría en este momento.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <div className="md:hidden px-2 md:px-0">
        {subCategories.map((subCategory) => (
          <SubCategoryListItem
            key={subCategory.id}
            href={`/explorar/${categoryHumanId}/${subCategory.humanId}`}
            name={subCategory.name}
          />
        ))}
      </div>
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 px-2 md:px-0">
        {subCategories.map((subCategory) => (
          <SubCategoryCard
            key={subCategory.id}
            categoryId={categoryId}
            categoryHumanId={categoryHumanId}
            subCategory={subCategory}
          />
        ))}
      </div>
    </>
  );
}

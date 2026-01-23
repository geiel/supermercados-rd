import { PackageSearch } from "lucide-react";

import { SubCategoryExplorerList } from "./subcategory-explorer-list";
import { TypographyH3 } from "@/components/typography-h3";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSubCategoryProducts } from "@/lib/subcategory-products";
import { getSubCategoryGroupFilters } from "@/lib/subcategory-groups";
import { GROUP_EXPLORER_DESKTOP_PAGE_SIZE } from "@/types/group-explorer";

type SubCategoryExplorerProps = {
  categoryId: number;
  subCategoryId: number;
};

export async function SubCategoryExplorer({
  categoryId,
  subCategoryId,
}: SubCategoryExplorerProps) {
  const [productsResult, groups] = await Promise.all([
    getSubCategoryProducts({
      subCategoryId,
      offset: 0,
      limit: GROUP_EXPLORER_DESKTOP_PAGE_SIZE,
    }),
    getSubCategoryGroupFilters(subCategoryId),
  ]);

  if (!productsResult || productsResult.products.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageSearch />
          </EmptyMedia>
          <EmptyTitle>No hay productos</EmptyTitle>
          <EmptyDescription>
            No encontramos productos para esta subcategoría en este momento.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2 px-2 md:px-0">
        <TypographyH3>{productsResult.subCategory.name}</TypographyH3>
        <span className="text-sm text-muted-foreground">
          ({productsResult.total})
        </span>
      </div>
      <SubCategoryExplorerList
        categoryId={categoryId}
        subCategoryId={subCategoryId}
        groups={groups}
        initialProducts={productsResult.products}
        total={productsResult.total}
        initialOffset={productsResult.nextOffset}
      />
    </div>
  );
}

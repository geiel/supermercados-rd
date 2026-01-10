import { Metadata } from "next";

import { CategorySearch } from "@/components/categories-search";
import { ExploreProductsList } from "@/components/explore-products-list";
import { TypographyH3 } from "@/components/typography-h3";
import { getExploreProducts } from "@/lib/explore-products";
import { getUser } from "@/lib/supabase";
import { getShopsIds } from "@/lib/utils";
import { searchGroups } from "@/lib/search-categories";
import {
  normalizeUnitFiltersForSearch,
  parseUnitFilterParam,
} from "@/utils/unit-filter";

type Props = {
  params: Promise<{ value: string }>;
  searchParams: Promise<{
    shop_ids: string | undefined;
    only_shop_products: string | undefined;
    unit_filter: string | undefined;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { value } = await params;
  return {
    title: decodeURIComponent(value),
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { value } = await params;
  const { shop_ids, only_shop_products, unit_filter } = await searchParams;

  const shopsIds = getShopsIds(shop_ids);

  const user = await getUser();
  const canSeeHiddenProducts =
    user?.email?.toLowerCase() === "geielpeguero@gmail.com";

  const unitFilters = normalizeUnitFiltersForSearch(
    parseUnitFilterParam(unit_filter)
  );

  const rawSearchValue = decodeURIComponent(value).trim();

  const [{ products, prefetch, total, nextOffset }, groupResults] =
    await Promise.all([
      getExploreProducts({
        value: rawSearchValue,
        offset: 0,
        prefetchIds: [],
        shopIds: shopsIds,
        includeHiddenProducts: canSeeHiddenProducts,
        onlyShopProducts: only_shop_products === "true",
        unitFilters,
      }),
      searchGroups(rawSearchValue),
    ]);

  if (products.length === 0) {
    return <div>Productos no encontrados.</div>;
  }

  return (
    <>
      <div className="px-2 md:px-0">
        <h1 className="text-2xl font-semibold tracking-tight">
          Buscaste &quot;{rawSearchValue}&quot;
        </h1>
        <div className="text-sm opacity-70">
          Agrega y compara categorías y productos con el +
        </div>
      </div>
      <CategorySearch groupResults={groupResults} />
      <div className="px-2 md:px-0">
        <div className="flex items-baseline gap-2">
          <TypographyH3>Productos</TypographyH3>
          <span className="text-sm text-muted-foreground">({total})</span>
        </div>
      </div>
      <ExploreProductsList
        initialProducts={products}
        initialPrefetch={prefetch}
        total={total}
        initialOffset={nextOffset}
        query={{
          value: rawSearchValue,
          shop_ids,
          only_shop_products,
          unit_filter,
        }}
      />
    </>
  );
}

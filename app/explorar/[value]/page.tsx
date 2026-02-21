import { Metadata } from "next";
import { CategorySearch } from "@/components/categories-search";

import { ExploreProductsList } from "@/components/explore-products-list";
import { TypographyH3 } from "@/components/typography-h3";
import { getExploreProducts } from "@/lib/explore-products";
import { getUser } from "@/lib/supabase";

type Props = {
  params: Promise<{ value: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { value } = await params;
  return {
    title: decodeURIComponent(value) + " | SupermercadosRD",
  };
}

export default async function Page({ params }: Props) {
  const { value } = await params;

  const user = await getUser();
  const canSeeHiddenProducts =
    user?.email?.toLowerCase() === "geielpeguero@gmail.com";

  const rawSearchValue = decodeURIComponent(value).trim();

  const { products, prefetch, total, nextOffset, groupResults } =
    await getExploreProducts({
      value: rawSearchValue,
      offset: 0,
      prefetchIds: [],
      includeHiddenProducts: canSeeHiddenProducts,
    });

  return (
    <>
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
        initialGroupResults={groupResults}
        total={total}
        initialOffset={nextOffset}
        query={{
          value: rawSearchValue,
        }}
      />
    </>
  );
}

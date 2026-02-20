import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { CategoryIcon } from "@/components/category-icon";
import { CategoryTopProducts } from "@/components/category-top-products";
import { TypographyH3 } from "@/components/typography-h3";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getGroupCategoryWithGroups } from "@/lib/group-categories";
import { getCategoryTopProducts } from "@/lib/category-top-products";
import { PackageSearch } from "lucide-react";
import CategoryLoading from "./loading";

type Props = {
  params: Promise<{ slug: string }>;
};

function formatCategoryLabelFromSlug(slug: string) {
  try {
    const decodedSlug = decodeURIComponent(slug).replace(/-/g, " ").trim();
    if (!decodedSlug) {
      return "Categoría";
    }

    return decodedSlug.charAt(0).toUpperCase() + decodedSlug.slice(1);
  } catch {
    return "Categoría";
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const categoryLabel = formatCategoryLabelFromSlug(slug);
  const title = `${categoryLabel} | SupermercadosRD`;
  const description = `Explora todas las categorías de ${categoryLabel} y encuentra los grupos disponibles.`;

  return {
    title,
    description,
    alternates: { canonical: `/categorias/${slug}` },
  };
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<CategoryPageFallback />}>
      <CategoryPageContent params={params} />
    </Suspense>
  );
}

async function CategoryPageContent({ params }: Props) {
  await connection();
  const { slug } = await params;
  const categoryData = await getGroupCategoryWithGroups(slug);

  if (!categoryData) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageSearch />
          </EmptyMedia>
          <EmptyTitle>Categoría no encontrada</EmptyTitle>
          <EmptyDescription>
            No encontramos esta categoría. Intenta con otra búsqueda.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const { category, groups } = categoryData;
  const topProducts = await getCategoryTopProducts(category.id);
  const pageUrl = `https://supermercadosrd.com/categorias/${category.humanNameId}`;

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Grupos de ${category.name}`,
    url: pageUrl,
    numberOfItems: groups.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: groups.map((group, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: group.name,
      url: `https://supermercadosrd.com/grupos/${group.humanNameId}`,
    })),
  };

  const collectionPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} | SupermercadosRD`,
    description: `Explora los grupos disponibles en la categoria ${category.name}.`,
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      name: itemListJsonLd.name,
      numberOfItems: itemListJsonLd.numberOfItems,
      itemListElement: itemListJsonLd.itemListElement,
    },
  };

  return (
    <>
      <div className="min-w-0 space-y-6 lg:col-start-2">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(collectionPageJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CategoryIcon icon={category.icon} className="size-8 shrink-0" />
            <div>
              <TypographyH3>{category.name}</TypographyH3>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          {groups.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PackageSearch />
                </EmptyMedia>
                <EmptyTitle>No hay grupos</EmptyTitle>
                <EmptyDescription>
                  Esta categoría aún no tiene grupos asignados.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/grupos/${group.humanNameId}`}
                  className="group flex min-w-0 flex-col gap-3 rounded-2xl bg-white p-3"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                    {group.imageUrl ? (
                      <Image
                        src={group.imageUrl}
                        alt={group.name}
                        width={400}
                        height={300}
                        className="h-full w-full object-contain p-2 transition-transform duration-200 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        Sin imagen
                      </div>
                    )}
                  </div>
                  <div className="line-clamp-2 break-words pl-1 text-sm font-semibold text-foreground">
                    {group.name}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
      {topProducts.length > 0 ? (
        <section className="min-w-0 space-y-3 lg:col-span-2">
          <TypographyH3>Productos destacados</TypographyH3>
          <CategoryTopProducts products={topProducts} />
        </section>
      ) : null}
    </>
  );
}

function CategoryPageFallback() {
  return <CategoryLoading />;
}

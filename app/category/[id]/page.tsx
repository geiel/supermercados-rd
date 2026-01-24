import { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryProductsList } from "@/components/category-products-list";
import { TypographyH3 } from "@/components/typography-h3";
import { getCategoryById, getCategoryProducts } from "@/lib/home-page-categories";

const PAGE_SIZE = 20;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const categoryId = Number(id);

  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return { title: "Categoría no encontrada" };
  }

  const category = await getCategoryById(categoryId);

  if (!category) {
    return { title: "Categoría no encontrada" };
  }

  const title = category.name + " | SupermercadosRD";
  const description =
    category.description ??
    `Explora los mejores productos en ${category.name}. Compara precios en supermercados de República Dominicana.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/category/${categoryId}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `/category/${categoryId}`,
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const categoryId = Number(id);

  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    notFound();
  }

  const [category, productsResult] = await Promise.all([
    getCategoryById(categoryId),
    getCategoryProducts({
      categoryId,
      offset: 0,
      limit: PAGE_SIZE,
    }),
  ]);

  if (!category) {
    notFound();
  }

  const hasProducts = productsResult.total > 0;

  return (
    <main className="container mx-auto pb-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="px-2 md:px-0">
          <div className="flex items-baseline gap-2">
            <TypographyH3>{category.name}</TypographyH3>
            <span className="text-sm text-muted-foreground">
              ({productsResult.total})
            </span>
          </div>
          {category.description ? (
            <p className="text-sm text-muted-foreground mt-1">
              {category.description}
            </p>
          ) : null}
        </div>

        {!hasProducts ? (
          <div className="px-2 md:px-0 text-sm text-muted-foreground">
            No hay productos disponibles en esta categoría.
          </div>
        ) : (
          <CategoryProductsList
            categoryId={categoryId}
            initialProducts={productsResult.products}
            total={productsResult.total}
            initialOffset={productsResult.nextOffset}
          />
        )}
      </div>
    </main>
  );
}

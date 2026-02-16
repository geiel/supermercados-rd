import { TypographyH3 } from "@/components/typography-h3";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { UnverifiedProductsAdmin } from "@/components/unverified-products-admin";
import { db } from "@/db";
import { productsBrands, productsCategories, unverfiedProducts } from "@/db/schema";
import { validateAdminUser } from "@/lib/authentication";
import { asc, eq } from "drizzle-orm";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<UnverifiedProductsFallback />}>
      <UnverifiedProductsPage />
    </Suspense>
  );
}

async function UnverifiedProductsPage() {
  await validateAdminUser();

  const unverifiedProducts = await db
    .select({
      id: unverfiedProducts.id,
      name: unverfiedProducts.name,
      image: unverfiedProducts.image,
      unit: unverfiedProducts.unit,
      brandName: productsBrands.name,
      categoryName: productsCategories.name,
    })
    .from(unverfiedProducts)
    .innerJoin(productsBrands, eq(unverfiedProducts.brandId, productsBrands.id))
    .innerJoin(
      productsCategories,
      eq(unverfiedProducts.categoryId, productsCategories.id)
    )
    .orderBy(asc(unverfiedProducts.id));

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-4 pb-4 pt-4">
      <div className="flex flex-col gap-2">
        <TypographyH3>Productos no verificados</TypographyH3>
        <p className="text-sm text-muted-foreground">
          Revisa y envía productos no verificados a la tabla de productos.
        </p>
      </div>

      {unverifiedProducts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No hay productos pendientes</EmptyTitle>
            <EmptyDescription>
              Todos los productos no verificados ya fueron procesados.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      ) : (
        <UnverifiedProductsAdmin products={unverifiedProducts} />
      )}
    </div>
  );
}

function UnverifiedProductsFallback() {
  return (
    <div className="container mx-auto pt-2">
      <div className="text-sm text-muted-foreground">Cargando...</div>
    </div>
  );
}

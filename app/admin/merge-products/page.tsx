import MergeProducts from "@/components/merge-brands";
import { db } from "@/db";
import { validateAdminUser } from "@/lib/authentication";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<MergeProductsFallback />}>
      <MergeProductsPage />
    </Suspense>
  );
}

async function MergeProductsPage() {
  await validateAdminUser();

  const brands = await db.query.productsBrands.findMany({
    columns: {
      id: true,
      name: true,
    },
  });
  const categories = await db.query.productsCategories.findMany({
    columns: {
      id: true,
      name: true,
    },
  });

  return (
    <div className="container mx-auto pt-2">
      <MergeProducts brands={brands} categories={categories} />
    </div>
  );
}

function MergeProductsFallback() {
  return (
    <div className="container mx-auto pt-2">
      <div className="text-sm text-muted-foreground">Cargando...</div>
    </div>
  );
}

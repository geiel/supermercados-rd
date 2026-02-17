import MergeUnverifiedProducts from "@/components/merge-unverified-products";
import { db } from "@/db";
import { validateAdminUser } from "@/lib/authentication";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<MergeUnverifiedProductsFallback />}>
      <MergeUnverifiedProductsPage />
    </Suspense>
  );
}

async function MergeUnverifiedProductsPage() {
  await validateAdminUser();

  const categories = await db.query.productsCategories.findMany({
    columns: {
      id: true,
      name: true,
    },
  });

  const shops = await db.query.shops.findMany({
    columns: {
      id: true,
      name: true,
      logo: true,
    },
  });

  return (
    <div className="container mx-auto pt-2">
      <MergeUnverifiedProducts categories={categories} shops={shops} />
    </div>
  );
}

function MergeUnverifiedProductsFallback() {
  return (
    <div className="container mx-auto pt-2">
      <div className="text-sm text-muted-foreground">Cargando...</div>
    </div>
  );
}

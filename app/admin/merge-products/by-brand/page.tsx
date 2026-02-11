import MergeProductsByBrand from "@/components/merge-products-by-brand";
import { db } from "@/db";
import { validateAdminUser } from "@/lib/authentication";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<MergeProductsByBrandFallback />}>
      <MergeProductsByBrandPage />
    </Suspense>
  );
}

async function MergeProductsByBrandPage() {
  await validateAdminUser();

  const brands = await db.query.productsBrands.findMany({
    columns: {
      id: true,
      name: true,
    },
  });

  return (
    <div className="container mx-auto pt-2">
      <MergeProductsByBrand brands={brands} />
    </div>
  );
}

function MergeProductsByBrandFallback() {
  return (
    <div className="container mx-auto pt-2">
      <div className="text-sm text-muted-foreground">Cargando...</div>
    </div>
  );
}

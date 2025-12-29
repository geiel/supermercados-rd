import { db } from "@/db";
import { PossibleBrandsClient } from "./client";
import { validateAdminUser } from "@/lib/authentication";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<PossibleBrandsFallback />}>
      <PossibleBrandsPage />
    </Suspense>
  );
}

async function PossibleBrandsPage() {
  await validateAdminUser();

  const brands = await db.query.productsBrands.findMany({
    orderBy: (brands, { asc }) => asc(brands.name),
  });

  return (
    <div className="container mx-auto pt-4">
      <PossibleBrandsClient
        brands={brands}
        initialCandidates={[]}
      />
    </div>
  );
}

function PossibleBrandsFallback() {
  return (
    <div className="container mx-auto pt-4">
      <div className="text-sm text-muted-foreground">Cargando...</div>
    </div>
  );
}

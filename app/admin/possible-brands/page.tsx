import { db } from "@/db";
import { PossibleBrandsClient } from "./client";
import { validateAdminUser } from "@/lib/authentication";

export default async function Page() {
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

import MergeProductsByBrand from "@/components/merge-products-by-brand";
import { db } from "@/db";
import { validateAdminUser } from "@/lib/authentication";

export default async function Page() {
  await validateAdminUser();

  const brands = await db.query.productsBrands.findMany();

  return (
    <div className="container mx-auto pt-2">
      <MergeProductsByBrand brands={brands} />
    </div>
  );
}

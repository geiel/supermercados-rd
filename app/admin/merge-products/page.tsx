import MergeProducts from "@/components/merge-brands";
import { db } from "@/db";

export default async function Page() {
  const brands = await db.query.productsBrands.findMany();

  return (
    <div className="container mx-auto pt-2">
      <MergeProducts brands={brands} />
    </div>
  );
}

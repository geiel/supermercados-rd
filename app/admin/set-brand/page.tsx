import BrandName from "@/components/brand-name";
import { db } from "@/db";

export default async function Page() {
  const categories = await db.query.productsCategories.findMany();

  return (
    <div className="container mx-auto pt-2">
      <BrandName categories={categories} />
    </div>
  );
}

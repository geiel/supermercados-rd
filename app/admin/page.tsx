import { ProductExtractor } from "@/components/product-extractor";
import { db } from "@/db";
import { validateAdminUser } from "@/lib/authentication";

export default async function Page() {
  await validateAdminUser();
  
  const shops = await db.query.shops.findMany();
  const categories = await db.query.productsCategories.findMany();

  return (
    <div className="container mx-auto pt-2">
      <ProductExtractor shops={shops} categories={categories} />
    </div>
  );
}

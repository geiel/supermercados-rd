import { ProductExtractor } from "@/components/product-extractor";
import { db } from "@/db";

export default async function Page() {
  const shops = await db.query.shops.findMany();
  const categories = await db.query.productsCategories.findMany();

  return (
    <div className="container mx-auto pt-2">
      <ProductExtractor shops={shops} categories={categories} />
    </div>
  );
}

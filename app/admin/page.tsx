import { ProductExtractor } from "@/components/product-extractor";
import { db } from "@/db";
import { validateAdminUser } from "@/lib/authentication";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<AdminFallback />}>
      <AdminPage />
    </Suspense>
  );
}

async function AdminPage() {
  await validateAdminUser();
  
  const shops = await db.query.shops.findMany();
  const categories = await db.query.productsCategories.findMany();

  return (
    <div className="container mx-auto pt-2">
      <ProductExtractor shops={shops} categories={categories} />
    </div>
  );
}

function AdminFallback() {
  return (
    <div className="container mx-auto pt-2">
      <div className="text-sm text-muted-foreground">Cargando...</div>
    </div>
  );
}

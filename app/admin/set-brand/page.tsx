import BrandName from "@/components/brand-name";
import { db } from "@/db";
import { validateAdminUser } from "@/lib/authentication";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<SetBrandFallback />}>
      <SetBrandPage />
    </Suspense>
  );
}

async function SetBrandPage() {
  await validateAdminUser();

  const categories = await db.query.productsCategories.findMany();

  return (
    <div className="container mx-auto pt-2">
      <BrandName categories={categories} />
    </div>
  );
}

function SetBrandFallback() {
  return (
    <div className="container mx-auto pt-2">
      <div className="text-sm text-muted-foreground">Cargando...</div>
    </div>
  );
}

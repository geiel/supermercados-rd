import { MergeProductsV2 } from "@/components/merge-products";
import { validateAdminUser } from "@/lib/authentication";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<MergeProductsV2Fallback />}>
      <MergeProductsV2Page />
    </Suspense>
  );
}

async function MergeProductsV2Page() {
  await validateAdminUser();

  return (
    <div className="container mx-auto pt-2">
      <MergeProductsV2 />
    </div>
  );
}

function MergeProductsV2Fallback() {
  return (
    <div className="container mx-auto pt-2">
      <div className="text-sm text-muted-foreground">Cargando...</div>
    </div>
  );
}

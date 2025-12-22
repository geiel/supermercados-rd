import { MergeProductsV2 } from "@/components/merge-products";
import { validateAdminUser } from "@/lib/authentication";

export default async function Page() {
  await validateAdminUser();

  return (
    <div className="container mx-auto pt-2">
      <MergeProductsV2 />
    </div>
  );
}

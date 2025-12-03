import { ProductUrlManager } from "@/components/product-url-manager";
import { db } from "@/db";
import { fetchProductShopUrls } from "@/lib/admin/product-urls";

export default async function Page() {
  const shops = await db.query.shops.findMany();
  const initialRows = await fetchProductShopUrls({ visibility: "hidden" });

  return (
    <div className="container mx-auto pt-2">
      <ProductUrlManager shops={shops} initialRows={initialRows} />
    </div>
  );
}

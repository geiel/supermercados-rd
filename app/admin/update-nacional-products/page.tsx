import { updateProductShopUrl } from "@/lib/admin/product-urls";
import {
  updateNacionalProducts,
  type NacionalUpdateResult,
} from "@/lib/scrappers/update-nacional-products";
import { revalidatePath } from "next/cache";
import { UpdateNacionalProductsClient } from "./client";
import { validateAdminUser } from "@/lib/authentication";

type RunUpdateResponse = {
  results: NacionalUpdateResult[];
  error?: string;
};

type ManualUpdateResponse = {
  appliedUrl?: string;
  error?: string;
};

export default function Page() {
  async function runUpdateAction(
    limit: number,
    ignoredProductIds: number[] = []
  ): Promise<RunUpdateResponse> {
    "use server";

    await validateAdminUser();
    const parsedLimit = Number(limit);
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 1;

    try {
      const results = await updateNacionalProducts(safeLimit, {
        ignoredProductIds,
      });
      return { results };
    } catch (error) {
      console.error(error);
      return {
        results: [],
        error:
          error instanceof Error
            ? error.message
            : "No se pudo ejecutar la actualización.",
      };
    } finally {
      revalidatePath("/admin/update-nacional-products");
    }
  }

  async function applyManualAction({
    productId,
    shopId,
    url,
  }: {
    productId: number;
    shopId: number;
    url: string;
  }): Promise<ManualUpdateResponse> {
    "use server";

    await validateAdminUser();
    try {
      await updateProductShopUrl({ productId, shopId, url });
      revalidatePath("/admin/update-nacional-products");
      return { appliedUrl: url };
    } catch (error) {
      console.error(error);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la URL seleccionada.",
      };
    }
  }

  return (
    <div className="container mx-auto pt-4">
      <UpdateNacionalProductsClient
        runUpdateAction={runUpdateAction}
        applyManualAction={applyManualAction}
      />
    </div>
  );
}

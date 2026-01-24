import { revalidateTag } from "next/cache";

export function revalidateProduct(productId: number) {
  revalidateTag(`product-${productId}`, "max");
}

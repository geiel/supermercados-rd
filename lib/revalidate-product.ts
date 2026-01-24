const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET;

export async function revalidateProduct(productId: number) {
  console.log(BASE_URL, REVALIDATION_SECRET);

  try {
    const response = await fetch(`${BASE_URL}/api/revalidate/product`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(REVALIDATION_SECRET && {
          Authorization: `Bearer ${REVALIDATION_SECRET}`,
        }),
      },
      body: JSON.stringify({ productId }),
    });

    if (!response.ok) {
      console.error(
        `[REVALIDATE] Failed to revalidate product ${productId}: ${response.status}`
      );
    }
  } catch (error) {
    console.error(`[REVALIDATE] Error revalidating product ${productId}:`, error);
  }
}

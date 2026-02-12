import * as Sentry from "@sentry/nextjs";
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET;

export async function revalidateProduct(productId: number) {
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
      Sentry.logger.error(`[REVALIDATE] Failed to revalidate product ${productId}: ${response.status}`
      );
    }
  } catch (error) {
    Sentry.logger.error(`[REVALIDATE] Error revalidating product ${productId}:`, { error });
  }
}

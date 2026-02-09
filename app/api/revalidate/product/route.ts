import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.REVALIDATION_SECRET;

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { productId } = await request.json();

    if (!productId || typeof productId !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid productId" },
        { status: 400 }
      );
    }

    revalidateTag(`product-${productId}`, "max");

    return NextResponse.json({
      revalidated: true,
      productId,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to revalidate", details: String(error) },
      { status: 500 }
    );
  }
}

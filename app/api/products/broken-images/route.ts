import { NextResponse } from "next/server";

import { db } from "@/db";
import { productBrokenImages } from "@/db/schema";

const PLACEHOLDER_IMAGE = "/no-product-found.jpg";

type BrokenImagePayload = {
  productId: number;
  imageUrl: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<BrokenImagePayload>;
    const productId = Number(payload.productId);
    const imageUrl =
      typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";

    if (!Number.isFinite(productId) || productId <= 0 || !imageUrl) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (imageUrl === PLACEHOLDER_IMAGE) {
      return NextResponse.json({ ok: true });
    }

    await db.insert(productBrokenImages).values({
      productId,
      imageUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "[api/products/broken-images] Failed to log broken image",
      error
    );
    return NextResponse.json(
      { error: "Unable to log broken image" },
      { status: 500 }
    );
  }
}

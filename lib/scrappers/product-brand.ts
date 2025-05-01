"use server";

import { db } from "@/db";
import { products, productsBrands } from "@/db/schema";
import { and, eq, ilike } from "drizzle-orm";

export async function setProductBrand(brandName: string, categoryId: number) {
  let brandId = 0;

  const brand = await db
    .insert(productsBrands)
    .values({ name: brandName })
    .onConflictDoNothing()
    .returning();

  if (brand.length === 0) {
    const brand = await db.query.productsBrands.findFirst({
      where: eq(productsBrands.name, brandName),
    });

    brandId = brand!.id;
  } else {
    brandId = brand[0].id;
  }

  return await db
    .update(products)
    .set({ brandId })
    .where(
      and(
        eq(products.categoryId, categoryId),
        ilike(products.name, `%${brandName}%`)
      )
    )
    .returning();
}

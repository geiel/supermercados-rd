import { Suspense } from "react";
import { eq, isNotNull, inArray, and, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  groups,
  homePageCategories,
  homePageCategoriesProducts,
  products,
  productsBrands,
  productsShopsPrices,
} from "@/db/schema";
import { validateAdminUser } from "@/lib/authentication";
import { TypographyH3 } from "@/components/typography-h3";
import { BestValueProductsClient } from "./client";

export type BestValueProduct = {
  groupId: number;
  groupName: string;
  productId: number;
  productName: string;
  productImage: string | null;
  productUnit: string;
  brandName: string;
  currentPrice: string | null;
};

export type HomePageCategory = {
  id: number;
  name: string;
  description: string | null;
};

async function replaceHomePageCategoryProducts(formData: FormData) {
  "use server";

  await validateAdminUser();

  const categoryId = Number(formData.get("categoryId"));

  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return { error: "Invalid category ID" };
  }

  // Delete existing products in this category
  await db
    .delete(homePageCategoriesProducts)
    .where(eq(homePageCategoriesProducts.homePageCategoryId, categoryId));

  // Get all best value product IDs from groups
  const groupsWithBestValue = await db.query.groups.findMany({
    columns: { bestValueProductId: true },
    where: (groups, { isNotNull }) => isNotNull(groups.bestValueProductId),
  });

  // Insert new products
  const values = groupsWithBestValue
    .filter((g) => g.bestValueProductId !== null)
    .map((g) => ({
      homePageCategoryId: categoryId,
      productId: g.bestValueProductId!,
    }));

  if (values.length > 0) {
    await db
      .insert(homePageCategoriesProducts)
      .values(values)
      .onConflictDoNothing();
  }

  revalidatePath("/admin/best-value-products");

  return { success: true, insertedCount: values.length };
}

export default function Page() {
  return (
    <Suspense fallback={<BestValueProductsFallback />}>
      <BestValueProductsPage />
    </Suspense>
  );
}

async function BestValueProductsPage() {
  await validateAdminUser();

  // Get all groups with best value product IDs
  const groupsWithBestValue = await db.query.groups.findMany({
    columns: {
      id: true,
      name: true,
      bestValueProductId: true,
    },
    where: (groups, { isNotNull }) => isNotNull(groups.bestValueProductId),
    orderBy: (groups, { asc }) => asc(groups.name),
  });

  // Get product IDs
  const productIds = groupsWithBestValue
    .map((g) => g.bestValueProductId)
    .filter((id): id is number => id !== null);

  // Fetch product details with prices
  let productDetails: Map<
    number,
    {
      name: string;
      image: string | null;
      unit: string;
      brandName: string;
      currentPrice: string | null;
    }
  > = new Map();

  if (productIds.length > 0) {
    const productRows = await db
      .select({
        id: products.id,
        name: products.name,
        image: products.image,
        unit: products.unit,
        brandName: productsBrands.name,
      })
      .from(products)
      .innerJoin(productsBrands, eq(products.brandId, productsBrands.id))
      .where(inArray(products.id, productIds));

    // Get minimum prices for these products
    const priceRows = await db
      .select({
        productId: productsShopsPrices.productId,
        currentPrice: productsShopsPrices.currentPrice,
      })
      .from(productsShopsPrices)
      .where(
        and(
          inArray(productsShopsPrices.productId, productIds),
          isNotNull(productsShopsPrices.currentPrice),
          or(
            isNull(productsShopsPrices.hidden),
            eq(productsShopsPrices.hidden, false)
          )
        )
      );

    // Build price map (min price per product)
    const priceMap = new Map<number, string>();
    for (const row of priceRows) {
      const currentMin = priceMap.get(row.productId);
      if (
        !currentMin ||
        (row.currentPrice && Number(row.currentPrice) < Number(currentMin))
      ) {
        priceMap.set(row.productId, row.currentPrice ?? "");
      }
    }

    for (const row of productRows) {
      productDetails.set(row.id, {
        name: row.name,
        image: row.image,
        unit: row.unit,
        brandName: row.brandName,
        currentPrice: priceMap.get(row.id) ?? null,
      });
    }
  }

  // Build best value products list
  const bestValueProducts: BestValueProduct[] = groupsWithBestValue
    .filter((g) => g.bestValueProductId !== null)
    .map((g) => {
      const product = productDetails.get(g.bestValueProductId!);
      return {
        groupId: g.id,
        groupName: g.name,
        productId: g.bestValueProductId!,
        productName: product?.name ?? "Unknown",
        productImage: product?.image ?? null,
        productUnit: product?.unit ?? "",
        brandName: product?.brandName ?? "Unknown",
        currentPrice: product?.currentPrice ?? null,
      };
    })
    .filter((p) => p.productName !== "Unknown");

  // Get all home page categories
  const categories = await db.query.homePageCategories.findMany({
    orderBy: (categories, { asc }) => asc(categories.name),
  });

  return (
    <div className="container mx-auto pb-4 pt-4">
      <div className="flex flex-1 flex-col gap-4">
        <TypographyH3>Best Value Products por Grupo</TypographyH3>
        <p className="text-sm text-muted-foreground">
          Estos son los productos con mejor valor (precio por unidad más bajo)
          de cada grupo. Selecciona una categoría para reemplazar sus productos
          con estos.
        </p>
        <BestValueProductsClient
          products={bestValueProducts}
          categories={categories}
          replaceAction={replaceHomePageCategoryProducts}
        />
      </div>
    </div>
  );
}

function BestValueProductsFallback() {
  return (
    <div className="container mx-auto pb-4 pt-4">
      <div className="flex flex-1 flex-col gap-4">
        <TypographyH3>Best Value Products por Grupo</TypographyH3>
        <div className="text-sm text-muted-foreground">Cargando...</div>
      </div>
    </div>
  );
}

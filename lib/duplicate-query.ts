"use server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { sql } from "drizzle-orm";

type Product = {
  id: number;
  name: string;
  unit: string;
  image: string | null;
};

export type DuplicateProducts = {
  product: Product;
  similars: Product[];
};

export async function findDuplicateProducts(
  categoryId: number,
  shopId: number,
  ignoreIds: number[]
) {
  const select = await db.query.products.findMany({
    where: (products, { eq, and, inArray, not }) =>
      and(
        eq(products.categoryId, categoryId),
        not(inArray(products.id, ignoreIds))
      ),
    with: {
      shopCurrentPrices: {
        where: (shopPrices, { eq }) => eq(shopPrices.shopId, shopId),
      },
    },
    limit: 50,
  });

  const filteredProducts = select.filter((p) => p.shopCurrentPrices.length > 0);

  const duplicateProducts: {
    product: Product;
    similars: Product[];
  }[] = [];

  for (const product of filteredProducts) {
    const query = sql`
                WITH
                  fuzzy AS (
                      SELECT
                      id,
                      name,
                      image,
                      unit,
                      deleted,
                      similarity(unaccent(lower(name)), unaccent(lower(${product.name}))) AS sim
                      FROM ${products} AS p
                      WHERE unaccent(lower(name)) % unaccent(lower(${product.name}))
                      AND NOT EXISTS (
                        SELECT 1
                          FROM products_shops_prices AS bad
                          WHERE
                            bad."productId" = p.id
                            AND bad."shopId" = ${shopId}
                      )
                  )
              SELECT
                  COALESCE(fuzzy.id)        AS id,
                  COALESCE(fuzzy.name)    AS name,
                  COALESCE(fuzzy.image)  AS image,
                  COALESCE(fuzzy.unit)    AS unit,
                  COALESCE(sim, 0)                  AS sim_score,
                  CASE WHEN unaccent(lower(name)) LIKE unaccent(lower(${product.name}))||'%' THEN 1 ELSE 0 END AS is_prefix,
                  COUNT(*) OVER() AS total_count
              FROM fuzzy
              WHERE
                id <> ${product.id}
              ORDER BY
                is_prefix  DESC,
                sim_score  DESC,
                COALESCE(fuzzy.id) ASC
              LIMIT 10
          `;

    const response: Product[] = await db.execute(query);

    duplicateProducts.push({
      product: product,
      similars: response,
    });
  }

  return duplicateProducts.filter((p) => p.similars.length > 0);
}

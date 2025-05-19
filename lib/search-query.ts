import { db } from "@/db";
import { products } from "@/db/schema";
import { sql } from "drizzle-orm";
import { synonyms } from "./synonyms";

function removeAccents(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function searchProducts(
  value: string,
  limit: number,
  offset: number
) {
  const tsQuery = buildTsQuery(removeAccents(value));

  const query = sql`
          WITH
            fts AS (
              SELECT
                id,
                name,
                ts_rank(
                  to_tsvector('spanish', unaccent(lower(name)))
                  || to_tsvector('english', unaccent(lower(name))),
                  to_tsquery('spanish', unaccent(lower(${tsQuery})))
                  || to_tsquery('english', unaccent(lower(${tsQuery})))
                ) AS rank
              FROM products
              WHERE
                to_tsvector('spanish', unaccent(lower(name))) @@ to_tsquery('spanish', unaccent(lower(${tsQuery})))
                OR
                to_tsvector('english', unaccent(lower(name))) @@ to_tsquery('english', unaccent(lower(${tsQuery})))
            ),
            fuzzy AS (
                SELECT
                id,
                name,
                similarity(unaccent(lower(name)), unaccent(lower(${value}))) AS sim
                FROM ${products}
                WHERE unaccent(lower(name)) % unaccent(lower(${value}))
            )
        SELECT
            COALESCE(fts.id, fuzzy.id)    AS id,
            COALESCE(fts.name, fuzzy.name) AS name,
            COALESCE(rank, 0)              AS fts_rank,
            COALESCE(sim, 0)               AS sim_score,
            CASE WHEN rank IS NOT NULL THEN 1 ELSE 0 END AS is_exact,
            COUNT(*) OVER() AS total_count
        FROM fts
        FULL  JOIN fuzzy USING (id, name)
        ORDER BY
        is_exact   DESC,
        fts_rank   DESC, 
        sim_score  DESC   
        LIMIT ${limit}
        OFFSET ${offset}
    `;

  const res = await db.execute(query);

  const productsResponse = await db.query.products.findMany({
    where: (products, { inArray }) =>
      inArray(products.id, res.map((r) => r.id) as number[]),
    with: {
      shopCurrentPrices: {
        where: (scp, { isNull, eq, or }) =>
          or(isNull(scp.hidden), eq(scp.hidden, false)),
      },
      brand: true,
    },
  });

  const byId = new Map(productsResponse.map((p) => [p.id, p]));
  const orderedProducts = res.map((r) => byId.get(r.id as number)!);

  return {
    products: orderedProducts,
    total: res.length > 0 ? (res[0].total_count as number) : 0,
  };
}

function cartesian<T>(sets: T[][]): T[][] {
  return sets.reduce<T[][]>(
    (acc, set) => acc.flatMap((seq) => set.map((item) => [...seq, item])),
    [[]]
  );
}

function buildTsQuery(raw: string) {
  const norm = removeAccents(raw.trim().toLowerCase());
  const words = norm.split(/\s+/);
  const buckets = words.map((w) => [w, ...(synonyms[w] || [])]);
  const combos = cartesian(buckets).map((arr) => arr.join(" & "));
  return combos.join(" | ");
}

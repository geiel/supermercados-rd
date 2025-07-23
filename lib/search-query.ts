import { db } from "@/db";
import { products, productsShopsPrices } from "@/db/schema";
import { sql } from "drizzle-orm";
import { synonyms } from "./synonyms";

export function removeAccents(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("&", "");
}

export async function searchProducts(
  value: string,
  limit: number,
  offset: number
) {
  const tsQuery = buildTsQuery(removeAccents(value));

  console.log(tsQuery);
  const query = sql`
          WITH
            fts AS (
              SELECT
                id,
                name,
                deleted,
                ts_rank(
                  to_tsvector('spanish', unaccent(lower(name)))
                  || to_tsvector('english', unaccent(lower(name))),
                  to_tsquery('spanish', unaccent(lower(${tsQuery})))
                  || to_tsquery('english', unaccent(lower(${tsQuery})))
                ) AS rank
              FROM ${products}
              WHERE
                to_tsvector('spanish', unaccent(lower(name))) @@ to_tsquery('spanish', unaccent(lower(${tsQuery})))
                OR
                to_tsvector('english', unaccent(lower(name))) @@ to_tsquery('english', unaccent(lower(${tsQuery})))
            ),
            fuzzy AS (
                SELECT
                id,
                name,
                deleted,
                similarity(unaccent(lower(name)), unaccent(lower(${value}))) AS sim
                FROM ${products}
                WHERE unaccent(lower(name)) % unaccent(lower(${value}))
            )
        SELECT
            COALESCE(fts.id, fuzzy.id)      AS id,
            COALESCE(rank, 0)               AS fts_rank,
            COALESCE(sim, 0)                AS sim_score,
            CASE WHEN rank IS NOT NULL THEN 1 ELSE 0 END AS is_exact,
            CASE WHEN unaccent(lower(name)) LIKE unaccent(lower(${value}))||'%' THEN 1 ELSE 0 END AS is_prefix,
            COUNT(*) OVER() AS total_count
        FROM fts
        FULL JOIN fuzzy USING (id, name)
        WHERE 
          EXISTS (
            SELECT 1
            FROM ${productsShopsPrices}
            WHERE ${productsShopsPrices.productId} = COALESCE(fts.id, fuzzy.id)
            AND (${productsShopsPrices.hidden} IS NULL OR ${productsShopsPrices.hidden} = FALSE)
          )
          AND fts.deleted IS NOT TRUE
          AND fuzzy.deleted IS NOT TRUE
        ORDER BY
          is_exact   DESC,
          is_prefix  DESC,
          fts_rank   DESC,
          sim_score  DESC,
          COALESCE(fts.id, fuzzy.id) ASC
        LIMIT ${limit}
        OFFSET ${offset}
    `;

  const res: { id: number; total_count: string }[] = await db.execute(query);
  const productsResponse = await db.query.products.findMany({
    where: (products, { inArray }) =>
      inArray(
        products.id,
        res.map((r) => r.id)
      ),
    with: {
      shopCurrentPrices: true,
      brand: true,
    },
  });

  const byId = new Map(productsResponse.map((p) => [p.id, p]));
  const orderedProducts = res.map((r) => byId.get(r.id)!);

  return {
    products: orderedProducts,
    total: res.length > 0 ? Number(res[0].total_count) : 0,
  };
}

export function buildTsQuery(raw: string) {
  const norm = removeAccents(raw.trim().toLowerCase());
  const words = norm.split(/\s+/);

  const buckets: string[][] = [];
  for (let i = 0; i < words.length; ) {
    const w = words[i];
    const next = words[i + 1];
    let twoKey = next ? `${w} & ${next}` : null;
    let threeKey =
      next && words[i + 2] ? `${w} & ${next} & ${words[i + 2]}` : null;

    if (threeKey && synonyms[threeKey]) {
      const syns = synonyms[threeKey];
      const key1 = threeKey.split(" & ")[0];
      const key2 = threeKey.split(" & ")[1];
      const key3 = threeKey.split(" & ")[2];
      if (synonyms[key1]) {
        const syn = synonyms[key1];
        threeKey = `(${key1} | ${syn.join(" | ")}) & ${key2} & ${key3}`;
      }
      if (synonyms[key2]) {
        const syn = synonyms[key2];
        threeKey = threeKey.replace(key2, `(${key2} | ${syn.join(" | ")})`);
      }
      if (synonyms[key3]) {
        const syn = synonyms[key3];
        threeKey = threeKey.replace(key3, `(${key3} | ${syn.join(" | ")})`);
      }
      buckets.push([threeKey, ...syns]);
      i += 3;
    } else if (twoKey && synonyms[twoKey]) {
      const syns = synonyms[twoKey];
      const key1 = twoKey.split(" & ")[0];
      const key2 = twoKey.split(" & ")[1];
      if (synonyms[key1]) {
        const syn = synonyms[key1];
        twoKey = `(${key1} | ${syn.join(" | ")}) & ${key2}`;
      }

      if (synonyms[key2]) {
        const syn = synonyms[key2];
        twoKey = twoKey.replace(key2, `(${key2} | ${syn.join(" | ")})`);
      }
      buckets.push([twoKey, ...syns]);
      i += 2;
    } else {
      buckets.push([w, ...(synonyms[w] || [])]);
      i += 1;
    }
  }

  return buckets
    .map((bucket) => {
      if (bucket.length === 1) return bucket[0];
      return `(${bucket.join(" | ")})`;
    })
    .join(" & ");
}

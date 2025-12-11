import { db } from "@/db";
import { products, productsShopsPrices } from "@/db/schema";
import { sql } from "drizzle-orm";
import { baseV2 } from "./synonyms-v2";
import { expandUnitFilter } from "./unit-utils";

type SynonymFull = {
    synonyms: string[];
    query: string[];
    id: string | undefined;
    complex: string[] | undefined;
}

export function removeAccents(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("&", "");
}

export async function searchProducts(
  value: string,
  limit: number,
  offset: number,
  orderByRanking: boolean,
  shopIds?: number[],
  includeHiddenProducts = false,
  onlySupermarketProducts = false,
  unitsFilter: string[] = []
) {
  
  const tsQueryV2 = buildTsQueryV2(removeAccents(value));
  const normalizedUnitsFilter = Array.from(
    new Set(
      unitsFilter.flatMap((unit) => {
        const expanded = expandUnitFilter(unit);

        return expanded.flatMap((variant) => {
          const match = variant.match(/^1\s+(.+)$/);
          if (match) {
            const baseUnit = match[1].trim();
            return baseUnit ? [variant, baseUnit] : [variant];
          }
          return [variant];
        });
      })
    )
  );

  const hasUnitFilter = normalizedUnitsFilter.length > 0;
  const unitsArray = hasUnitFilter
    ? sql`ARRAY[${sql.join(normalizedUnitsFilter.map((u) => sql`${u}`), sql`, `)}]`
    : null;

  console.log(tsQueryV2);

  const query = sql`
          WITH
            fts AS (
              SELECT
                id,
                name,
                deleted,
                rank,
                "brandId",
                unit,
                relevance,
                ts_rank(
                  name_unaccent_es || name_unaccent_en,
                  to_tsquery('spanish', unaccent(lower(${tsQueryV2}))) || to_tsquery('english', unaccent(lower(${tsQueryV2})))
                ) AS ts_rank
              FROM ${products}
              WHERE
                name_unaccent_es @@ to_tsquery('spanish', unaccent(lower(${tsQueryV2})))
                OR
                name_unaccent_en @@ to_tsquery('english', unaccent(lower(${tsQueryV2})))
                ${hasUnitFilter && unitsArray ? sql`AND unit = ANY(${unitsArray})` : sql``}
            ),
            fuzzy AS (
                SELECT
                id,
                name,
                deleted,
                rank,
                "brandId",
                unit,
                similarity(unaccent(lower(name)), unaccent(lower(${value}))) AS sim
                FROM ${products}
                WHERE unaccent(lower(name)) % unaccent(lower(${value}))
                ${hasUnitFilter && unitsArray ? sql`AND unit = ANY(${unitsArray})` : sql``}
            )
        SELECT
            COALESCE(fts.id, fuzzy.id)                AS id,
            COALESCE(ts_rank, 0)                      AS fts_rank,
            COALESCE(sim, 0)                          AS sim_score,
            COALESCE(fts.rank, fuzzy.rank)            AS product_rank,
            COALESCE(fts.relevance, 0)  AS product_relevance,
            CASE WHEN ts_rank IS NOT NULL THEN 1 ELSE 0 END AS is_exact,
            CASE WHEN unaccent(lower(name)) LIKE unaccent(lower(${value}))||'%' THEN 1 ELSE 0 END AS is_prefix,
            COUNT(*) OVER() AS total_count
        FROM fts
        FULL JOIN fuzzy USING (id, name)
        WHERE 
          EXISTS (
            SELECT 1
            FROM ${productsShopsPrices}
            WHERE ${productsShopsPrices.productId} = COALESCE(fts.id, fuzzy.id)
    `;
  
  if (shopIds && shopIds.length > 0) {
    query.append(sql`
      AND ${productsShopsPrices.shopId} IN (${sql.join(shopIds, sql`,`)})
    `);
  }

  if (!includeHiddenProducts) {
    query.append(sql`
      AND (${productsShopsPrices.hidden} IS NULL OR ${productsShopsPrices.hidden} = FALSE)
    `);
  }

  if (onlySupermarketProducts) {
    const supermarketBrandIds = [28, 54, 9, 77, 80, 69, 19, 30, 2527];
    const supermarketNameKeywords = ["bravo", "lider", "wala", "selection", "gold", "zerca", "mubravo"];
    const keywordConditions = supermarketNameKeywords.map((keyword) =>
      sql`unaccent(name) ~* ('\\y' || ${keyword} || '\\y')`
    );

    query.append(sql`
      AND COALESCE(fts."brandId", fuzzy."brandId") IN (${sql.join(supermarketBrandIds, sql`,`)})
      AND (${sql.join(keywordConditions, sql` OR `)})
    `);
  }


  query.append(sql`
      )
      AND fts.deleted IS NOT TRUE
      AND fuzzy.deleted IS NOT TRUE
      ${hasUnitFilter && unitsArray ? sql`AND COALESCE(fts.unit, fuzzy.unit) = ANY(${unitsArray})` : sql``}
    ORDER BY
      is_exact      DESC,
      is_prefix     DESC,
  `)
  
  if (orderByRanking) {
    query.append(sql` 
      product_relevance DESC,
      product_rank  DESC, 
    `);
  }

  query.append(sql`
      fts_rank      DESC,
      sim_score     DESC,
      COALESCE(fts.id, fuzzy.id) ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  const rows = await db.execute<{ id: number; total_count: string }>(query);
  const productsResponse = await db.query.products.findMany({
    where: (products, { inArray }) =>
      inArray(
        products.id,
        rows.map((r) => r.id)
      ),
    with: {
      shopCurrentPrices: true,
      brand: true,
    },
  });

  const byId = new Map(productsResponse.map((p) => [p.id, p]));
  const orderedProducts = rows.map((r) => byId.get(r.id)!);

  return {
    products: orderedProducts,
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
  };
}


export function buildTsQueryV2(raw: string) {
  const norm = removeAccents(raw.trim().toLowerCase());
  const words = norm.split(/\s+/);

  const buckets: string[][] = [];
  for (let i = 0; i < words.length;) {
    const w = words[i];
    const next = words[i + 1];
    const twoKey = next ? `${w} ${next}` : null;
    const threeKey = next && words[i + 2] ? `${w} ${next} ${words[i + 2]}` : null;

    let matched = false;

    if (threeKey) {
      const threeKeySyn = baseV2.find(s => s.synonyms.find(s => s === threeKey));
      if (threeKeySyn) {
        if (threeKeySyn.complex) {
          buckets.push([`(${buildComplexQuery(threeKeySyn)}) | (${threeKeySyn.query.join(" | ")})` ]);
          i += 3;
          continue;
        }

        buckets.push(threeKeySyn.query);
        i += 3;
        matched = true;
      }
    }

    if (!matched && twoKey) {
      const twoKeySyn = baseV2.find(s => s.synonyms.find(s => s === twoKey));
      if (twoKeySyn) {
        if (twoKeySyn.complex) {
          buckets.push([`(${buildComplexQuery(twoKeySyn)}) | (${twoKeySyn.query.join(" | ")})` ]);
          i += 2;
          continue;
        }

        buckets.push(twoKeySyn.query);
        i += 2;
        matched = true;
      }
    }
    
    if (!matched) {
      const singleWordSyn = baseV2.find(s => s.synonyms.find(s => s === w));
      if (!singleWordSyn) {
         buckets.push([w]);
         i += 1;
         continue;
      }

      const nextWordSyn = baseV2.find(s => s.synonyms.find(s => s === next));
      if (singleWordSyn.id && nextWordSyn?.id) {
        const id1 = singleWordSyn.id;
        const id2 = nextWordSyn.id;
        const complexSyn = baseV2.find(syn => syn.complex && areArraysEqualIgnoreOrder(syn.complex, [id1, id2]));
        if (complexSyn) {
          buckets.push([`(((${singleWordSyn.query.join(" | ")}) & (${nextWordSyn.query.join(" | ")})) | (${complexSyn.query.join(" | ")}))`])
          i += 2;
          continue;
        }
      }

      if (singleWordSyn.complex) {
        buckets.push([`((${buildComplexQuery(singleWordSyn)}) | (${singleWordSyn.query.join(" | ")}))` ]);
        i += 1;
        continue;
      }

      if (singleWordSyn.id !== "con") {
        buckets.push(singleWordSyn.query);
      }
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

function buildComplexQuery(synonyms: SynonymFull) {
  const complexSyn = baseV2.filter(syn => synonyms.complex?.some(c => c === syn.id))
  return complexSyn.map(c => {
    if (c.query.length === 1) return c.query[0]
    return `(${c.query.join(" | ")})`
  }).join(" & ");
}


export function areArraysEqualIgnoreOrder(arr1: string[], arr2: string[]) {
  return (
    arr1.length === arr2.length &&
    [...arr1].sort().every((val, idx) => val === [...arr2].sort()[idx])
  );
}

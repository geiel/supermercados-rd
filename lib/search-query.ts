import { db } from "@/db";
import { products, productsShopsPrices } from "@/db/schema";
import { sql } from "drizzle-orm";
import { synonyms } from "./synonyms";
import { baseV2 } from "./synonyms-v2";

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
  offset: number
) {
  // const tsQuery = buildTsQuery(removeAccents(value));
  const tsQueryV2 = buildTsQueryV2(removeAccents(value));

  console.log(tsQueryV2);

  const query = sql`
          WITH
            fts AS (
              SELECT
                id,
                name,
                deleted,
                ts_rank(
                  name_unaccent_es || name_unaccent_en,
                  to_tsquery('spanish', unaccent(lower(${tsQueryV2}))) || to_tsquery('english', unaccent(lower(${tsQueryV2})))
                ) AS rank
              FROM ${products}
              WHERE
                name_unaccent_es @@ to_tsquery('spanish', unaccent(lower(${tsQueryV2})))
                OR
                name_unaccent_en @@ to_tsquery('english', unaccent(lower(${tsQueryV2})))
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

  const res: { rows: { id: number; total_count: string}[] } = await db.execute(query);
  const productsResponse = await db.query.products.findMany({
    where: (products, { inArray }) =>
      inArray(
        products.id,
        res.rows.map((r) => r.id)
      ),
    with: {
      shopCurrentPrices: true,
      brand: true,
    },
  });

  const byId = new Map(productsResponse.map((p) => [p.id, p]));
  const orderedProducts = res.rows.map((r) => byId.get(r.id)!);

  return {
    products: orderedProducts,
    total: res.rows.length > 0 ? Number(res.rows[0].total_count) : 0,
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


function areArraysEqualIgnoreOrder(arr1: string[], arr2: string[]) {
  return (
    arr1.length === arr2.length &&
    [...arr1].sort().every((val, idx) => val === [...arr2].sort()[idx])
  );
}

export function buildTsQuery(raw: string) {
  const norm = removeAccents(raw.trim().toLowerCase());
  const words = norm.split(/\s+/);

  const buckets: string[][] = [];
  for (let i = 0; i < words.length; ) {
    const w = words[i];
    const next = words[i + 1];
    const twoKey = next ? `${w} & ${next}` : null;
    const threeKey =
      next && words[i + 2] ? `${w} & ${next} & ${words[i + 2]}` : null;

    if (threeKey && synonyms[threeKey]) {
      const syns = getDeepSynonyms([threeKey, ...Array.from(new Set(getDeepSynonyms(synonyms[threeKey])))]);
      buckets.push(syns);
      i += 3;
    } else if (twoKey && synonyms[twoKey]) {
      const syns = getDeepSynonyms([twoKey, ...Array.from(new Set(getDeepSynonyms(synonyms[twoKey])))]);
      buckets.push(syns);
      i += 2;
    } else {
      buckets.push([w, ...Array.from(new Set(getDeepSynonyms(synonyms[w])))]);
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

function getDeepSynonyms(deepSynonyms: string[] | undefined) {
  if (!deepSynonyms) {
    return [];
  }

  return deepSynonyms.map((syn) => {
    if (!syn.includes(" & ")) {
      return syn;
    }

    const parts = syn.split(" & ");
    parts.forEach(part => {
      if (synonyms[part]) {
        syn = syn.replace(part, `(${part} | ${synonyms[part].join(" | ")})`);
      }
    })

    return syn;
  });
}
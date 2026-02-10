import { db } from "@/db";
import { products, productsShopsPrices } from "@/db/schema";
import { sql } from "drizzle-orm";
import { baseV2 } from "./synonyms-v2";
import { expandUnitFilter, extractSearchUnitTarget } from "./unit-utils";
import { sanitizeForTsQuery } from "./utils";

type SynonymFull = {
    synonyms: string[];
    query: string[];
    id: string | undefined;
    complex: string[] | undefined;
}

const SEARCH_UNIT_EXACT_TOLERANCE = 0.05;
const SEARCH_UNIT_MIN_TARGET_AMOUNT = 0.000001;
const SEARCH_UNIT_TEXT_RANK_FACTOR = 0.6;
const SEARCH_UNIT_TEXT_RANK_MIN = 0.015;
const SEARCH_UNIT_TEXT_SIM_MIN = 0.2;

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
  const searchUnitTarget = extractSearchUnitTarget(value);
  const searchTextForMatching =
    searchUnitTarget?.cleanedSearchText.length
      ? searchUnitTarget.cleanedSearchText
      : value;
  const normalizedSearchValue = sanitizeForTsQuery(searchTextForMatching);
  if (!normalizedSearchValue) {
    return { products: [], total: 0 };
  }

  const tsQueryV2 = buildTsQueryV2(removeAccents(normalizedSearchValue));
  const searchUnitAmountEntries = searchUnitTarget
    ? Object.entries(searchUnitTarget.amountsByUnit).filter(
        ([, amount]) => Number.isFinite(amount) && amount > 0
      )
    : [];
  const hasSearchUnitTarget = searchUnitAmountEntries.length > 0;
  const searchUnitParsedAmount = searchUnitTarget
    ? sql`${searchUnitTarget.parsed.amount}::numeric`
    : sql`NULL::numeric`;
  const searchUnitExactTolerance = sql`${SEARCH_UNIT_EXACT_TOLERANCE}::numeric`;
  const searchUnitMinTargetAmount = sql`${SEARCH_UNIT_MIN_TARGET_AMOUNT}::numeric`;

  const productBaseUnit = sql`COALESCE(fts."baseUnit", fuzzy."baseUnit")`;
  const productBaseAmount = sql`NULLIF(COALESCE(fts."baseUnitAmount", fuzzy."baseUnitAmount")::numeric, 0)`;
  const searchTargetAmountForRow = hasSearchUnitTarget
    ? sql`CASE ${sql.join(
        searchUnitAmountEntries.map(([unit, amount]) => {
          return sql`WHEN ${productBaseUnit} = ${unit} THEN ${amount}::numeric`;
        }),
        sql` `
      )} ELSE NULL::numeric END`
    : sql`NULL::numeric`;
  const searchUnitExactMatch = hasSearchUnitTarget && searchUnitTarget
    ? sql`CASE
        WHEN ${productBaseUnit} = ${searchUnitTarget.parsed.normalizedUnit}
          AND ${productBaseAmount} IS NOT NULL
          AND ABS(${productBaseAmount} - ${searchUnitParsedAmount}) <= ${searchUnitExactTolerance}
        THEN 1
        ELSE 0
      END`
    : sql`0`;
  const searchUnitSameUnit = hasSearchUnitTarget && searchUnitTarget
    ? sql`CASE
        WHEN ${productBaseUnit} = ${searchUnitTarget.parsed.normalizedUnit} THEN 1
        ELSE 0
      END`
    : sql`0`;
  const searchUnitHasEquivalent = hasSearchUnitTarget
    ? sql`CASE
        WHEN ${searchTargetAmountForRow} IS NOT NULL AND ${productBaseAmount} IS NOT NULL THEN 1
        ELSE 0
      END`
    : sql`0`;
  const searchUnitDistance = hasSearchUnitTarget
    ? sql`CASE
        WHEN ${searchTargetAmountForRow} IS NOT NULL
          AND ${productBaseAmount} IS NOT NULL
          AND ${searchTargetAmountForRow} > ${searchUnitMinTargetAmount}
        THEN ABS(LN(${productBaseAmount} / ${searchTargetAmountForRow}))
        ELSE NULL
      END`
    : sql`NULL`;
  const searchUnitTextGate = hasSearchUnitTarget
    ? sql`CASE
        WHEN (
          CASE WHEN unaccent(lower(name)) LIKE unaccent(lower(${normalizedSearchValue}))||'%' THEN 1 ELSE 0 END
        ) = 1 THEN 1
        WHEN COALESCE(ts_rank, 0) >= GREATEST(
          MAX(COALESCE(ts_rank, 0)) OVER () * ${SEARCH_UNIT_TEXT_RANK_FACTOR},
          ${SEARCH_UNIT_TEXT_RANK_MIN}
        ) THEN 1
        WHEN COALESCE(sim, 0) >= ${SEARCH_UNIT_TEXT_SIM_MIN} THEN 1
        ELSE 0
      END`
    : sql`1`;

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
                "baseUnit",
                "baseUnitAmount",
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
                "baseUnit",
                "baseUnitAmount",
                similarity(unaccent(lower(name)), unaccent(lower(${normalizedSearchValue}))) AS sim
                FROM ${products}
                WHERE unaccent(lower(name)) % unaccent(lower(${normalizedSearchValue}))
                ${hasUnitFilter && unitsArray ? sql`AND unit = ANY(${unitsArray})` : sql``}
            )
        SELECT
            COALESCE(fts.id, fuzzy.id)                AS id,
            COALESCE(ts_rank, 0)                      AS fts_rank,
            COALESCE(sim, 0)                          AS sim_score,
            COALESCE(fts.rank, fuzzy.rank)            AS product_rank,
            COALESCE(fts.relevance, 0)  AS product_relevance,
            CASE WHEN ts_rank IS NOT NULL THEN 1 ELSE 0 END AS is_exact,
            CASE WHEN unaccent(lower(name)) LIKE unaccent(lower(${normalizedSearchValue}))||'%' THEN 1 ELSE 0 END AS is_prefix,
            ${searchUnitTextGate} AS search_unit_text_gate,
            ${searchUnitExactMatch} AS search_unit_exact_match,
            ${searchUnitSameUnit} AS search_unit_same_unit,
            ${searchUnitHasEquivalent} AS search_unit_has_equivalent,
            ${searchUnitDistance} AS search_unit_distance,
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
  `)

  if (hasSearchUnitTarget) {
    query.append(sql`
      search_unit_text_gate DESC,
      is_prefix DESC,
      search_unit_exact_match DESC,
      search_unit_has_equivalent DESC,
      search_unit_distance ASC NULLS LAST,
      search_unit_same_unit DESC,
    `);
  }

  if (hasUnitFilter) {
    const unitsOrderArray = sql`ARRAY[${sql.join(unitsFilter.map((u) => sql`${u}`), sql`, `)}]`;
    query.append(sql`
      COALESCE(array_position(${unitsOrderArray}, COALESCE(fts.unit, fuzzy.unit)), ${unitsFilter.length + 1}) ASC,
    `);
  }

  if (!hasSearchUnitTarget) {
    query.append(sql` is_prefix DESC, `);
  }
  
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
      possibleBrand: true,
      productDeal: {
        columns: {
          dropPercentage: true,
        },
      },
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

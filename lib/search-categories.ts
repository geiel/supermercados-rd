"use server";

import { groups, products, productsGroups } from "@/db/schema";
import { sql } from "drizzle-orm";
import { buildTsQueryV2, removeAccents } from "./search-query";
import { sanitizeForTsQuery } from "./utils";
import { db } from "@/db";

export async function searchGroups(value: string) {
    if (!value.trim()) return [];

    const tsQueryV2 = buildTsQueryV2(removeAccents(sanitizeForTsQuery(value.trim())));
    
    const query = sql`
        WITH
            fts AS (
                SELECT ${groups.name} AS group_name, ${groups.humanNameId} AS human_id, ${groups.id} AS group_id
                FROM ${products}
                INNER JOIN ${productsGroups} ON ${productsGroups.productId} = ${products.id}
                INNER JOIN ${groups} ON ${groups.id} = ${productsGroups.groupId}
                WHERE
                (
                    name_unaccent_es @@ to_tsquery('spanish', unaccent(lower(${tsQueryV2})))
                    OR
                    name_unaccent_en @@ to_tsquery('english', unaccent(lower(${tsQueryV2})))
                )
                AND COALESCE(deleted, FALSE) = FALSE
            ),
            fuzzy AS (
                SELECT ${groups.name} AS group_name, ${groups.humanNameId} AS human_id, ${groups.id} AS group_id
                FROM ${products}
                INNER JOIN ${productsGroups} ON ${productsGroups.productId} = ${products.id}
                INNER JOIN ${groups} ON ${groups.id} = ${productsGroups.groupId}
                WHERE unaccent(lower(${products.name})) % unaccent(lower(${value}))
                AND deleted IS NOT TRUE
            ),
            combined AS (
                SELECT DISTINCT group_name, human_id, group_id FROM fts
                UNION
                SELECT DISTINCT group_name, human_id, group_id FROM fuzzy
            )
        SELECT group_name, human_id, group_id
        FROM combined
        ORDER BY similarity(unaccent(lower(group_name)), unaccent(lower(${value}))) DESC
    `;

    const rows = await db.execute<{ group_name: string; human_id: string; group_id: number }>(query);
    return rows.map((row) => ({name: row.group_name, humanId: row.human_id, groupId: row.group_id}));
}

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { buildTsQueryV2, removeAccents } from "./search-query";
import { products } from "@/db/schema";
import { EQUIVALENCE_TOLERANCE, Measurement, parseUnit } from "./unit-utils";
import { sanitizeForTsQuery } from "./utils";

export type UnitWithCount = { label: string; value: string; count: number };

export async function searchUnits(value: string): Promise<UnitWithCount[]> {
  if (!value.trim()) return [];

  const tsQueryV2 = buildTsQueryV2(removeAccents(sanitizeForTsQuery(value.trim())));
  
  const query = sql`
        WITH
            fts AS (
                SELECT id, unit
                FROM ${products}
                WHERE
                (
                    name_unaccent_es @@ to_tsquery('spanish', unaccent(lower(${tsQueryV2})))
                    OR
                    name_unaccent_en @@ to_tsquery('english', unaccent(lower(${tsQueryV2})))
                )
                AND COALESCE(deleted, FALSE) = FALSE
            ),
            fuzzy AS (
                SELECT id, unit
                FROM ${products}
                WHERE unaccent(lower(name)) % unaccent(lower(${value}))
                AND deleted IS NOT TRUE
            ),
            combined AS (
                SELECT DISTINCT id, unit FROM fts
                UNION
                SELECT DISTINCT id, unit FROM fuzzy
            )
        SELECT unit, COUNT(*) AS product_count
        FROM combined
        GROUP BY unit
    `;

  const rows = await db.execute<{ unit: string; product_count: number | string }>(query);

  const grouped: Array<{
    measurement: Measurement;
    base: number;
    units: string[];
    unitCounts: Map<string, number>;
    order: number;
    count: number;
  }> = [];

  rows.forEach((row, index) => {
    const parsed = parseUnit(row.unit);
    if (!parsed) return;

    const count = Number(row.product_count);
    if (!Number.isFinite(count)) return;

    const existing = grouped.find(
      (group) =>
        group.measurement === parsed.measurement &&
        Math.abs(group.base - parsed.base) < EQUIVALENCE_TOLERANCE
    );

    if (existing) {
      if (!existing.units.includes(parsed.display)) {
        existing.units.push(parsed.display);
      }
      existing.unitCounts.set(
        parsed.display,
        (existing.unitCounts.get(parsed.display) ?? 0) + count
      );
      existing.count += count;
    } else {
      grouped.push({
        measurement: parsed.measurement,
        base: parsed.base,
        units: [parsed.display],
        unitCounts: new Map([[parsed.display, count]]),
        order: index,
        count,
      });
    }
  });

  return grouped
    .filter((group) => group.count > 1)
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .map((group) => {
      const value = group.units.join("/");
      const label = group.units.reduce((best, unit) => {
        if (!best) return unit;

        const bestCount = group.unitCounts.get(best) ?? 0;
        const unitCount = group.unitCounts.get(unit) ?? 0;

        if (unitCount > bestCount) return unit;
        if (unitCount === bestCount && group.units.indexOf(unit) < group.units.indexOf(best)) {
          return unit;
        }

        return best;
      }, group.units[0]);

      return { label, value, count: group.count };
    });
}

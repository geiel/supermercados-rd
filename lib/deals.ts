import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";

import { db } from "@/db";
import { todaysDeals } from "@/db/schema/stats";
import { DEALS_DEFAULT_SORT, type DealsResponse, type DealsSort } from "@/types/deals";

type GetDealsOptions = {
  shopId?: number;
  offset?: number;
  limit: number;
  sort?: DealsSort;
};

export async function getDeals({
  shopId,
  offset = 0,
  limit,
  sort = DEALS_DEFAULT_SORT,
}: GetDealsOptions): Promise<DealsResponse> {
  "use cache";

  const dropFilter = gt(todaysDeals.dropPercentage, "0");
  const where =
    typeof shopId === "number"
      ? and(eq(todaysDeals.shopId, shopId), dropFilter)
      : dropFilter;

  const totalRows = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(todaysDeals)
    .where(where);

  const total = Number(totalRows[0]?.count ?? 0);

  const deals = await db.query.todaysDeals.findMany({
    where: (deals, { and, eq, gt }) => {
      const positiveDrop = gt(deals.dropPercentage, "0");
      if (typeof shopId === "number") {
        return and(eq(deals.shopId, shopId), positiveDrop);
      }
      return positiveDrop;
    },
    orderBy: (deals, { asc, desc }) => {
      switch (sort) {
        case "lowest_price":
          return [
            asc(deals.priceToday),
            desc(deals.dropPercentage),
            desc(deals.rank),
          ];
        case "highest_price":
          return [
            desc(deals.priceToday),
            desc(deals.dropPercentage),
            desc(deals.rank),
          ];
        case "relevance":
          return [desc(deals.rank), desc(deals.dropPercentage)];
        case "highest_discount":
        default:
          return [desc(deals.dropPercentage), desc(deals.rank)];
      }
    },
    with: {
      product: {
        columns: {
          categoryId: true,
        },
      },
    },
    limit,
    offset,
  });

  return {
    deals,
    total,
    nextOffset: offset + deals.length,
  };
}

export function parseShopId(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

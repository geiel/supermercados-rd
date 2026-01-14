#!/usr/bin/env tsx

import { jumbo } from "@/lib/scrappers/jumbo";
import { randomDelay } from "@/lib/scrappers/http-client";
import { db } from "@/db";
import { productsShopsPrices, productsGroups } from "@/db/schema";
import { and, eq, isNull, or, sql } from "drizzle-orm";

async function main() {
  console.log("[INFO] Starting Jumbo group-based price update");

  // Get all Jumbo shop prices for products that are in at least one group
  const jumboGroupPrices = await db
    .selectDistinctOn([productsShopsPrices.productId], {
      productId: productsShopsPrices.productId,
      shopId: productsShopsPrices.shopId,
      url: productsShopsPrices.url,
      api: productsShopsPrices.api,
      currentPrice: productsShopsPrices.currentPrice,
      regularPrice: productsShopsPrices.regularPrice,
      updateAt: productsShopsPrices.updateAt,
      hidden: productsShopsPrices.hidden,
    })
    .from(productsShopsPrices)
    .innerJoin(
      productsGroups,
      eq(productsShopsPrices.productId, productsGroups.productId)
    )
    .where(
      and(
        eq(productsShopsPrices.shopId, 3), // Jumbo
        or(
          // Normal products: not updated in 12 hours and not hidden
          and(
            or(
              isNull(productsShopsPrices.updateAt),
              sql`${productsShopsPrices.updateAt} < now() - INTERVAL '12 HOURS'`
            ),
            or(
              isNull(productsShopsPrices.hidden),
              eq(productsShopsPrices.hidden, false)
            )
          ),
          // Hidden products: not updated in 3 days
          and(
            eq(productsShopsPrices.hidden, true),
            sql`${productsShopsPrices.updateAt} < now() - INTERVAL '3 DAYS'`
          )
        )
      )
    );

  console.log(
    `[INFO] Found ${jumboGroupPrices.length} Jumbo products in groups to update`
  );

  for (const shopPrice of jumboGroupPrices) {
    await jumbo.processByProductShopPrice(shopPrice, true);
    // Random delay between 1.5-4 seconds to mimic human behavior
    await randomDelay(1500, 4000);
  }

  console.log("[INFO] Jumbo group-based price update completed");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

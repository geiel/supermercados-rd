#!/usr/bin/env tsx

import { sirena } from "@/lib/scrappers/sirena";
import { nacional } from "@/lib/scrappers/nacional";
import { jumbo } from "@/lib/scrappers/jumbo";
import { plazaLama } from "@/lib/scrappers/plaza-lama";
import { pricesmart } from "@/lib/scrappers/pricesmart";
import { bravo } from "@/lib/scrappers/bravo";
import { randomDelay } from "@/lib/scrappers/http-client";
import { db } from "@/db";
import { sql, and, eq, isNull, or } from "drizzle-orm";
import { products, productsShopsPrices } from "@/db/schema/products";

const shopIds = [1, 2, 3, 4, 5, 6] as const;
const iterationCount = 50;
const urlsPerShop = 5;

async function processShopPrice(shopPrice: {
  productId: number;
  shopId: number;
  url: string;
  api: string | null;
  currentPrice: string | null;
  regularPrice: string | null;
  updateAt: Date | null;
  hidden: boolean | null;
}) {
  switch (shopPrice.shopId) {
    case 1:
      await sirena.processByProductShopPrice(shopPrice, false, true);
      break;
    case 2:
      await nacional.processByProductShopPrice(shopPrice, false, true);
      break;
    case 3:
      await jumbo.processByProductShopPrice(shopPrice, false, true);
      break;
    case 4:
      await plazaLama.processByProductShopPrice(shopPrice, false, true);
      break;
    case 5:
      await pricesmart.processByProductShopPrice(shopPrice, false, true);
      break;
    case 6:
      await bravo.processByProductShopPrice(shopPrice, false, true);
      break;
  }
}

async function main() {
  const shopPricesFilter = and(
    or(isNull(products.deleted), eq(products.deleted, false)),
    or(
      and(
        or(
          isNull(productsShopsPrices.updateAt),
          sql`${productsShopsPrices.updateAt} < now() - INTERVAL '12 HOURS'`
        ),
        or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false))
      ),
      and(
        eq(productsShopsPrices.hidden, true),
        sql`${productsShopsPrices.updateAt} < now() - INTERVAL '3 DAYS'`
      )
    )
  );

  console.time("batch-shop-prices");
  for (let iteration = 1; iteration <= iterationCount; iteration += 1) {
    const iterationStart = Date.now();

    // Fetch 5 URLs per shop
    const perShopPrices = await Promise.all(
      shopIds.map(async (shopId) => {
        const rows = await db
          .select({
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
          .innerJoin(products, eq(productsShopsPrices.productId, products.id))
          .where(and(eq(productsShopsPrices.shopId, shopId), shopPricesFilter))
          .orderBy(productsShopsPrices.updateAt)
          .limit(urlsPerShop);

        return rows;
      })
    );

    // Calculate total URLs to process
    const totalUrls = perShopPrices.reduce((sum, prices) => sum + prices.length, 0);
    console.log(
      `[INFO] Iteration ${iteration}/${iterationCount} - ${totalUrls} URLs found across ${shopIds.length} shops`
    );

    // Process round by round: first URL from each shop, then second, etc.
    // This ensures no shop is called twice at the same time
    for (let round = 0; round < urlsPerShop; round++) {
      const roundPrices = perShopPrices
        .map((shopPrices) => shopPrices[round])
        .filter((price): price is NonNullable<typeof price> => Boolean(price));

      if (roundPrices.length === 0) break;

      console.log(
        `[INFO] Iteration ${iteration} - Round ${round + 1}/${urlsPerShop} - Processing ${roundPrices.length} URLs`
      );

      // Process one URL per shop in parallel (no shop called twice at the same time)
      await Promise.all(roundPrices.map((shopPrice) => processShopPrice(shopPrice)));

      // Add delay between rounds (600-1200ms)
      if (round < urlsPerShop - 1 && roundPrices.length > 0) {
        await randomDelay(600, 1200);
      }
    }

    await randomDelay(600, 1200);

    const iterationTime = Date.now() - iterationStart;
    console.log(`[INFO] Iteration ${iteration}/${iterationCount} completed in ${iterationTime}ms`);
  }
  console.timeEnd("batch-shop-prices");

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

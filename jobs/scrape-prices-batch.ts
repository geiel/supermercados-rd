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
const iterationCount = 120;

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
          .limit(1);

        return rows[0];
      })
    );

    const shopPrices = perShopPrices.filter(
      (shopPrice): shopPrice is NonNullable<typeof shopPrice> => Boolean(shopPrice)
    );

    console.log(
      `[INFO] Iteration ${iteration}/${iterationCount} - ${shopPrices.length} shop prices found`
    );

    await Promise.all(
      shopPrices.map(async (shopPrice) => {
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
      })
    );

    await randomDelay(800, 1000);
  }
  console.timeEnd("batch-shop-prices");

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

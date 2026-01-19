#!/usr/bin/env tsx

import { sirena } from "@/lib/scrappers/sirena";
import { nacional } from "@/lib/scrappers/nacional";
import { plazaLama } from "@/lib/scrappers/plaza-lama";
import { pricesmart } from "@/lib/scrappers/pricesmart";
import { bravo } from "@/lib/scrappers/bravo";
import { randomDelay } from "@/lib/scrappers/http-client";
import { db } from "@/db";
import { sql, and, eq, isNull, ne, or } from "drizzle-orm";
import { products, productsShopsPrices } from "@/db/schema/products";

async function main() {
  const allShopPrices = await db
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
    .where(
      and(
        ne(productsShopsPrices.shopId, 3),
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
      )
    )
    .limit(1000);

  console.log(`[INFO] Found ${allShopPrices.length} shop prices to update`);

  for (const shopPrice of allShopPrices) {
    switch (shopPrice.shopId) {
      case 1:
        await sirena.processByProductShopPrice(shopPrice);
        break;
      case 2:
        await nacional.processByProductShopPrice(shopPrice);
        break;
      case 4:
        await plazaLama.processByProductShopPrice(shopPrice);
        break;
      case 5:
        await pricesmart.processByProductShopPrice(shopPrice);
        break;
      case 6:
        await bravo.processByProductShopPrice(shopPrice);
    }
    await randomDelay(1000, 2000);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

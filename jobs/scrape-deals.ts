#!/usr/bin/env tsx

import { sirena } from "@/lib/scrappers/sirena";
import { nacional } from "@/lib/scrappers/nacional";
import { jumbo } from "@/lib/scrappers/jumbo";
import { plazaLama } from "@/lib/scrappers/plaza-lama";
import { pricesmart } from "@/lib/scrappers/pricesmart";
import { bravo } from "@/lib/scrappers/bravo";
import { randomDelay } from "@/lib/scrappers/http-client";
import { db } from "@/db";
import { sql } from "drizzle-orm";

async function main() {

  const deals = await db.query.todaysDeals.findMany({
    with: {
        product: {
            with: {
                shopCurrentPrices: true
            }
        }
    }
  });

  for (const shopPrice of deals.flatMap(deal => deal.product.shopCurrentPrices)) {
    switch (shopPrice.shopId) {
      case 1:
        await sirena.processByProductShopPrice(shopPrice, true);
        break;
      case 2:
        await nacional.processByProductShopPrice(shopPrice, true);
        break;
      case 3:
        await jumbo.processByProductShopPrice(shopPrice, true);
        break;
      case 4:
        await plazaLama.processByProductShopPrice(shopPrice, true);
        break;
      case 5:
        await pricesmart.processByProductShopPrice(shopPrice, true);
        break;
      case 6:
        await bravo.processByProductShopPrice(shopPrice, true);
    }
    // Random delay between 1.5-4 seconds to mimic human behavior
    await randomDelay(1500, 4000);
  }

  console.log("[INFO] Start running refresh deals function");
  await db.execute(sql`SELECT public.refresh_todays_deals()`);
  console.log("[INFO] refresh deals completed");

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

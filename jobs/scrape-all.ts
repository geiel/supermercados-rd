#!/usr/bin/env tsx

import { sirena } from "@/lib/scrappers/sirena";
import { nacional } from "@/lib/scrappers/nacional";
import { plazaLama } from "@/lib/scrappers/plaza-lama";
import { pricesmart } from "@/lib/scrappers/pricesmart";
import { bravo } from "@/lib/scrappers/bravo";
import { randomDelay } from "@/lib/scrappers/http-client";
import { db } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
  const allShopPrices = await db.query.productsShopsPrices.findMany({
    where: (scp, { isNull, eq, or, and }) =>
      or(
        and(
          or(
            isNull(scp.updateAt),
            sql`${scp.updateAt} < now() - INTERVAL '12 HOURS'`
          ),
          or(isNull(scp.hidden), eq(scp.hidden, false))
        ),
        and(
          eq(scp.hidden, true),
          sql`${scp.updateAt} < now() - INTERVAL '3 DAYS'`
        )
      ),
    limit: 1000,
  });

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

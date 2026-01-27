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

type ShopPrice = {
  productId: number;
  shopId: number;
  url: string;
  api: string | null;
  currentPrice: string | null;
  regularPrice: string | null;
  updateAt: Date | null;
  hidden: boolean | null;
};

const shopIds = [1, 2, 3, 4, 5, 6] as const;

async function processShopPrice(shopPrice: ShopPrice) {
  switch (shopPrice.shopId) {
    case 1:
      await sirena.processByProductShopPrice(shopPrice, true, true);
      break;
    case 2:
      await nacional.processByProductShopPrice(shopPrice, true, true);
      break;
    case 3:
      await jumbo.processByProductShopPrice(shopPrice, true, true);
      break;
    case 4:
      await plazaLama.processByProductShopPrice(shopPrice, true, true);
      break;
    case 5:
      await pricesmart.processByProductShopPrice(shopPrice, true, true);
      break;
    case 6:
      await bravo.processByProductShopPrice(shopPrice, true, true);
      break;
  }
}

async function main() {
  const deals = await db.query.todaysDeals.findMany({
    with: {
      product: {
        with: {
          shopCurrentPrices: true,
        },
      },
    },
  });

  const shopPrices: ShopPrice[] = deals.flatMap(
    (deal) => deal.product.shopCurrentPrices
  );
  const perShopPrices = shopIds.map((shopId) =>
    shopPrices.filter((shopPrice) => shopPrice.shopId === shopId)
  );
  const totalUrls = perShopPrices.reduce((sum, prices) => sum + prices.length, 0);

  console.log(
    `[INFO] ${totalUrls} URLs found across ${shopIds.length} shops`
  );

  const totalRounds = Math.max(0, ...perShopPrices.map((prices) => prices.length));

  console.time("deals-shop-prices");
  for (let round = 0; round < totalRounds; round += 1) {
    const roundPrices = perShopPrices
      .map((shopPrices) => shopPrices[round])
      .filter((price): price is ShopPrice => Boolean(price));

    if (roundPrices.length === 0) break;

    console.log(
      `[INFO] Round ${round + 1}/${totalRounds} - Processing ${roundPrices.length} URLs`
    );

    await Promise.all(roundPrices.map((shopPrice) => processShopPrice(shopPrice)));

    if (round < totalRounds - 1 && roundPrices.length > 0) {
      await randomDelay(600, 1200);
    }
  }
  console.timeEnd("deals-shop-prices");

  console.log("[INFO] Start running refresh deals function");
  await db.execute(sql`SELECT public.refresh_todays_deals()`);
  console.log("[INFO] refresh deals completed");

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

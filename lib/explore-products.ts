import "server-only";

import * as Sentry from "@sentry/nextjs";
import { db } from "@/db";
import type { productsShopsPrices as ProductShopPrice } from "@/db/schema";
import { searchProducts } from "@/lib/search-query";
import { sirena } from "@/lib/scrappers/sirena";
import { nacional } from "@/lib/scrappers/nacional";
import { plazaLama } from "@/lib/scrappers/plaza-lama";
import { pricesmart } from "@/lib/scrappers/pricesmart";
import { bravo } from "@/lib/scrappers/bravo";
import type { FetchWithRetryConfig } from "@/lib/scrappers/http-client";
import { getExploreParentGroups } from "@/lib/explore-groups";
import {
  EXPLORE_PREFETCH_COUNT,
  EXPLORE_SYNC_COUNT,
  type ExploreProduct,
  type ExploreProductsResponse,
} from "@/types/explore";

const EXPLORE_SCRAPER_REQUEST_CONFIG: FetchWithRetryConfig = {
  timeoutMs: 7000,
  maxRetries: 1,
};

type ProductWithRelations = {
  id: number;
  name: string;
  unit: string;
  categoryId: number;
  image: string | null;
  brand: { id: number; name: string };
  possibleBrand: { id: number; name: string } | null;
  shopCurrentPrices: ProductShopPrice[];
  productDeal: { dropPercentage: string | number } | null;
};

type ExploreProductsQuery = {
  value: string;
  offset?: number;
  prefetchIds?: number[];
  displayCount?: number;
  prefetchCount?: number;
  includeHiddenProducts?: boolean;
};

async function updateShopPrices(shopPrices: ProductShopPrice[]) {
  await Promise.all(
    shopPrices.map(async (shopPrice) => {
      try {
        switch (shopPrice.shopId) {
          case 1:
            await sirena.processByProductShopPrice(
              shopPrice,
              false,
              false,
              EXPLORE_SCRAPER_REQUEST_CONFIG
            );
            return;
          case 2:
            await nacional.processByProductShopPrice(
              shopPrice,
              false,
              false,
              EXPLORE_SCRAPER_REQUEST_CONFIG
            );
            return;
          case 4:
            await plazaLama.processByProductShopPrice(
              shopPrice,
              false,
              false,
              EXPLORE_SCRAPER_REQUEST_CONFIG
            );
            return;
          case 5:
            await pricesmart.processByProductShopPrice(
              shopPrice,
              false,
              false,
              EXPLORE_SCRAPER_REQUEST_CONFIG
            );
            return;
          case 6:
            await bravo.processByProductShopPrice(
              shopPrice,
              false,
              false,
              EXPLORE_SCRAPER_REQUEST_CONFIG
            );
            return;
          default:
            return;
        }
      } catch (error) {
        console.error(
          "[explore-products] Ignored scraper error",
          shopPrice.shopId,
          shopPrice.productId,
          error
        );
      }
    })
  );
}

function getLowestCurrentPrice(shopPrices: ProductShopPrice[]) {
  let lowest: number | null = null;

  for (const shopPrice of shopPrices) {
    if (shopPrice.currentPrice === null) {
      continue;
    }

    const parsedPrice = Number(shopPrice.currentPrice);
    if (!Number.isFinite(parsedPrice)) {
      continue;
    }

    if (lowest === null || parsedPrice < lowest) {
      lowest = parsedPrice;
    }
  }

  return lowest === null ? null : String(lowest);
}

async function fetchProductsByIds(
  ids: number[],
  includeHiddenProducts: boolean
) {
  if (ids.length === 0) {
    return [];
  }

  const shouldFilterShopCurrentPrices = !includeHiddenProducts;

  const products = await db.query.products.findMany({
    columns: {
      id: true,
      name: true,
      unit: true,
      categoryId: true,
      image: true,
    },
    where: (products, { inArray }) => inArray(products.id, ids),
    with: {
      shopCurrentPrices: shouldFilterShopCurrentPrices
        ? {
            where: (shopPrice, { eq, isNull, or }) => {
              const visibleCondition = or(
                isNull(shopPrice.hidden),
                eq(shopPrice.hidden, false)
              );

              return visibleCondition;
            },
          }
        : true,
      brand: {
        columns: {
          id: true,
          name: true,
        },
      },
      possibleBrand: {
        columns: {
          id: true,
          name: true,
        },
      },
      productDeal: {
        columns: {
          dropPercentage: true,
        },
      },
    },
  });

  const byId = new Map(products.map((product) => [product.id, product]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as ProductWithRelations[];
}

function toExploreProduct(
  product: ProductWithRelations,
  shopLogos: Map<number, string>,
  currentPrice: string | null
): ExploreProduct {
  return {
    id: product.id,
    name: product.name,
    unit: product.unit,
    categoryId: product.categoryId,
    image: product.image,
    brand: { id: product.brand.id, name: product.brand.name },
    possibleBrand: product.possibleBrand
      ? { id: product.possibleBrand.id, name: product.possibleBrand.name }
      : null,
    currentPrice,
    shopLogo:
      product.shopCurrentPrices.length === 1
        ? shopLogos.get(product.shopCurrentPrices[0].shopId) ?? null
        : null,
    productDeal: product.productDeal ?? null,
  };
}

export async function getExploreProducts({
  value,
  offset = 0,
  prefetchIds = [],
  displayCount = EXPLORE_SYNC_COUNT,
  prefetchCount = EXPLORE_PREFETCH_COUNT,
  includeHiddenProducts = false,
}: ExploreProductsQuery): Promise<ExploreProductsResponse> {
  const rawSearchValue = value.trim();

  const prefetchedProducts = await fetchProductsByIds(
    prefetchIds,
    includeHiddenProducts
  );
  const prefetchNeeded = Math.min(displayCount, prefetchedProducts.length);
  const remainingNeeded = displayCount - prefetchNeeded;
  const fetchCount = remainingNeeded + prefetchCount;

  const productsAndTotal = await searchProducts(
    rawSearchValue,
    fetchCount,
    offset,
    true,
    undefined,
    includeHiddenProducts
  );

  let total = productsAndTotal.total;
  const filteredNewProducts = productsAndTotal.products.filter((product) => {
    if (product.shopCurrentPrices.length === 0) {
      total -= 1;
      return false;
    }

    return true;
  });

  const displayProducts = [
    ...prefetchedProducts.slice(0, prefetchNeeded),
    ...filteredNewProducts.slice(0, remainingNeeded),
  ];

  const prefetchedNext = [
    ...prefetchedProducts.slice(prefetchNeeded),
    ...filteredNewProducts.slice(remainingNeeded),
  ];

  const displayShopPrices = displayProducts.flatMap(
    (product) => product.shopCurrentPrices
  );
  void updateShopPrices(displayShopPrices).catch((error) => {
    Sentry.logger.error("[explore-products] Visible price refresh failed", { error });
  });

  const prefetchShopPrices = prefetchedNext.flatMap(
    (product) => product.shopCurrentPrices
  );
  if (prefetchShopPrices.length > 0) {
    void updateShopPrices(prefetchShopPrices).catch((error) => {
      Sentry.logger.error("[explore-products] Prefetch update failed", { error });
    });
  }

  const shops = await db.query.shops.findMany({
    columns: {
      id: true,
      logo: true,
    },
  });
  const shopLogos = new Map(shops.map((shop) => [shop.id, shop.logo]));

  const nextOffset = offset + productsAndTotal.products.length;
  const groupResults =
    offset === 0
      ? await (async () => {
          return getExploreParentGroups(
            rawSearchValue,
            10
          );
        })()
      : [];

  const products = displayProducts.map((product) =>
    toExploreProduct(product, shopLogos, getLowestCurrentPrice(product.shopCurrentPrices))
  );

  const prefetch = prefetchedNext.map((product) =>
    toExploreProduct(product, shopLogos, null)
  );

  return { products, prefetch, total, nextOffset, groupResults };
}

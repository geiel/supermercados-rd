import "server-only";

import { db } from "@/db";
import type { productsShopsPrices } from "@/db/schema";
import { searchProducts } from "@/lib/search-query";
import { sirena } from "@/lib/scrappers/sirena";
import { nacional } from "@/lib/scrappers/nacional";
import { plazaLama } from "@/lib/scrappers/plaza-lama";
import { pricesmart } from "@/lib/scrappers/pricesmart";
import { bravo } from "@/lib/scrappers/bravo";
import { sanitizeForTsQuery } from "@/lib/utils";
import {
  EXPLORE_PREFETCH_COUNT,
  EXPLORE_SYNC_COUNT,
  type ExploreProduct,
  type ExploreProductsResponse,
} from "@/types/explore";

type ProductWithRelations = {
  id: number;
  name: string;
  unit: string;
  categoryId: number;
  image: string | null;
  brand: { id: number; name: string };
  possibleBrand: { id: number; name: string } | null;
  shopCurrentPrices: productsShopsPrices[];
  productDeal: { dropPercentage: string | number } | null;
};

type ExploreProductsQuery = {
  value: string;
  offset?: number;
  prefetchIds?: number[];
  displayCount?: number;
  prefetchCount?: number;
  shopIds?: number[];
  includeHiddenProducts?: boolean;
  onlyShopProducts?: boolean;
  unitFilters?: string[];
};

async function updateShopPrices(shopPrices: productsShopsPrices[]) {
  await Promise.all(
    shopPrices.map((shopPrice) => {
      switch (shopPrice.shopId) {
        case 1:
          return sirena.processByProductShopPrice(shopPrice);
        case 2:
          return nacional.processByProductShopPrice(shopPrice);
        case 4:
          return plazaLama.processByProductShopPrice(shopPrice);
        case 5:
          return pricesmart.processByProductShopPrice(shopPrice);
        case 6:
          return bravo.processByProductShopPrice(shopPrice);
        default:
          return Promise.resolve();
      }
    })
  );
}

async function fetchLowestPrices(
  productIds: number[],
  includeHiddenProducts: boolean
) {
  if (productIds.length === 0) {
    return new Map<number, string | null>();
  }

  const prices = await Promise.all(
    productIds.map(async (productId) => {
      const lowerPrice = await db.query.productsShopsPrices.findFirst({
        columns: {
          currentPrice: true,
        },
        where: (priceTable, { isNotNull, eq, and, or, isNull }) =>
          includeHiddenProducts
            ? and(
                isNotNull(priceTable.currentPrice),
                eq(priceTable.productId, productId)
              )
            : and(
                isNotNull(priceTable.currentPrice),
                eq(priceTable.productId, productId),
                or(isNull(priceTable.hidden), eq(priceTable.hidden, false))
              ),
        orderBy: (priceTable, { asc }) => [asc(priceTable.currentPrice)],
      });

      return { productId, currentPrice: lowerPrice?.currentPrice ?? null };
    })
  );

  return new Map(prices.map((price) => [price.productId, price.currentPrice]));
}

async function fetchProductsByIds(ids: number[]) {
  if (ids.length === 0) {
    return [];
  }

  const products = await db.query.products.findMany({
    where: (products, { inArray }) => inArray(products.id, ids),
    with: {
      shopCurrentPrices: true,
      brand: true,
      possibleBrand: true,
      productDeal: {
        columns: {
          dropPercentage: true
        }
      }
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
  shopIds = [],
  includeHiddenProducts = false,
  onlyShopProducts = false,
  unitFilters = [],
}: ExploreProductsQuery): Promise<ExploreProductsResponse> {
  const rawSearchValue = value.trim();
  const sanitizedSearchValue = sanitizeForTsQuery(rawSearchValue);

  const prefetchedProducts = await fetchProductsByIds(prefetchIds);
  const prefetchNeeded = Math.min(displayCount, prefetchedProducts.length);
  const remainingNeeded = displayCount - prefetchNeeded;
  const fetchCount = remainingNeeded + prefetchCount;

  const productsAndTotal = await searchProducts(
    sanitizedSearchValue,
    fetchCount,
    offset,
    true,
    shopIds,
    includeHiddenProducts,
    onlyShopProducts,
    unitFilters
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
  await updateShopPrices(displayShopPrices);

  const prefetchShopPrices = prefetchedNext.flatMap(
    (product) => product.shopCurrentPrices
  );
  if (prefetchShopPrices.length > 0) {
    void updateShopPrices(prefetchShopPrices).catch((error) => {
      console.error("[explore-products] Prefetch update failed", error);
    });
  }

  const productIds = displayProducts.map((product) => product.id);
  const lowestPrices = await fetchLowestPrices(productIds, includeHiddenProducts);

  const shops = await db.query.shops.findMany({
    columns: {
      id: true,
      logo: true,
    },
  });
  const shopLogos = new Map(shops.map((shop) => [shop.id, shop.logo]));

  const products = displayProducts.map((product) =>
    toExploreProduct(product, shopLogos, lowestPrices.get(product.id) ?? null)
  );

  const prefetch = prefetchedNext.map((product) =>
    toExploreProduct(product, shopLogos, null)
  );

  const nextOffset = offset + productsAndTotal.products.length;

  return { products, prefetch, total, nextOffset };
}

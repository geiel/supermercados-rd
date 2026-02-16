import { AddToListButton } from "@/components/add-to-list-button";
import { Price } from "@/components/price";
import { PricePerUnit } from "@/components/price-per-unit";
import { PricesChart } from "@/components/prices-chart";
import { ProductBrand } from "@/components/product-brand";
import { ProductFeedbackSection } from "@/components/product-feedback-section";
import { ProductImage } from "@/components/product-image";
import { RelatedProducts } from "@/components/related-products";
import { ShopPriceRowActions } from "@/components/shop-price-row";
import { ScrollToSection } from "@/components/scroll-to-section";
import { Button } from "@/components/ui/button";
import { Unit } from "@/components/unit";
import { GroupBreadcrumbs } from "@/components/group-breadcrumbs";
import { db } from "@/db";
import { categoriesGroups, products, productsGroups, productsShopsPrices } from "@/db/schema";
import { getGroupBreadcrumbPaths, type GroupBreadcrumbItem } from "@/lib/group-breadcrumbs";
import { formatPriceValue } from "@/lib/price-format";
import { and, desc, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import {
  ChartNoAxesColumnDecreasing,
  MessageCircleWarning,
  TrendingDown,
} from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cacheTag, cacheLife } from "next/cache";

type Props = {
  params: Promise<{ id: string; url_name: string }>;
};

const MAX_ALLOWED_RELATED_PRODUCTS = 16;
const HIGH_SIMILARITY_SIM_SCORE_THRESHOLD = 0.5;
const NO_GROUP_SIMILARITY_MIN_THRESHOLD = 0.3;
const PARENT_GROUP_FALLBACK_SIMILARITY_MIN_THRESHOLD = 0.1;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, url_name } = await params;
  const product = await getProductMetadata(Number(id));

  if (!product) {
    return { title: "Producto no encontrado" };
  }

  const lowestPrice = product.shopCurrentPrices[0]?.currentPrice;
  const brandName = product.brand?.name;
  const title = `${product.name} ${product.unit} - Precio en RD | SupermercadosRD`;
  const description = brandName
    ? `Compara precios de ${product.name} ${product.unit} de ${brandName}${lowestPrice ? ` desde RD$${lowestPrice}` : ""} en supermercados de República Dominicana.`
    : `Compara precios de ${product.name} ${product.unit}${lowestPrice ? ` desde RD$${lowestPrice}` : ""} en supermercados de República Dominicana.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/productos/${url_name}/${id}`,
      images: product.image
        ? [{ url: product.image, alt: title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.image ? [product.image] : undefined,
    },
    alternates: {
      canonical: `/productos/${url_name}/${id}`,
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  const product = await getProductData(Number(id));

  if (!product) {
    return <div>Producto no encontrado.</div>;
  }

  const groupIds = product.groupProduct.map((groupProduct) => groupProduct.groupId);
  const groupBreadcrumbs = await getGroupBreadcrumbPaths(groupIds);
  const relatedProductsGroupLink = await getRelatedProductsGroupLink(
    groupBreadcrumbs
  );
  const relatedProductsCategoryLink =
    getRelatedProductsCategoryLink(groupBreadcrumbs);
  const relatedProductsGroupData = getPrimaryRelatedGroupAndParent(
    groupBreadcrumbs
  );
  const relatedProductsPrimaryGroup = relatedProductsGroupData?.group ?? null;
  const relatedProductsParentGroup =
    relatedProductsGroupData?.parentGroup ?? null;

  const shopsPromise = getShops();
  let relatedProducts = !relatedProductsPrimaryGroup
    ? await getRelatedProductsBySimilarityNoGroup(
        product.name,
        product.id,
        MAX_ALLOWED_RELATED_PRODUCTS
      )
    : relatedProductsCategoryLink
      ? await getHighRankingRelatedProductsByCategory(
          product.name,
          product.id,
          relatedProductsCategoryLink.id,
          MAX_ALLOWED_RELATED_PRODUCTS
        )
      : [];

  if (
    relatedProductsPrimaryGroup &&
    relatedProducts.length < MAX_ALLOWED_RELATED_PRODUCTS
  ) {
    const fallbackProductsFromPrimaryGroup = await getRelatedProductsFromSameGroup(
      {
        groupId: relatedProductsPrimaryGroup.id,
        currentProductId: product.id,
        excludedProductIds: relatedProducts.map((item) => item.id),
        limit: MAX_ALLOWED_RELATED_PRODUCTS - relatedProducts.length,
      }
    );

    relatedProducts = [
      ...relatedProducts,
      ...fallbackProductsFromPrimaryGroup,
    ].slice(0, MAX_ALLOWED_RELATED_PRODUCTS);
  }

  if (
    relatedProductsParentGroup &&
    relatedProducts.length < MAX_ALLOWED_RELATED_PRODUCTS
  ) {
    const fallbackProductsFromParentGroup =
      await getRelatedProductsFromGroupByNameSimilarity({
        groupId: relatedProductsParentGroup.id,
        currentProductName: product.name,
        currentProductId: product.id,
        excludedProductIds: relatedProducts.map((item) => item.id),
        limit: MAX_ALLOWED_RELATED_PRODUCTS - relatedProducts.length,
        minimumSimilarity: PARENT_GROUP_FALLBACK_SIMILARITY_MIN_THRESHOLD,
      });

    relatedProducts = [...relatedProducts, ...fallbackProductsFromParentGroup].slice(
      0,
      MAX_ALLOWED_RELATED_PRODUCTS
    );
  }
  const shops = await shopsPromise;
  const shopLogoById = new Map(shops.map((shop) => [shop.id, shop.logo]));

  const badgeType = getPriceBadgeType(product);

  // Calculate price range for JSON-LD
  const prices = product.shopCurrentPrices
    .map((sp) => Number(sp.currentPrice))
    .filter((p) => !isNaN(p) && p > 0);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;
  const highestPrice = prices.length > 0 ? Math.max(...prices) : null;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: `${product.name} ${product.unit}`,
    image: product.image || undefined,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand.name }
      : undefined,
    offers:
      prices.length > 0
        ? { 
            "@type": "AggregateOffer",
            priceCurrency: "DOP",
            lowPrice: lowestPrice,
            highPrice: highestPrice,
            offerCount: product.shopCurrentPrices.length,
            availability: "https://schema.org/InStock",
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 xl:gap-10 py-4 px-4 md:px-10">
      <section>
        <div className="flex flex-col gap-2 sticky top-0">
          <GroupBreadcrumbs paths={groupBreadcrumbs} compactMobileMode="last" />
          <div>
            <ProductBrand brand={product.brand} possibleBrand={product.possibleBrand} type="product" />
            <div className="flex items-center gap-2">
              <div className="text-xl">{product.name}</div>
              <AddToListButton productId={product.id} />
            </div>
          </div>
          <Unit unit={product.unit} className="font-bold" />
          <div className="px-4 py-8">
            <div className="flex flex-col gap-4 justify-center items-center">
              <div className="h-[290px] w-[290px] md:h-[500px] md:w-[500px] relative">
                {product.image ? (
                  <ProductImage
                    src={product.image}
                    productId={product.id}
                    fill
                    sizes="(max-width: 768px) 290px, 500px"
                    style={{
                      objectFit: "contain",
                    }}
                    alt={product.name + product.unit}
                    placeholder="blur"
                    blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                    className="max-w-none"
                  />
                ) : <Image 
                      src="/no-product-found.jpg" alt="image product not found" 
                      unoptimized
                      fill
                      sizes="(max-width: 768px) 290px, 500px"
                      placeholder="blur"
                      blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                      className="max-w-none" />}
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="flex flex-col gap-10">
        <section className="flex flex-col">
          {badgeType ? (
            <ScrollToSection
              targetId="historial-precios"
              className="mb-4 inline-flex w-fit cursor-pointer items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-left text-sm shadow-xs transition-all hover:border-gray-300 hover:shadow-sm hover:opacity-90"
            >
              <span className="flex shrink-0 text-purple-600 [&>svg]:size-6">
                {badgeType.type === "all-time-low" ? (
                  <TrendingDown strokeWidth={2} />
                ) : (
                  <ChartNoAxesColumnDecreasing strokeWidth={2} />
                )}
              </span>
              <span className="font-medium text-foreground">
                {badgeType.type === "all-time-low"
                  ? "Buen momento para comprar! Precio más bajo registrado"
                  : `Buen momento para comprar! Precios estan RD$${formatPriceDelta(badgeType.amount)} más barato de lo normal`}
              </span>
            </ScrollToSection>
          ) : null}
          <div className="font-bold text-2xl">Donde comprar</div>
          {product.shopCurrentPrices
            .filter((shopPrice) => shopPrice.currentPrice !== null)
            .map((shopPrice, i) => {
              const logo = shopLogoById.get(shopPrice.shopId);
              if (!logo) {
                return null;
              }

              return (
                <div
                  key={i}
                  className="grid grid-cols-4 items-center py-4"
                  hidden={Boolean(shopPrice.hidden)}
                >
                  <Image
                    src={`/supermarket-logo/${logo}`}
                    width={0}
                    height={0}
                    className="w-[50px] h-auto"
                    alt="Supermarket logo"
                    unoptimized
                  />
                  <ShopPrice
                    shopPrice={shopPrice}
                    unit={product.unit}
                    categoryId={product.categoryId}
                    productName={product.name}
                  />
                  <ShopPriceRowActions
                    shopId={shopPrice.shopId}
                    productId={product.id}
                    url={shopPrice.url}
                    api={shopPrice.api}
                    shops={shops}
                  />
                </div>
              );
            })}

          <div className="mt-4 flex items-center space-x-2">
            <MessageCircleWarning size={20} />
            <small className="text-sm leading-none font-medium">
              Estos precios están disponibles online y pueden variar en la tienda.
            </small>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-2xl">Productos relacionados</div>
            {relatedProductsGroupLink ? (
              <Button variant="link" size="sm" asChild className="h-auto p-0">
                <Link href={relatedProductsGroupLink.href}>Ver todas</Link>
              </Button>
            ) : null}
          </div>
          <RelatedProducts relatedProducts={relatedProducts} />
        </section>

        <section
          id="historial-precios"
          className="flex flex-col gap-2 scroll-mt-4"
        >
          <div className="font-bold text-2xl">Historial de precios</div>
          <PricesChart
            priceHistory={product.pricesHistory}
            currentPrices={product.shopCurrentPrices}
            shops={shops}
            visibilityHistory={product.visibilityHistory}
          />
        </section>

        <ProductFeedbackSection productId={product.id} shops={shops} />
      </div>
      </div>
    </>
  );
}

type PriceBadge =
  | { type: "all-time-low" }
  | { type: "below-3-month-avg"; amount: number }
  | null;

type PricePoint = {
  date: Date;
  price: number;
};

type VisibilityPoint = {
  date: Date;
  visible: boolean;
};

const toValidPrice = (value: string | null | undefined) => {
  const numeric = value == null ? NaN : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
};

const formatPriceDelta = (value: number) => {
  return formatPriceValue(value);
};

function getPriceBadgeType(product: {
  shopCurrentPrices: Array<{
    shopId: number;
    currentPrice: string | null;
    updateAt?: Date | null;
  }>;
  pricesHistory: Array<{ shopId: number; price: string; createdAt: Date }>;
  visibilityHistory: Array<{
    shopId: number;
    visibility: "visible" | "hidden";
    createdAt: Date;
  }>;
}): PriceBadge {
  const priceHistories = new Map<number, PricePoint[]>();

  for (const entry of product.pricesHistory) {
    const price = toValidPrice(entry.price);
    if (price == null) continue;
    const list = priceHistories.get(entry.shopId) ?? [];
    list.push({ date: new Date(entry.createdAt), price });
    priceHistories.set(entry.shopId, list);
  }

  for (const entry of product.shopCurrentPrices) {
    const price = toValidPrice(entry.currentPrice);
    if (price == null) continue;
    const list = priceHistories.get(entry.shopId) ?? [];
    list.push({
      date: entry.updateAt ? new Date(entry.updateAt) : new Date(),
      price,
    });
    priceHistories.set(entry.shopId, list);
  }

  if (priceHistories.size === 0) return null;

  for (const [shopId, list] of priceHistories) {
    list.sort((a, b) => a.date.getTime() - b.date.getTime());
    const deduped: PricePoint[] = [];
    for (const item of list) {
      const last = deduped[deduped.length - 1];
      if (!last || last.date.getTime() !== item.date.getTime()) {
        deduped.push(item);
      } else {
        deduped[deduped.length - 1] = item;
      }
    }
    priceHistories.set(shopId, deduped);
  }

  const visibilityHistories = new Map<number, VisibilityPoint[]>();
  for (const entry of product.visibilityHistory) {
    const list = visibilityHistories.get(entry.shopId) ?? [];
    list.push({
      date: new Date(entry.createdAt),
      visible: entry.visibility === "visible",
    });
    visibilityHistories.set(entry.shopId, list);
  }

  for (const [shopId, list] of visibilityHistories) {
    list.sort((a, b) => a.date.getTime() - b.date.getTime());
    const deduped: VisibilityPoint[] = [];
    for (const item of list) {
      const last = deduped[deduped.length - 1];
      if (!last || last.date.getTime() !== item.date.getTime()) {
        deduped.push(item);
      } else {
        deduped[deduped.length - 1] = item;
      }
    }
    visibilityHistories.set(shopId, deduped);
  }

  const shopIds = new Set<number>();
  priceHistories.forEach((_, shopId) => shopIds.add(shopId));
  visibilityHistories.forEach((_, shopId) => shopIds.add(shopId));

  const shopIdList = Array.from(shopIds);
  const priceHistoriesByShop = shopIdList.map(
    (shopId) => priceHistories.get(shopId) ?? []
  );
  const visibilityHistoriesByShop = shopIdList.map(
    (shopId) => visibilityHistories.get(shopId) ?? []
  );

  const priceIndices = priceHistoriesByShop.map(() => 0);
  const visibilityIndices = visibilityHistoriesByShop.map(() => 0);
  const lastPrices = priceHistoriesByShop.map(() => null as number | null);
  const visibilityStates = visibilityHistoriesByShop.map(() => true);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const dailyCheapest: number[] = [];
  let currentCheapest: number | null = null;

  for (
    const day = new Date(threeMonthsAgo);
    day.getTime() <= today.getTime();
    day.setDate(day.getDate() + 1)
  ) {
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    let cheapest: number | null = null;

    for (let index = 0; index < shopIdList.length; index += 1) {
      const history = priceHistoriesByShop[index];
      while (
        priceIndices[index] < history.length &&
        history[priceIndices[index]].date.getTime() <= dayEnd.getTime()
      ) {
        lastPrices[index] = history[priceIndices[index]].price;
        priceIndices[index] += 1;
      }

      const visibilityHistory = visibilityHistoriesByShop[index];
      while (
        visibilityIndices[index] < visibilityHistory.length &&
        visibilityHistory[visibilityIndices[index]].date.getTime() <=
          dayEnd.getTime()
      ) {
        visibilityStates[index] = visibilityHistory[visibilityIndices[index]].visible;
        visibilityIndices[index] += 1;
      }

      const price = lastPrices[index];
      if (price == null || !visibilityStates[index]) continue;

      if (cheapest === null || price < cheapest) {
        cheapest = price;
      }
    }

    if (cheapest != null) {
      dailyCheapest.push(cheapest);
      currentCheapest = cheapest;
    }
  }

  if (currentCheapest == null) return null;

  const droppedInLast3Months = dailyCheapest.some(
    (price) => price > currentCheapest
  );

  const historicalPrices = product.pricesHistory
    .map((h) => toValidPrice(h.price))
    .filter((p): p is number => p != null);
  if (historicalPrices.length > 0) {
    const allTimeLowPrice = Math.min(...historicalPrices);
    if (droppedInLast3Months && currentCheapest <= allTimeLowPrice) {
      return { type: "all-time-low" };
    }
  }

  if (dailyCheapest.length === 0) return null;
  const avgLast3Months =
    dailyCheapest.reduce((a, b) => a + b, 0) / dailyCheapest.length;
  if (currentCheapest < avgLast3Months) {
    const amount = avgLast3Months - currentCheapest;
    const roundedAmount = Math.round(amount * 100) / 100;
    if (roundedAmount <= 0) return null;

    if (currentCheapest < 50 && roundedAmount < 3) {
      return null;
    }

    if (currentCheapest >= 50 && currentCheapest <= 150 && roundedAmount < 5) {
      return null;
    }

    if (currentCheapest > 150 && roundedAmount < 10) {
      return null;
    }

    return { type: "below-3-month-avg", amount: roundedAmount };
  }

  return null;
}

function ShopPrice({
  shopPrice,
  unit,
  categoryId,
  productName,
}: {
  shopPrice: { currentPrice: string | null; regularPrice: string | null };
  unit: string;
  categoryId: number;
  productName: string;
}) {
  return (
    <div className="col-span-2">
      <div className="flex gap-1 items-center overflow-auto">
        <Price value={shopPrice.currentPrice} className="font-bold text-lg" />
        {Number(shopPrice.currentPrice) < Number(shopPrice.regularPrice) ? (
          <Price
            value={shopPrice.regularPrice}
            className="line-through text-lg"
          />
        ) : null}
      </div>
      <PricePerUnit
        price={Number(shopPrice.currentPrice)}
        unit={unit}
        categoryId={categoryId}
        className="opacity-60"
        productName={productName}
      />
    </div>
  );
}

async function getProductData(id: number) {
  "use cache";
  cacheTag(`product-${id}`);
  cacheLife("product");

  return await db.query.products.findFirst({
    columns: {
      id: true,
      name: true,
      image: true,
      unit: true,
      categoryId: true,
    },
    where: (products, { eq }) => eq(products.id, id),
    with: {
      shopCurrentPrices: {
        columns: {
          productId: true,
          shopId: true,
          url: true,
          api: true,
          currentPrice: true,
          regularPrice: true,
          updateAt: true,
          hidden: true,
        },
        where: (scp, { isNull, eq, or }) =>
          or(isNull(scp.hidden), eq(scp.hidden, false)),
        orderBy: (prices, { asc }) => [asc(prices.currentPrice)],
      },
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
      pricesHistory: true,
      visibilityHistory: true,
      groupProduct: {
        columns: {
          groupId: true,
        },
      },
    },
  });
}

async function getProductMetadata(id: number) {
  "use cache";
  cacheTag(`product-${id}`);
  cacheLife("product");

  return await db.query.products.findFirst({
    columns: { name: true, unit: true, image: true },
    where: (products, { eq }) => eq(products.id, id),
    with: {
      shopCurrentPrices: {
        columns: { currentPrice: true },
        where: (scp, { isNull, eq, or }) =>
          or(isNull(scp.hidden), eq(scp.hidden, false)),
        orderBy: (prices, { asc }) => [asc(prices.currentPrice)],
        limit: 1,
      },
      brand: { columns: { name: true } },
    },
  });
}

async function getShops() {
  "use cache";
  cacheLife("days");
  return await db.query.shops.findMany({
    columns: {
      id: true,
      name: true,
      logo: true,
    },
  });
}

function getRelatedProductsCategoryLink(
  groupPaths: GroupBreadcrumbItem[][]
): GroupBreadcrumbItem | null {
  if (groupPaths.length === 0) {
    return null;
  }

  const orderedPaths = [...groupPaths].sort((a, b) => b.length - a.length);
  for (const path of orderedPaths) {
    const category = path.find((item) => item.href.startsWith("/categorias/"));
    if (category) {
      return category;
    }
  }

  return null;
}

function getPrimaryRelatedGroupChain(
  groupPaths: GroupBreadcrumbItem[][]
): GroupBreadcrumbItem[] | null {
  if (groupPaths.length === 0) {
    return null;
  }

  const groupChains = groupPaths
    .map((path) => path.filter((item) => item.href.startsWith("/grupos/")))
    .filter((path) => path.length > 0);

  if (groupChains.length === 0) {
    return null;
  }

  let primaryGroupChain = groupChains[0];

  for (const current of groupChains.slice(1)) {
    if (current.length > primaryGroupChain.length) {
      primaryGroupChain = current;
    }
  }

  return primaryGroupChain;
}

function getPrimaryRelatedGroupAndParent(
  groupPaths: GroupBreadcrumbItem[][]
): { group: GroupBreadcrumbItem; parentGroup: GroupBreadcrumbItem | null } | null {
  const primaryGroupChain = getPrimaryRelatedGroupChain(groupPaths);

  if (!primaryGroupChain) {
    return null;
  }

  const group = primaryGroupChain[primaryGroupChain.length - 1];
  const parentGroup =
    primaryGroupChain.length > 1
      ? primaryGroupChain[primaryGroupChain.length - 2]
      : null;

  return { group, parentGroup };
}

async function getRelatedProductsByIds(productIds: number[]) {
  if (productIds.length === 0) {
    return [];
  }

  const productsRows = await db.query.products.findMany({
    columns: {
      id: true,
      name: true,
      image: true,
      unit: true,
      categoryId: true,
    },
    where: (products, { inArray }) => inArray(products.id, productIds),
    with: {
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
      shopCurrentPrices: {
        columns: {
          currentPrice: true,
        },
        where: (scp, { and, isNotNull, isNull, eq, or }) =>
          and(
            isNotNull(scp.currentPrice),
            or(isNull(scp.hidden), eq(scp.hidden, false))
          ),
        orderBy: (prices, { asc }) => [asc(prices.currentPrice)],
      },
      productDeal: {
        columns: {
          dropPercentage: true,
        },
      },
    },
  });

  const productById = new Map(productsRows.map((item) => [item.id, item]));
  return productIds
    .map((id) => productById.get(id))
    .filter(
      (product): product is (typeof productsRows)[number] => product !== undefined
    );
}

async function getHighRankingRelatedProductsByCategory(
  name: string,
  currentProductId: number,
  categoryId: number,
  limit: number
) {
  "use cache";
  cacheLife("product");

  const rankOrder = sql<number>`coalesce(${products.rank}, 0)`;

  const productIdsRows = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        or(isNull(products.deleted), eq(products.deleted, false)),
        ne(products.id, currentProductId),
        sql`similarity(unaccent(lower(${products.name})), unaccent(lower(${name}))) >= ${HIGH_SIMILARITY_SIM_SCORE_THRESHOLD}`,
        sql`EXISTS (
          SELECT 1
          FROM ${productsGroups}
          INNER JOIN ${categoriesGroups}
            ON ${categoriesGroups.groupId} = ${productsGroups.groupId}
          WHERE ${productsGroups.productId} = ${products.id}
            AND ${categoriesGroups.categoryId} = ${categoryId}
        )`,
        sql`EXISTS (
          SELECT 1
          FROM ${productsShopsPrices}
          WHERE ${productsShopsPrices.productId} = ${products.id}
            AND ${productsShopsPrices.currentPrice} IS NOT NULL
            AND (
              ${productsShopsPrices.hidden} IS NULL
              OR ${productsShopsPrices.hidden} = FALSE
            )
        )`
      )
    )
    .orderBy(desc(rankOrder), desc(products.id))
    .limit(limit);

  const productIds = productIdsRows.map((row) => row.id);
  return getRelatedProductsByIds(productIds);
}

async function getRelatedProductsBySimilarityNoGroup(
  name: string,
  currentProductId: number,
  limit: number
) {
  "use cache";
  cacheLife("product");

  const rankOrder = sql<number>`coalesce(${products.rank}, 0)`;

  const productIdsRows = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        or(isNull(products.deleted), eq(products.deleted, false)),
        ne(products.id, currentProductId),
        sql`similarity(unaccent(lower(${products.name})), unaccent(lower(${name}))) > ${NO_GROUP_SIMILARITY_MIN_THRESHOLD}`,
        sql`EXISTS (
          SELECT 1
          FROM ${productsShopsPrices}
          WHERE ${productsShopsPrices.productId} = ${products.id}
            AND ${productsShopsPrices.currentPrice} IS NOT NULL
            AND (
              ${productsShopsPrices.hidden} IS NULL
              OR ${productsShopsPrices.hidden} = FALSE
            )
        )`
      )
    )
    .orderBy(desc(rankOrder), desc(products.id))
    .limit(limit);

  const productIds = productIdsRows.map((row) => row.id);
  return getRelatedProductsByIds(productIds);
}

async function getRelatedProductsFromSameGroup({
  groupId,
  currentProductId,
  excludedProductIds,
  limit,
}: {
  groupId: number;
  currentProductId: number;
  excludedProductIds: number[];
  limit: number;
}) {
  if (limit <= 0) {
    return [];
  }

  const rankOrder = sql<number>`coalesce(${products.rank}, 0)`;

  const productIdsRows = await db
    .select({ id: products.id })
    .from(productsGroups)
    .innerJoin(
      products,
      and(
        eq(products.id, productsGroups.productId),
        or(isNull(products.deleted), eq(products.deleted, false))
      )
    )
    .innerJoin(
      productsShopsPrices,
      and(
        eq(productsShopsPrices.productId, products.id),
        isNotNull(productsShopsPrices.currentPrice),
        or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false))
      )
    )
    .where(eq(productsGroups.groupId, groupId))
    .groupBy(products.id, products.rank)
    .orderBy(desc(rankOrder), desc(products.id))
    .limit(100);

  const excludedIds = new Set([currentProductId, ...excludedProductIds]);
  const productIds = productIdsRows
    .map((row) => row.id)
    .filter((id) => !excludedIds.has(id))
    .slice(0, limit);

  if (productIds.length === 0) {
    return [];
  }

  return getRelatedProductsByIds(productIds);
}

async function getRelatedProductsFromGroupByNameSimilarity({
  groupId,
  currentProductName,
  currentProductId,
  excludedProductIds,
  limit,
  minimumSimilarity,
}: {
  groupId: number;
  currentProductName: string;
  currentProductId: number;
  excludedProductIds: number[];
  limit: number;
  minimumSimilarity: number;
}) {
  if (limit <= 0) {
    return [];
  }

  const rankOrder = sql<number>`coalesce(${products.rank}, 0)`;
  const similarityScore = sql<number>`similarity(unaccent(lower(${products.name})), unaccent(lower(${currentProductName})))`;

  const productIdsRows = await db
    .select({ id: products.id })
    .from(productsGroups)
    .innerJoin(
      products,
      and(
        eq(products.id, productsGroups.productId),
        or(isNull(products.deleted), eq(products.deleted, false))
      )
    )
    .innerJoin(
      productsShopsPrices,
      and(
        eq(productsShopsPrices.productId, products.id),
        isNotNull(productsShopsPrices.currentPrice),
        or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false))
      )
    )
    .where(
      and(
        eq(productsGroups.groupId, groupId),
        sql`similarity(unaccent(lower(${products.name})), unaccent(lower(${currentProductName}))) >= ${minimumSimilarity}`
      )
    )
    .groupBy(products.id, products.rank)
    .orderBy(desc(similarityScore), desc(rankOrder), desc(products.id))
    .limit(100);

  const excludedIds = new Set([currentProductId, ...excludedProductIds]);
  const productIds = productIdsRows
    .map((row) => row.id)
    .filter((id) => !excludedIds.has(id))
    .slice(0, limit);

  if (productIds.length === 0) {
    return [];
  }

  return getRelatedProductsByIds(productIds);
}

const MIN_PRODUCTS_FOR_DIRECT_GROUP_LINK = 16;

async function getRelatedProductsGroupLink(
  groupPaths: GroupBreadcrumbItem[][]
): Promise<GroupBreadcrumbItem | null> {
  const primaryGroupData = getPrimaryRelatedGroupAndParent(groupPaths);

  if (!primaryGroupData) {
    return null;
  }

  const { group, parentGroup } = primaryGroupData;

  if (!parentGroup) {
    return group;
  }

  const productsCountByGroupId = await getVisibleProductsCountByGroupIds([
    group.id,
    parentGroup.id,
  ]);
  const groupProductsCount = productsCountByGroupId.get(group.id) ?? 0;

  if (groupProductsCount < MIN_PRODUCTS_FOR_DIRECT_GROUP_LINK) {
    return parentGroup;
  }

  return group;
}

async function getVisibleProductsCountByGroupIds(groupIds: number[]) {
  if (groupIds.length === 0) {
    return new Map<number, number>();
  }

  const rows = await db
    .select({
      groupId: productsGroups.groupId,
      count: sql<number>`count(distinct ${products.id})`,
    })
    .from(productsGroups)
    .innerJoin(
      products,
      and(
        eq(products.id, productsGroups.productId),
        or(isNull(products.deleted), eq(products.deleted, false))
      )
    )
    .innerJoin(
      productsShopsPrices,
      and(
        eq(productsShopsPrices.productId, products.id),
        isNotNull(productsShopsPrices.currentPrice),
        or(isNull(productsShopsPrices.hidden), eq(productsShopsPrices.hidden, false))
      )
    )
    .where(inArray(productsGroups.groupId, groupIds))
    .groupBy(productsGroups.groupId);

  return new Map(rows.map((row) => [row.groupId, Number(row.count)]));
}

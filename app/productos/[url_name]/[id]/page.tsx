import { AddToListButton } from "@/components/add-to-list-button";
import { Price } from "@/components/price";
import { PricePerUnit } from "@/components/price-per-unit";
import { PricesChart } from "@/components/prices-chart";
import { ProductBrand } from "@/components/product-brand";
import { ProductFeedbackSection } from "@/components/product-feedback-section";
import { ProductImage } from "@/components/product-image";
import { RelatedProducts } from "@/components/related-products";
import { ShopPriceRowActions } from "@/components/shop-price-row";
import { SupermarketAlternatives } from "@/components/supermarket-alternatives";
import { ScrollToSection } from "@/components/scroll-to-section";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Unit } from "@/components/unit";
import { GroupBreadcrumbs } from "@/components/group-breadcrumbs";
import { db } from "@/db";
import { categoriesGroups, products, productsGroups, productsShopsPrices } from "@/db/schema";
import { getGroupBreadcrumbPaths, type GroupBreadcrumbItem } from "@/lib/group-breadcrumbs";
import { formatPriceValue } from "@/lib/price-format";
import { parseUnit } from "@/lib/unit-utils";
import { sanitizeForTsQuery } from "@/lib/utils";
import { and, desc, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import {
  ChartNoAxesColumnDecreasing,
  MessageCircleWarning,
  ShoppingBasket,
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
const MAX_SUPERMARKET_ALTERNATIVE_CANDIDATES = 400;
const SUPERMARKET_ALTERNATIVE_PRIORITY_SIMILARITY_THRESHOLD = 0.12;
const SUPERMARKET_ALTERNATIVE_CLOSE_UNIT_RATIO_THRESHOLD = 0.65;
const STRICT_STORE_BRAND_IDENTITY_IDS = new Set([30, 69, 80]);

type SupermarketAlternativeTargetKey =
  | "nacional-jumbo"
  | "sirena"
  | "bravo"
  | "plaza-lama"
  | "pricesmart";

type SupermarketAlternativeTarget = {
  key: SupermarketAlternativeTargetKey;
  shopIds: number[];
  brandIds: number[];
  fallbackKeywords: string[];
};

const SUPERMARKET_ALTERNATIVE_TARGETS: SupermarketAlternativeTarget[] = [
  {
    key: "nacional-jumbo",
    shopIds: [2, 3],
    brandIds: [28, 53, 54, 55, 233],
    fallbackKeywords: ["lider", "nacional", "origen nacional"],
  },
  {
    key: "sirena",
    shopIds: [1],
    brandIds: [9, 30, 2527],
    fallbackKeywords: ["wala", "zerca"],
  },
  {
    key: "bravo",
    shopIds: [6],
    brandIds: [80, 195, 2532],
    fallbackKeywords: ["bravo", "mubravo", "ia", "gourmet"],
  },
  {
    key: "plaza-lama",
    shopIds: [4],
    brandIds: [69],
    fallbackKeywords: ["gold select", "gold"],
  },
  {
    key: "pricesmart",
    shopIds: [5],
    brandIds: [77, 78],
    fallbackKeywords: ["members selection", "member selection", "member's selection"],
  },
];

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
  const supermarketAlternativesPromise = relatedProductsPrimaryGroup
    ? getSupermarketAlternatives({
        groupId: relatedProductsPrimaryGroup.id,
        currentProductId: product.id,
        currentProductName: product.name,
        currentProductUnit: product.unit,
      })
    : Promise.resolve([]);
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
  const [shops, supermarketAlternatives] = await Promise.all([
    shopsPromise,
    supermarketAlternativesPromise,
  ]);
  const shopLogoById = new Map(shops.map((shop) => [shop.id, shop.logo]));
  const shopNameById = new Map(shops.map((shop) => [shop.id, shop.name]));
  const visibleShopPrices = product.shopCurrentPrices.filter(
    (shopPrice) => shopPrice.currentPrice !== null && !shopPrice.hidden
  );

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
          <GroupBreadcrumbs
            paths={groupBreadcrumbs}
            compactMobileMode="last"
            includeHome
          />
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
          {visibleShopPrices.length > 0 ? (
            visibleShopPrices.map((shopPrice, i) => {
              const logo = shopLogoById.get(shopPrice.shopId);
              if (!logo) {
                return null;
              }

              return (
                <div
                  key={i}
                  className="grid grid-cols-4 items-center py-4"
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
            })
          ) : (
            <Empty className="mt-4 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShoppingBasket />
                </EmptyMedia>
                <EmptyTitle>No hay precios disponibles ahora mismo</EmptyTitle>
                <EmptyDescription>
                  No hay un precio disponible actualmente en supermercados para este
                  producto.
                </EmptyDescription>
              </EmptyHeader>
              <ScrollToSection
                targetId="productos-relacionados"
                className={buttonVariants({ size: "sm" })}
              >
                Ver productos relacionados
              </ScrollToSection>
            </Empty>
          )}

          {visibleShopPrices.length > 0 ? (
            <div className="mt-4 flex items-center space-x-2">
              <MessageCircleWarning size={20} />
              <small className="text-sm leading-none font-medium">
                Estos precios están disponibles online y pueden variar en la tienda.
              </small>
            </div>
          ) : null}
        </section>

        {supermarketAlternatives.length > 0 ? (
          <section className="flex flex-col gap-2">
            <div className="font-bold text-2xl">Alternativas del supermercado</div>
            <SupermarketAlternatives
              products={supermarketAlternatives}
              shopLogoById={shopLogoById}
              shopNameById={shopNameById}
            />
          </section>
        ) : null}

        <section id="productos-relacionados" className="flex flex-col gap-2 scroll-mt-4">
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
            shopId: true,
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

type SupermarketAlternativeProduct = Awaited<
  ReturnType<typeof getRelatedProductsByIds>
>[number] & {
  alternativeShopId: number;
};

type SupermarketAlternativeCandidate = {
  productId: number;
  productName: string;
  productUnit: string;
  brandId: number;
  possibleBrandId: number | null;
  shopIds: number[];
  similarityScore: number;
  rankScore: number;
};

async function getSupermarketAlternatives({
  groupId,
  currentProductId,
  currentProductName,
  currentProductUnit,
}: {
  groupId: number;
  currentProductId: number;
  currentProductName: string;
  currentProductUnit: string;
}): Promise<SupermarketAlternativeProduct[]> {
  const rankScore = sql<number>`coalesce(${products.rank}, 0)`;
  const similarityScore = sql<number>`similarity(unaccent(lower(${products.name})), unaccent(lower(${currentProductName})))`;

  const candidateRows = await db
      .select({
        productId: products.id,
        productName: products.name,
        productUnit: products.unit,
        brandId: products.brandId,
        possibleBrandId: products.possibleBrandId,
        shopIds: sql<number[]>`array_agg(distinct ${productsShopsPrices.shopId})`,
        similarityScore,
        rankScore,
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
      .where(
        and(
          eq(productsGroups.groupId, groupId),
          ne(products.id, currentProductId)
        )
      )
      .groupBy(
        products.id,
        products.name,
        products.brandId,
        products.possibleBrandId,
        products.rank
      )
      .orderBy(desc(similarityScore), desc(rankScore), desc(products.id))
      .limit(MAX_SUPERMARKET_ALTERNATIVE_CANDIDATES);

  if (candidateRows.length === 0) {
    return [];
  }

  const candidates = candidateRows.map((row) => normalizeCandidate(row));

  const selectedByTarget = new Map<
    SupermarketAlternativeTargetKey,
    SupermarketAlternativeCandidate
  >();

  for (const target of SUPERMARKET_ALTERNATIVE_TARGETS) {
    const candidatesOnlyForTarget = candidates.filter((candidate) =>
      isCandidateExclusiveToSupermarket(candidate.shopIds, target.shopIds)
    );

    if (candidatesOnlyForTarget.length === 0) {
      continue;
    }

    // 1) Brand match + same/close unit.
    const stage1 = candidatesOnlyForTarget.filter(
      (candidate) =>
        isCandidateBrandMatchForTarget(candidate, target) &&
        hasSameOrCloseUnit(currentProductUnit, candidate.productUnit)
    );

    // 2) Fallback text + same/close unit.
    const stage2 = candidatesOnlyForTarget.filter(
      (candidate) =>
        matchesFallbackKeyword(candidate.productName, target.fallbackKeywords) &&
        hasSameOrCloseUnit(currentProductUnit, candidate.productUnit)
    );

    // 3) Brand match OR fallback text (without unit requirement).
    const stage3 = candidatesOnlyForTarget.filter(
      (candidate) =>
        isCandidateBrandMatchForTarget(candidate, target) ||
        matchesFallbackKeyword(candidate.productName, target.fallbackKeywords)
    );

    // 4) Any product sold only in that shop.
    const stage4 = candidatesOnlyForTarget;

    const selectedCandidate =
      pickBestSupermarketAlternativeCandidate(stage1, currentProductUnit) ??
      pickBestSupermarketAlternativeCandidate(stage2, currentProductUnit) ??
      pickBestSupermarketAlternativeCandidate(stage3, currentProductUnit) ??
      pickBestSupermarketAlternativeCandidate(stage4, currentProductUnit);

    if (selectedCandidate) {
      selectedByTarget.set(target.key, selectedCandidate);
    }
  }

  const selectedProductIds = SUPERMARKET_ALTERNATIVE_TARGETS
    .map((target) => selectedByTarget.get(target.key)?.productId)
    .filter((productId): productId is number => productId !== undefined);

  if (selectedProductIds.length === 0) {
    return [];
  }

  const selectedProducts = await getRelatedProductsByIds(selectedProductIds);
  const productById = new Map(selectedProducts.map((product) => [product.id, product]));

  const alternatives: SupermarketAlternativeProduct[] = [];

  for (const target of SUPERMARKET_ALTERNATIVE_TARGETS) {
    const selected = selectedByTarget.get(target.key);
    if (!selected) {
      continue;
    }

    const selectedProduct = productById.get(selected.productId);
    if (!selectedProduct) {
      continue;
    }

    const alternativeShopId = pickAlternativeShopId(
      selectedProduct.shopCurrentPrices,
      target.shopIds
    );
    if (!alternativeShopId) {
      continue;
    }

    alternatives.push({
      ...selectedProduct,
      alternativeShopId,
    });
  }

  return alternatives;
}

function normalizeCandidate(row: {
  productId: number;
  productName: string;
  productUnit: string;
  brandId: number;
  possibleBrandId: number | null;
  shopIds: unknown;
  similarityScore: unknown;
  rankScore: unknown;
}): SupermarketAlternativeCandidate {
  const normalizedShopIds = Array.isArray(row.shopIds)
    ? row.shopIds
        .map((shopId) => Number(shopId))
        .filter((shopId) => Number.isFinite(shopId))
    : [];
  const normalizedSimilarity = Number(row.similarityScore);
  const normalizedRank = Number(row.rankScore);

  return {
    productId: row.productId,
    productName: row.productName,
    productUnit: row.productUnit,
    brandId: row.brandId,
    possibleBrandId: row.possibleBrandId,
    shopIds: normalizedShopIds,
    similarityScore: Number.isFinite(normalizedSimilarity)
      ? normalizedSimilarity
      : 0,
    rankScore: Number.isFinite(normalizedRank) ? normalizedRank : 0,
  };
}

function isCandidateBrandMatchForTarget(
  candidate: SupermarketAlternativeCandidate,
  target: SupermarketAlternativeTarget
) {
  return target.brandIds.some((brandId) =>
    isCandidateBrandMatchForBrandId(candidate, brandId)
  );
}

function isCandidateBrandMatchForBrandId(
  candidate: SupermarketAlternativeCandidate,
  brandId: number
) {
  if (STRICT_STORE_BRAND_IDENTITY_IDS.has(brandId)) {
    return (
      candidate.brandId === brandId &&
      candidate.possibleBrandId === brandId
    );
  }

  return candidate.brandId === brandId || candidate.possibleBrandId === brandId;
}

function hasSameOrCloseUnit(currentProductUnit: string, candidateUnit: string) {
  return getUnitPriorityScore(currentProductUnit, candidateUnit) > 0;
}

function pickBestSupermarketAlternativeCandidate(
  candidates: SupermarketAlternativeCandidate[],
  currentProductUnit: string
) {
  if (candidates.length === 0) {
    return null;
  }

  let bestCandidate = candidates[0];

  for (const candidate of candidates.slice(1)) {
    if (
      isBetterSupermarketAlternativeCandidate(
        candidate,
        bestCandidate,
        currentProductUnit
      )
    ) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function isBetterSupermarketAlternativeCandidate(
  candidate: SupermarketAlternativeCandidate,
  current: SupermarketAlternativeCandidate,
  currentProductUnit: string
) {
  const candidateUnitPriorityScore = getUnitPriorityScore(
    currentProductUnit,
    candidate.productUnit
  );
  const currentUnitPriorityScore = getUnitPriorityScore(
    currentProductUnit,
    current.productUnit
  );
  const candidateHasCloseUnit = candidateUnitPriorityScore > 0;
  const currentHasCloseUnit = currentUnitPriorityScore > 0;

  if (candidateHasCloseUnit !== currentHasCloseUnit) {
    return candidateHasCloseUnit;
  }

  if (candidateUnitPriorityScore !== currentUnitPriorityScore) {
    return candidateUnitPriorityScore > currentUnitPriorityScore;
  }

  const candidateHasPrioritySimilarity =
    candidate.similarityScore >=
    SUPERMARKET_ALTERNATIVE_PRIORITY_SIMILARITY_THRESHOLD;
  const currentHasPrioritySimilarity =
    current.similarityScore >=
    SUPERMARKET_ALTERNATIVE_PRIORITY_SIMILARITY_THRESHOLD;

  if (candidateHasPrioritySimilarity !== currentHasPrioritySimilarity) {
    return candidateHasPrioritySimilarity;
  }

  if (candidate.similarityScore !== current.similarityScore) {
    return candidate.similarityScore > current.similarityScore;
  }

  if (candidate.rankScore !== current.rankScore) {
    return candidate.rankScore > current.rankScore;
  }

  return candidate.productId > current.productId;
}

function isCandidateExclusiveToSupermarket(
  candidateShopIds: number[],
  targetShopIds: number[]
) {
  if (candidateShopIds.length === 0) {
    return false;
  }

  const allowedShopIds = new Set(targetShopIds);
  return candidateShopIds.every((shopId) => allowedShopIds.has(shopId));
}

function getUnitPriorityScore(currentUnit: string, candidateUnit: string): number {
  const parsedCurrent = parseUnit(currentUnit);
  const parsedCandidate = parseUnit(candidateUnit);

  if (!parsedCurrent || !parsedCandidate) {
    return 0;
  }

  if (parsedCurrent.measurement !== parsedCandidate.measurement) {
    return 0;
  }

  const maxBase = Math.max(parsedCurrent.base, parsedCandidate.base);
  const minBase = Math.min(parsedCurrent.base, parsedCandidate.base);

  if (!Number.isFinite(maxBase) || !Number.isFinite(minBase) || maxBase <= 0) {
    return 0;
  }

  const ratio = minBase / maxBase;
  if (ratio < SUPERMARKET_ALTERNATIVE_CLOSE_UNIT_RATIO_THRESHOLD) {
    return 0;
  }

  const isSameNormalizedUnit =
    parsedCurrent.normalizedUnit === parsedCandidate.normalizedUnit;
  const normalizedUnitBonus = isSameNormalizedUnit ? 0.2 : 0;
  return ratio + normalizedUnitBonus;
}

function pickAlternativeShopId(
  shopPrices: Array<{ shopId: number; currentPrice: string | null }>,
  targetShopIds: number[]
) {
  const allowedShopIds = new Set(targetShopIds);
  let cheapestShopId: number | null = null;
  let cheapestPrice: number | null = null;

  for (const shopPrice of shopPrices) {
    if (!allowedShopIds.has(shopPrice.shopId) || shopPrice.currentPrice === null) {
      continue;
    }

    const numericPrice = Number(shopPrice.currentPrice);
    if (!Number.isFinite(numericPrice)) {
      continue;
    }

    if (cheapestPrice === null || numericPrice < cheapestPrice) {
      cheapestPrice = numericPrice;
      cheapestShopId = shopPrice.shopId;
    }
  }

  return cheapestShopId;
}

function matchesFallbackKeyword(productName: string, keywords: string[]) {
  const normalizedName = normalizeKeywordText(productName);

  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeKeywordText(keyword);
    if (!normalizedKeyword) {
      return false;
    }

    if (normalizedKeyword.length <= 3) {
      const keywordPattern = new RegExp(
        `(^|\\s)${escapeRegExp(normalizedKeyword)}(\\s|$)`
      );
      return keywordPattern.test(normalizedName);
    }

    return normalizedName.includes(normalizedKeyword);
  });
}

function normalizeKeywordText(value: string) {
  return sanitizeForTsQuery(value).replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

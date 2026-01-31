import { AddToListButton } from "@/components/add-to-list-button";
import { CategoryBadge } from "@/components/category-badge";
import { PricePerUnit } from "@/components/price-per-unit";
import { PricesChart } from "@/components/prices-chart";
import { ProductBrand } from "@/components/product-brand";
import { ProductFeedbackSection } from "@/components/product-feedback-section";
import { ProductImage } from "@/components/product-image";
import { RelatedProducts } from "@/components/related-products";
import { ShopPriceRowActions } from "@/components/shop-price-row";
import { ScrollToSection } from "@/components/scroll-to-section";
import { Unit } from "@/components/unit";
import { db } from "@/db";
import { searchProducts } from "@/lib/search-query";
import { sanitizeForTsQuery } from "@/lib/utils";
import {
  ChartNoAxesColumnDecreasing,
  MessageCircleWarning,
  TrendingDown,
} from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import { cacheTag, cacheLife } from "next/cache";

type Props = {
  params: Promise<{ id: string; url_name: string }>;
};

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

  const relatedProducts = await searchRelatedProducts(product.name, false);
  relatedProducts.products.splice(
    relatedProducts.products.findIndex((i) => i.id === product.id),
    1
  );

  const shops = await getShops();

  const groups = product.groupProduct.map((gp) => gp.group);

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
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-10 py-4 px-4 md:px-10">
      <section>
        <div className="flex flex-col gap-2 sticky top-0">
          {groups.length > 0 ? (
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
              <span className="text-sm text-muted-foreground">
                {groups.length === 1 ? "Categoría" : "Categorías"}
              </span>
              <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-2">
                {groups.map((group) => (
                  <CategoryBadge
                    key={group.id}
                    groupId={group.id}
                    groupName={group.name}
                    groupHumanNameId={group.humanNameId}
                    isComparable={group.isComparable}
                    showLabel
                  />
                ))}
              </div>
            </div>
          ) : null}
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
            .map((shopPrice, i) => (
            <div
              key={i}
              className="grid grid-cols-4 items-center py-4"
              hidden={Boolean(shopPrice.hidden)}
            >
              <Image
                src={`/supermarket-logo/${shopPrice.shop.logo}`}
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
          ))}

          <div className="mt-4 flex items-center space-x-2">
            <MessageCircleWarning size={20} />
            <small className="text-sm leading-none font-medium">
              Estos precios están disponibles online y pueden variar en la tienda.
            </small>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="font-bold text-2xl">Productos relacionados</div>
          <RelatedProducts relatedProducts={relatedProducts.products} />
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
  return value.toLocaleString("es-DO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
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
        <div className="font-bold text-lg">RD${shopPrice.currentPrice}</div>
        {Number(shopPrice.currentPrice) < Number(shopPrice.regularPrice) ? (
          <div className="line-through text-lg">
            ${shopPrice.regularPrice}
          </div>
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
    where: (products, { eq }) => eq(products.id, id),
    with: {
      shopCurrentPrices: {
        where: (scp, { isNull, eq, or }) =>
          or(isNull(scp.hidden), eq(scp.hidden, false)),
        with: {
          shop: true,
        },
        orderBy: (prices, { asc }) => [asc(prices.currentPrice)],
      },
      brand: true,
      possibleBrand: true,
      pricesHistory: true,
      visibilityHistory: true,
      groupProduct: {
        with: {
          group: true,
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
  return await db.query.shops.findMany();
}

async function searchRelatedProducts(name: string, canSeeHiddenProducts: boolean) {
  "use cache";
  cacheLife("product");

  return await searchProducts(
    sanitizeForTsQuery(name),
    16,
    0,
    false,
    undefined,
    canSeeHiddenProducts
  );
}

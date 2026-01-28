import { AddToListButton } from "@/components/add-to-list-button";
import { CategoryBadge } from "@/components/category-badge";
import { PricePerUnit } from "@/components/price-per-unit";
import { PricesChart } from "@/components/prices-chart";
import { ProductBrand } from "@/components/product-brand";
import { ProductFeedbackSection } from "@/components/product-feedback-section";
import { ProductImage } from "@/components/product-image";
import { RelatedProducts } from "@/components/related-products";
import { ShopPriceRowActions } from "@/components/shop-price-row";
import { Unit } from "@/components/unit";
import { db } from "@/db";
import { searchProducts } from "@/lib/search-query";
import { sanitizeForTsQuery } from "@/lib/utils";
import { MessageCircleWarning } from "lucide-react";
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

        <section className="flex flex-col gap-2">
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

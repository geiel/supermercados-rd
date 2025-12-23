import { AddListButton } from "@/components/add-list";
import { PricePerUnit } from "@/components/price-per-unit";
import { PricesChart } from "@/components/prices-chart";
import { ProductBrand } from "@/components/product-brand";
import { ProductImage } from "@/components/product-image";
import { RelatedProducts } from "@/components/related-products";
import { Button } from "@/components/ui/button";
import { Unit } from "@/components/unit";
import { db } from "@/db";
import { productsShopsPrices } from "@/db/schema";
import { bravo } from "@/lib/scrappers/bravo";
import { jumbo } from "@/lib/scrappers/jumbo";
import { nacional } from "@/lib/scrappers/nacional";
import { plazaLama } from "@/lib/scrappers/plaza-lama";
import { pricesmart } from "@/lib/scrappers/pricesmart";
import { sirena } from "@/lib/scrappers/sirena";
import { searchProducts } from "@/lib/search-query";
import { getUser } from "@/lib/supabase";
import { sanitizeForTsQuery } from "@/lib/utils";
import { MessageCircleWarning } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = await db.query.products.findFirst({
    columns: { name: true, unit: true },
    where: (products, { eq }) => eq(products.id, Number(id)),
  });

  return {
    title: `${product?.name}, ${product?.unit}`,
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  const product = await db.query.products.findFirst({
    where: (products, { eq }) => eq(products.id, Number(id)),
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
    },
  });

  if (!product) {
    return <div>Producto no encontrado.</div>;
  }

  const user = await getUser();
  const canSeeHiddenProducts = user?.email?.toLowerCase() === "geielpeguero@gmail.com";

  const relatedProducts = await searchProducts(
    sanitizeForTsQuery(product.name),
    16,
    0,
    false,
    undefined,
    canSeeHiddenProducts
  );
  relatedProducts.products.splice(
    relatedProducts.products.findIndex((i) => i.id === product.id),
    1
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-10 py-4 px-4 md:px-10">
      <section>
        <div className="flex flex-col gap-2 sticky top-0">
          <div>
            <ProductBrand brand={product.brand} possibleBrand={product.possibleBrand} type="product" />
            <div className="text-xl">{product.name}</div>
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
              <div>
                <AddListButton productId={product.id} type="button" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="flex flex-col gap-10">
        <section className="flex flex-col">
          <div className="font-bold text-2xl">Donde comprar</div>
          {product.shopCurrentPrices.map((shopPrice, i) => (
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
              />
              <div className="place-self-end self-center">
                <SearchProductButton shopPrice={shopPrice} />
              </div>
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
          <div className="font-bold text-2xl">Historial de precios</div>
          <Suspense>
            <PricesChart priceHistory={product.pricesHistory} currentPrices={product.shopCurrentPrices} />
          </Suspense>
        </section>

        <section className="flex flex-col gap-2">
          <div className="font-bold text-2xl">Productos relacionados</div>
          <RelatedProducts relatedProducts={relatedProducts.products} />
        </section>
      </div>
    </div>
  );
}

function SearchProductButton({
  shopPrice,
}: {
  shopPrice: productsShopsPrices;
}) {
  if (shopPrice.shopId === 6) {
    const productId = shopPrice.api?.replace(
      "https://bravova-api.superbravo.com.do/public/articulo/get?idArticulo=",
      ""
    );

    return (
      <Button size="xs" asChild>
        <a href={`${shopPrice.url}/articulos/${productId}`} target="_blank" className="text-xs">
          Buscar
        </a>
      </Button>
    );
  }

  return (
    <Button size="xs" asChild>
      <a href={shopPrice.url} target="_blank" className="text-xs">
        Buscar
      </a>
    </Button>
  );
}

async function ShopPrice({
  shopPrice,
  unit,
  categoryId,
}: {
  shopPrice: productsShopsPrices;
  unit: string;
  categoryId: number;
}) {
  switch (shopPrice.shopId) {
    case 1:
      await sirena.processByProductShopPrice(shopPrice);
      break;
    case 2:
      await nacional.processByProductShopPrice(shopPrice);
      break;
    case 3:
      await jumbo.processByProductShopPrice(shopPrice);
      break;
    case 4:
      await plazaLama.processByProductShopPrice(shopPrice);
      break;
    case 5:
      await pricesmart.processByProductShopPrice(shopPrice);
      break;
    case 6:
      await bravo.processByProductShopPrice(shopPrice);
      break;
  }

  const lowerPrice = await db.query.productsShopsPrices.findFirst({
    columns: {
      currentPrice: true,
      regularPrice: true,
    },
    where: (priceTable, { isNotNull, eq, and }) =>
      and(
        isNotNull(priceTable.currentPrice),
        eq(priceTable.productId, shopPrice.productId),
        eq(priceTable.shopId, shopPrice.shopId)
      ),
  });

  return (
    <div className="col-span-2">
      <div className="flex gap-1 items-center overflow-auto">
        <div className="font-bold text-lg">RD${lowerPrice?.currentPrice}</div>
        {Number(lowerPrice?.currentPrice) < Number(lowerPrice?.regularPrice) ? (
          <div className="line-through text-lg">
            ${lowerPrice?.regularPrice}
          </div>
        ) : null}
      </div>
      <PricePerUnit
        price={Number(lowerPrice?.currentPrice)}
        unit={unit}
        categoryId={categoryId}
        className="opacity-60"
      />
    </div>
  );
}

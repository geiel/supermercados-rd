import { PricesChart } from "@/components/prices-chart";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { productsShopsPrices } from "@/db/schema";
import { bravo } from "@/lib/scrappers/bravo";
import { jumbo } from "@/lib/scrappers/jumbo";
import { nacional } from "@/lib/scrappers/nacional";
import { plazaLama } from "@/lib/scrappers/plaza-lama";
import { pricesmart } from "@/lib/scrappers/pricesmart";
import { sirena } from "@/lib/scrappers/sirena";
import Image from "next/image";

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
      },
      brand: true,
      pricesHistory: true,
    },
  });

  if (!product) {
    return <div>Producto no encontrado.</div>;
  }

  return (
    <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 py-4 px-6 md:px-10">
      <section className="flex flex-col gap-2">
        <div>
          {product.brand ? (
            <div className="font-bold text-2xl">{product.brand.name}</div>
          ) : null}
          <div className="text-xl">{product.name}</div>
        </div>
        <Badge>
          <div className="font-bold">{product.unit}</div>
        </Badge>
        <div className="px-4 py-8">
          <div className="flex justify-center">
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
              ) : null}
            </div>
          </div>
        </div>
      </section>
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-2">
          <div className="font-bold text-2xl">Donde comprar</div>
          {product.shopCurrentPrices.map((shopPrice, i) => (
            <div
              key={i}
              className="grid grid-cols-4 items-center py-4"
              hidden={Boolean(shopPrice.hidden)}
            >
              <Image
                src={`/supermarket-logo/${shopPrice.shop.logo}`}
                width={60}
                height={40}
                alt="Supermarket logo"
                unoptimized
              />
              <ShopPrice shopPrice={shopPrice} />
              <div>
                <SearchProductButton shopPrice={shopPrice} />
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <div className="font-bold text-2xl">Historial de precios</div>
          <PricesChart priceHistory={product.pricesHistory} />
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
      <Button asChild>
        <a href={`${shopPrice.url}/articulos/${productId}`} target="_blank">
          Buscar
        </a>
      </Button>
    );
  }

  return (
    <Button asChild>
      <a href={shopPrice.url} target="_blank">
        Buscar
      </a>
    </Button>
  );
}

async function ShopPrice({ shopPrice }: { shopPrice: productsShopsPrices }) {
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
    <div className="flex gap-1 col-span-2 ">
      <div className="font-bold text-lg">RD${lowerPrice?.currentPrice}</div>
      {Number(lowerPrice?.currentPrice) < Number(lowerPrice?.regularPrice) ? (
        <div>RD${lowerPrice?.regularPrice}</div>
      ) : null}
    </div>
  );
}

import { db } from "@/db";
import { sql } from "drizzle-orm";
import { products, productsShopsPrices } from "@/db/schema";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { sirena } from "@/lib/scrappers/sirena";
import Link from "next/link";
import { toSlug } from "@/lib/utils";
import { jumbo } from "@/lib/scrappers/jumbo";
import { nacional } from "@/lib/scrappers/nacional";
import { plazaLama } from "@/lib/scrappers/plaza-lama";
import { pricesmart } from "@/lib/scrappers/pricesmart";
import { bravo } from "@/lib/scrappers/bravo";

type Props = {
  params: Promise<{ value: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { value } = await params;
  return {
    title: decodeURIComponent(value),
  };
}

export default async function Page({ params }: Props) {
  const { value } = await params;

  const productsWithShopPrices = await db.query.products.findMany({
    extras: {
      sml: sql<number>`similarity(unaccent(lower(${
        products.name
      })), unaccent(lower(${decodeURIComponent(value)})))`.as("sml"),
    },
    where: sql`similarity(unaccent(lower(${
      products.name
    })), unaccent(lower(${decodeURIComponent(value)}))) > 0.2`,
    with: {
      shopCurrentPrices: {
        where: (shopCurrentPrices, { eq, or, isNull }) =>
          or(
            isNull(shopCurrentPrices.hidden),
            eq(shopCurrentPrices.hidden, false)
          ),
      },
      brand: true,
    },
    orderBy: sql`sml desc`,
    limit: 15,
  });

  const filteredProducts = productsWithShopPrices.filter(
    (product) => product.shopCurrentPrices.length > 0
  );

  if (filteredProducts.length === 0) {
    return <div>Productos no encontrados.</div>;
  }

  return (
    <div className="container mx-auto">
      <div className="flex flex-1 flex-col gap-4 p-2">
        <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]"
            >
              <Link
                href={`/product/${toSlug(product.name)}/${product.id}`}
                className="flex flex-col gap-2"
              >
                <div className="flex justify-center">
                  <div className="h-[220px] w-[220px] relative">
                    {product.image ? (
                      <Image
                        src={product.image}
                        fill
                        alt={product.name + product.unit}
                        sizes="220px"
                        style={{
                          objectFit: "contain",
                        }}
                      />
                    ) : null}
                  </div>
                </div>
                <Badge>{product.unit}</Badge>
                <div>
                  <div className="font-bold">{product.brand.name}</div>
                  {product.name}
                </div>
                <ShopExclusive shopPrices={product.shopCurrentPrices} />
                <Price
                  shopPrices={product.shopCurrentPrices}
                  productId={product.id}
                />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function Price({
  shopPrices,
  productId,
}: {
  shopPrices: productsShopsPrices[];
  productId: number;
}) {
  for (const shopPrice of shopPrices) {
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
    }
  }

  const lowerPrice = await db.query.productsShopsPrices.findFirst({
    columns: {
      currentPrice: true,
      regularPrice: true,
    },
    where: (priceTable, { isNotNull, eq, and }) =>
      and(
        isNotNull(priceTable.currentPrice),
        eq(priceTable.productId, productId)
      ),
    orderBy: (priceTable, { asc }) => [asc(priceTable.currentPrice)],
  });

  return (
    <div>
      <div className="font-bold text-lg pt-1">
        RD${lowerPrice?.currentPrice}
      </div>
      {Number(lowerPrice?.currentPrice) < Number(lowerPrice?.regularPrice) ? (
        <div className="font-semibold">{lowerPrice?.regularPrice}</div>
      ) : null}
    </div>
  );
}

async function ShopExclusive({
  shopPrices,
}: {
  shopPrices: productsShopsPrices[];
}) {
  if (shopPrices.length > 1) {
    return null;
  }

  const logo = await db.query.shops.findFirst({
    columns: {
      logo: true,
    },
    where: (shops, { eq }) => eq(shops.id, shopPrices[0].shopId),
  });

  return (
    <Image
      src={`/supermarket-logo/${logo?.logo}`}
      width={50}
      height={20}
      alt="logo tienda"
    />
  );
}

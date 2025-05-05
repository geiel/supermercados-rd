import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { productsShopsPrices } from "@/db/schema";
import { jumbo } from "@/lib/scrappers/jumbo";
import { nacional } from "@/lib/scrappers/nacional";
import { plazaLama } from "@/lib/scrappers/plaza-lama";
import { sirena } from "@/lib/scrappers/sirena";
import Image from "next/image";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  const product = await db.query.products.findFirst({
    where: (products, { eq }) => eq(products.id, Number(id)),
    with: {
      shopCurrentPrices: {
        with: {
          shop: true,
        },
      },
      brand: true,
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
          {product.image ? (
            <Image
              src={product.image}
              width={450}
              height={200}
              alt={product.name + product.unit}
            />
          ) : null}
        </div>
      </section>
      <div>
        <section className="flex flex-col gap-2">
          <div className="font-bold text-2xl">Donde comprar</div>
          {product.shopCurrentPrices.map((shopPrice, i) => (
            <div key={i} className="grid grid-cols-4 items-center py-4">
              <Image
                src={`/supermarket-logo/${shopPrice.shop.logo}`}
                width={60}
                height={40}
                alt="Supermarket logo"
              />
              <ShopPrice shopPrice={shopPrice} />
              <div>
                <Button asChild>
                  <a href={shopPrice.url} target="_blank">
                    Buscar
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
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

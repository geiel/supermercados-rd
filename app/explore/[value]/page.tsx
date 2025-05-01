import { db } from "@/db";
import { sql } from "drizzle-orm";
import { products, productsShopsPrices } from "@/db/schema";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { sirena } from "@/lib/scrappers/sirena";
import Link from "next/link";

type Props = {
  params: Promise<{ value: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { value } = await params;
  return {
    title: value,
  };
}

export default async function Page({ params }: Props) {
  const { value } = await params;

  const words = value.split(/\s+/);
  const regex = `\\y(${words
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})\\y`;

  const productsWithShopPrices = await db.query.products.findMany({
    where: sql`unaccent(${products.name}) ~* unaccent(${regex})`,
    with: {
      shopCurrentPrices: true,
    },
    limit: 30,
  });

  if (productsWithShopPrices.length === 0) {
    return <div>Productos no encontrados.</div>;
  }

  return (
    <div className="container mx-auto">
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
          {productsWithShopPrices.map((product) => (
            <div
              key={product.id}
              className="aspect-square p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]"
            >
              <Link
                href={`/product/${toSlug(product.name)}/${product.id}`}
                className="flex flex-col gap-2"
              >
                <div className="flex justify-center">
                  {product.image ? (
                    <Image
                      src={product.image}
                      width={200}
                      height={200}
                      alt={product.name + product.unit}
                    />
                  ) : null}
                </div>
                <Badge>{product.unit}</Badge>
                {product.name}
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

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // Remove accents
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // Remove invalid chars
    .trim()
    .replace(/\s+/g, "-"); // Replace spaces with hyphens
}

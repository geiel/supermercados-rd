import { db } from "@/db";
import { productsShopsPrices } from "@/db/schema";
import Image from "next/image";
import { sirena } from "@/lib/scrappers/sirena";
import Link from "next/link";
import { sanitizeForTsQuery, toSlug } from "@/lib/utils";
import { jumbo } from "@/lib/scrappers/jumbo";
import { nacional } from "@/lib/scrappers/nacional";
import { plazaLama } from "@/lib/scrappers/plaza-lama";
import { pricesmart } from "@/lib/scrappers/pricesmart";
import { bravo } from "@/lib/scrappers/bravo";
import { BottomPagination } from "@/components/bottom-pagination";
import { ProductImage } from "@/components/product-image";
import { searchProducts } from "@/lib/search-query";
import { PricePerUnit } from "@/components/price-per-unit";
import { Unit } from "@/components/unit";

type Props = {
  params: Promise<{ value: string }>;
  searchParams: Promise<{ page: string | undefined }>;
};

export async function generateMetadata({ params }: Props) {
  const { value } = await params;
  return {
    title: decodeURIComponent(value),
  };
}

function getOffset(page: string | undefined): number {
  if (!page) {
    return 0;
  }

  const pageNumber = Number(page);
  if (isNaN(pageNumber)) {
    return 0;
  }

  if (!pageNumber) {
    return 0;
  }

  return (Number(page) - 1) * 15;
}

export default async function Page({ params, searchParams }: Props) {
  const { value } = await params;
  const { page } = await searchParams;

  const productsAndTotal = await searchProducts(
    sanitizeForTsQuery(decodeURIComponent(value).trim()),
    15,
    getOffset(page)
  );

  const filteredProducts = productsAndTotal.products.filter((product) => {
    if (product.shopCurrentPrices.length === 0) {
      productsAndTotal.total -= 1;
    }

    return product.shopCurrentPrices.length > 0;
  });

  if (filteredProducts.length === 0) {
    return <div>Productos no encontrados.</div>;
  }

  const allShopPrices = filteredProducts.flatMap(
    (product) => product.shopCurrentPrices
  );
  await Promise.all(
    allShopPrices.map((shopPrice) => {
      switch (shopPrice.shopId) {
        case 1:
          return sirena.processByProductShopPrice(shopPrice);
        case 2:
          return nacional.processByProductShopPrice(shopPrice);
        case 3:
          return jumbo.processByProductShopPrice(shopPrice);
        case 4:
          return plazaLama.processByProductShopPrice(shopPrice);
        case 5:
          return pricesmart.processByProductShopPrice(shopPrice);
        case 6:
          return bravo.processByProductShopPrice(shopPrice);
        default:
          return Promise.resolve(); // skip unknown shopId
      }
    })
  );

  return (
    <div className="container mx-auto pb-4">
      <div className="flex flex-1 flex-col gap-4">
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
                      <ProductImage
                        src={product.image}
                        fill
                        alt={product.name + product.unit}
                        sizes="220px"
                        style={{
                          objectFit: "contain",
                        }}
                        placeholder="blur"
                        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                        className="max-w-none"
                      />
                    ) : null}
                  </div>
                </div>
                <Unit unit={product.unit} />
                <div>
                  <div className="font-bold">{product.brand.name}</div>
                  {product.name}
                </div>
                <ShopExclusive shopPrices={product.shopCurrentPrices} />
                <Price
                  productId={product.id}
                  unit={product.unit}
                  categoryId={product.categoryId}
                />
              </Link>
            </div>
          ))}
        </div>
        <BottomPagination items={productsAndTotal.total} />
      </div>
    </div>
  );
}

async function Price({
  productId,
  unit,
  categoryId,
}: {
  productId: number;
  unit: string;
  categoryId: number;
}) {
  const lowerPrice = await db.query.productsShopsPrices.findFirst({
    columns: {
      currentPrice: true,
      regularPrice: true,
    },
    where: (priceTable, { isNotNull, eq, and, or, isNull }) =>
      and(
        isNotNull(priceTable.currentPrice),
        eq(priceTable.productId, productId),
        or(isNull(priceTable.hidden), eq(priceTable.hidden, false))
      ),
    orderBy: (priceTable, { asc }) => [asc(priceTable.currentPrice)],
  });

  if (!lowerPrice || !lowerPrice.currentPrice) {
    return null;
  }

  return (
    <div>
      <div className="font-bold text-lg pt-1">RD${lowerPrice.currentPrice}</div>
      <PricePerUnit unit={unit} price={Number(lowerPrice.currentPrice)} categoryId={categoryId} />
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
      className="max-w-none"
      unoptimized
    />
  );
}

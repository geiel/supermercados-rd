import { db } from "@/db";
import { productsSelect, productsShopsPrices } from "@/db/schema";
import Image from "next/image";
import { sirena } from "@/lib/scrappers/sirena";
import Link from "next/link";
import { getShopsIds, sanitizeForTsQuery, toSlug } from "@/lib/utils";
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
import { AddListButton } from "@/components/add-list";
import { getUser } from "@/lib/supabase";
import { normalizeUnitFiltersForSearch, parseUnitFilterParam } from "@/utils/unit-filter";
import { ProductBrand } from "@/components/product-brand";
import { Metadata } from "next";
import { TypographyH3 } from "@/components/typography-h3";
import { searchGroups } from "@/lib/search-categories";
import { CategorySearch } from "@/components/categories-search";

type Props = {
  params: Promise<{ value: string }>;
  searchParams: Promise<{ 
    page: string | undefined;
    shop_ids: string | undefined,
    only_shop_products: string | undefined,
    unit_filter: string | undefined,
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
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
  const { page, shop_ids, only_shop_products, unit_filter } = await searchParams;

  const shopsIds = getShopsIds(shop_ids);

  const user = await getUser();
  const canSeeHiddenProducts = user?.email?.toLowerCase() === "geielpeguero@gmail.com";

  const unitFilters = normalizeUnitFiltersForSearch(parseUnitFilterParam(unit_filter));

  const rawSearchValue = decodeURIComponent(value).trim();
  const sanitizedSearchValue = sanitizeForTsQuery(rawSearchValue);

  const [productsAndTotal, groupResults] = await Promise.all([
    searchProducts(
      sanitizedSearchValue,
      15,
      getOffset(page),
      true,
      shopsIds,
      canSeeHiddenProducts,
      only_shop_products ? true : false,
      unitFilters
    ),
    searchGroups(rawSearchValue),
  ]);

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
    <>
      <div className="px-2 md:px-0">
        <h1 className="text-2xl font-semibold tracking-tight">Buscaste &quot;{rawSearchValue}&quot;</h1>
      </div>
      <CategorySearch groupResults={groupResults} />
      <div className="px-2 md:px-0">
        <div className="flex items-baseline gap-2">
          <TypographyH3>Productos</TypographyH3>
          <span className="text-sm text-muted-foreground">
            ({productsAndTotal.total})
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px] relative"
          >
            <div className="absolute top-2 right-2 z-10">
              <AddListButton productId={product.id} type="icon" />
            </div>
            <Link
              href={`/product/${toSlug(product.name)}/${product.id}`}
              className="flex flex-col gap-2"
            >
              <div className="flex justify-center">
                <div className="h-[220px] w-[220px] relative">
                  <ExploreImage product={product} />
                </div>
              </div>
              <Unit unit={product.unit} />
              <div>
                <ProductBrand brand={product.brand} possibleBrand={product.possibleBrand} type="explore" />
                {product.name}
              </div>
              <ShopExclusive shopPrices={product.shopCurrentPrices} />
              <Price
                productId={product.id}
                unit={product.unit}
                categoryId={product.categoryId}
                showHiddenPrices={canSeeHiddenProducts}
                productName={product.name}
              />
            </Link>
          </div>
        ))}
      </div>
      <BottomPagination items={productsAndTotal.total} />
    </>
  );
}

function ExploreImage({ product }: { product: productsSelect }) {
  if (!product.image) {
    return <Image 
            src="/no-product-found.jpg" alt="image product not found" 
            fill
            unoptimized
            sizes="220px"
            style={{
              objectFit: "contain",
            }}
            placeholder="blur"
            blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
            className="max-w-none" />;
  }

  return (
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
  );
}

async function Price({
  productId,
  unit,
  categoryId,
  showHiddenPrices,
  productName,
}: {
  productId: number;
  unit: string;
  categoryId: number;
  showHiddenPrices: boolean;
  productName: string;
}) {
  const lowerPrice = await db.query.productsShopsPrices.findFirst({
    columns: {
      currentPrice: true,
      regularPrice: true,
    },
    where: (priceTable, { isNotNull, eq, and, or, isNull }) =>
      showHiddenPrices
        ? and(
            isNotNull(priceTable.currentPrice),
            eq(priceTable.productId, productId)
          )
        : and(
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
      <PricePerUnit
        unit={unit}
        price={Number(lowerPrice.currentPrice)}
        categoryId={categoryId}
        productName={productName}
      />
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
      width={0}
      height={0}
      sizes="100vw"
      className="w-[50px] h-auto"
      alt="logo tienda"
      unoptimized
    />
  );
}

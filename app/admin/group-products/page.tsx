import { db } from "@/db";
import {
  productsGroups,
  productsSelect,
  productsShopsPrices,
} from "@/db/schema";
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
import { getUser } from "@/lib/supabase";
import {
  normalizeUnitFiltersForSearch,
  parseUnitFilterParam,
} from "@/utils/unit-filter";
import { ProductBrand } from "@/components/product-brand";
import { validateAdminUser } from "@/lib/authentication";
import { GroupProductsToolbar } from "./client";
import { TypographyH3 } from "@/components/typography-h3";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

type Props = {
  searchParams: Promise<{
    value: string | undefined;
    page: string | undefined;
    shop_ids: string | undefined;
    only_shop_products: string | undefined;
    unit_filter: string | undefined;
    groupId: string | undefined;
  }>;
};

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

async function addProductToGroup(formData: FormData) {
  "use server";

  await validateAdminUser();
  const productId = Number(formData.get("productId"));
  const groupId = Number(formData.get("groupId"));

  if (
    !Number.isFinite(productId) ||
    !Number.isFinite(groupId) ||
    productId <= 0 ||
    groupId <= 0
  ) {
    return;
  }

  await db
    .insert(productsGroups)
    .values({ productId, groupId })
    .onConflictDoNothing();

  revalidatePath("/admin/group-products");
}

async function removeProductFromGroup(formData: FormData) {
  "use server";

  await validateAdminUser();
  const productId = Number(formData.get("productId"));
  const groupId = Number(formData.get("groupId"));

  if (
    !Number.isFinite(productId) ||
    !Number.isFinite(groupId) ||
    productId <= 0 ||
    groupId <= 0
  ) {
    return;
  }

  await db
    .delete(productsGroups)
    .where(
      and(
        eq(productsGroups.productId, productId),
        eq(productsGroups.groupId, groupId)
      )
    );

  revalidatePath("/admin/group-products");
}

export default async function Page({ searchParams }: Props) {
  await validateAdminUser();

  const { value, page, shop_ids, only_shop_products, unit_filter, groupId } =
    await searchParams;

  const groups = await db.query.groups.findMany({
    orderBy: (groups, { asc }) => asc(groups.name),
  });

  const selectedGroupId = groupId ? Number(groupId) : undefined;
  const resolvedGroupId =
    selectedGroupId && Number.isFinite(selectedGroupId) && selectedGroupId > 0
      ? selectedGroupId
      : undefined;

  const searchValue = value ?? "";
  const trimmedValue = searchValue.trim();
  const shopsIds = getShopsIds(shop_ids);

  const user = await getUser();
  const canSeeHiddenProducts = user?.email?.toLowerCase() === "geielpeguero@gmail.com";

  const unitFilters = normalizeUnitFiltersForSearch(
    parseUnitFilterParam(unit_filter)
  );

  if (!trimmedValue) {
    return (
      <div className="container mx-auto pb-4 pt-4">
        <div className="flex flex-1 flex-col gap-4">
          <TypographyH3>Asignar productos a grupo</TypographyH3>
          <GroupProductsToolbar
            groups={groups}
            initialValue={searchValue}
            initialGroupId={resolvedGroupId}
          />
          <div className="text-sm text-muted-foreground">
            Busca un producto para empezar.
          </div>
        </div>
      </div>
    );
  }

  const productsAndTotal = await searchProducts(
    sanitizeForTsQuery(trimmedValue),
    15,
    getOffset(page),
    true,
    shopsIds,
    canSeeHiddenProducts,
    only_shop_products ? true : false,
    unitFilters
  );

  const filteredProducts = productsAndTotal.products.filter((product) => {
    if (product.shopCurrentPrices.length === 0) {
      productsAndTotal.total -= 1;
    }

    return product.shopCurrentPrices.length > 0;
  });

  if (filteredProducts.length === 0) {
    return (
      <div className="container mx-auto pb-4 pt-4">
        <div className="flex flex-1 flex-col gap-4">
          <TypographyH3>Asignar productos a grupo</TypographyH3>
          <GroupProductsToolbar
            groups={groups}
            initialValue={searchValue}
            initialGroupId={resolvedGroupId}
          />
          <div>Productos no encontrados.</div>
        </div>
      </div>
    );
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

  const groupProductIds =
    resolvedGroupId && filteredProducts.length > 0
      ? new Set(
          (
            await db.query.productsGroups.findMany({
              columns: {
                productId: true,
              },
              where: (productsGroups, { and, eq, inArray }) =>
                and(
                  eq(productsGroups.groupId, resolvedGroupId),
                  inArray(
                    productsGroups.productId,
                    filteredProducts.map((product) => product.id)
                  )
                ),
            })
          ).map((item) => item.productId)
        )
      : new Set<number>();

  return (
    <div className="container mx-auto pb-4 pt-4">
      <div className="flex flex-1 flex-col gap-4">
        <TypographyH3>Asignar productos a grupo</TypographyH3>
        <GroupProductsToolbar
          groups={groups}
          initialValue={searchValue}
          initialGroupId={resolvedGroupId}
        />
        <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
          {filteredProducts.map((product) => {
            const isInGroup = resolvedGroupId
              ? groupProductIds.has(product.id)
              : false;

            return (
              <div
                key={product.id}
                className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px] relative"
              >
                <div className="absolute top-2 left-2 z-10">
                  {isInGroup ? (
                    <form action={removeProductFromGroup}>
                      <input
                        type="hidden"
                        name="productId"
                        value={product.id}
                      />
                      <input
                        type="hidden"
                        name="groupId"
                        value={resolvedGroupId ?? ""}
                      />
                      <Button
                        variant="destructive"
                        size="xs"
                        disabled={!resolvedGroupId}
                      >
                        Remover
                      </Button>
                    </form>
                  ) : (
                    <form action={addProductToGroup}>
                      <input
                        type="hidden"
                        name="productId"
                        value={product.id}
                      />
                      <input
                        type="hidden"
                        name="groupId"
                        value={resolvedGroupId ?? ""}
                      />
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={!resolvedGroupId}
                      >
                        Agregar
                      </Button>
                    </form>
                  )}
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
                    <ProductBrand
                      brand={product.brand}
                      possibleBrand={product.possibleBrand}
                      type="explore"
                    />
                    {product.name}
                  </div>
                  <ShopExclusive shopPrices={product.shopCurrentPrices} />
                  <Price
                    productId={product.id}
                    unit={product.unit}
                    categoryId={product.categoryId}
                    showHiddenPrices={canSeeHiddenProducts}
                  />
                </Link>
              </div>
            );
          })}
        </div>
        <BottomPagination items={productsAndTotal.total} />
      </div>
    </div>
  );
}

function ExploreImage({ product }: { product: productsSelect }) {
  if (!product.image) {
    return (
      <Image
        src="/no-product-found.jpg"
        alt="image product not found"
        fill
        unoptimized
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
}: {
  productId: number;
  unit: string;
  categoryId: number;
  showHiddenPrices: boolean;
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

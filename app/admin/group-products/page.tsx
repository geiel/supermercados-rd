import { db } from "@/db";
import {
  groups as groupsTable,
  productsGroups,
  productsSelect,
  productsShopsPrices,
} from "@/db/schema";
import Image from "next/image";
import Link from "next/link";
import { getShopsIds, sanitizeForTsQuery, toSlug } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GroupProductActionButton } from "./group-product-action-button";

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

  const inserted = await db
    .insert(productsGroups)
    .values({ productId, groupId })
    .onConflictDoNothing()
    .returning({ productId: productsGroups.productId });

  if (inserted.length > 0) {
    revalidatePath("/admin/group-products");
  }
}

async function createGroup(formData: FormData) {
  "use server";

  await validateAdminUser();
  const name = String(formData.get("groupName") ?? "").trim();
  const returnParams = String(formData.get("returnParams") ?? "");

  if (!name) {
    return;
  }

  const baseSlug = toSlug(name);
  if (!baseSlug) {
    return;
  }

  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await db.query.groups.findFirst({
      columns: {
        id: true,
      },
      where: (groups, { eq }) => eq(groups.humanNameId, slug),
    });

    if (!existing) {
      break;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const insertedGroups = await db
    .insert(groupsTable)
    .values({
      name,
      humanNameId: slug,
    })
    .returning({ id: groupsTable.id });

  const newGroupId = insertedGroups[0]?.id;
  const params = new URLSearchParams(returnParams);

  if (newGroupId) {
    params.set("groupId", String(newGroupId));
  }

  params.delete("page");

  const query = params.toString();
  redirect(query ? `/admin/group-products?${query}` : "/admin/group-products");
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

  const deleted = await db
    .delete(productsGroups)
    .where(
      and(
        eq(productsGroups.productId, productId),
        eq(productsGroups.groupId, groupId)
      )
    )
    .returning({ productId: productsGroups.productId });

  if (deleted.length > 0) {
    revalidatePath("/admin/group-products");
  }
}

export default function Page({ searchParams }: Props) {
  return (
    <Suspense fallback={<GroupProductsFallback />}>
      <GroupProductsPage searchParams={searchParams} />
    </Suspense>
  );
}

async function GroupProductsPage({ searchParams }: Props) {
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
            createGroup={createGroup}
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
            createGroup={createGroup}
            initialValue={searchValue}
            initialGroupId={resolvedGroupId}
          />
          <div>Productos no encontrados.</div>
        </div>
      </div>
    );
  }

  const filteredProductIds = filteredProducts.map((product) => product.id);
  const groupNameById = new Map(groups.map((group) => [group.id, group.name]));
  const productGroupEntries =
    filteredProductIds.length > 0
      ? await db.query.productsGroups.findMany({
          columns: {
            productId: true,
            groupId: true,
          },
          where: (productsGroups, { inArray }) =>
            inArray(productsGroups.productId, filteredProductIds),
        })
      : [];

  const productGroupsByProductId = new Map<
    number,
    { id: number; name: string }[]
  >();
  const groupProductIds = new Set<number>();

  for (const entry of productGroupEntries) {
    const groupName = groupNameById.get(entry.groupId);
    if (groupName) {
      const existingGroups = productGroupsByProductId.get(entry.productId);
      const groupInfo = { id: entry.groupId, name: groupName };
      if (existingGroups) {
        existingGroups.push(groupInfo);
      } else {
        productGroupsByProductId.set(entry.productId, [groupInfo]);
      }
    }

    if (resolvedGroupId && entry.groupId === resolvedGroupId) {
      groupProductIds.add(entry.productId);
    }
  }

  for (const groupsList of productGroupsByProductId.values()) {
    groupsList.sort((a, b) => {
      const nameOrder = a.name.localeCompare(b.name);
      return nameOrder !== 0 ? nameOrder : a.id - b.id;
    });
  }

  return (
    <div className="container mx-auto pb-4 pt-4">
      <div className="flex flex-1 flex-col gap-4">
        <TypographyH3>Asignar productos a grupo</TypographyH3>
        <GroupProductsToolbar
          groups={groups}
          createGroup={createGroup}
          initialValue={searchValue}
          initialGroupId={resolvedGroupId}
        />
        <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
          {filteredProducts.map((product) => {
            const isInGroup = resolvedGroupId
              ? groupProductIds.has(product.id)
              : false;
            const productGroups = productGroupsByProductId.get(product.id) ?? [];

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
                      <GroupProductActionButton
                        variant="destructive"
                        label="Remover"
                        disabled={!resolvedGroupId}
                      />
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
                      <GroupProductActionButton
                        variant="outline"
                        label="Agregar"
                        disabled={!resolvedGroupId}
                      />
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
                  {productGroups.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {productGroups.map((group) => (
                        <Badge
                          key={group.id}
                          variant="secondary"
                          className="px-1 py-0 text-[10px] leading-4"
                        >
                          {group.name}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <div>
                    <ProductBrand
                      brand={product.brand}
                      possibleBrand={product.possibleBrand}
                      type="explore"
                    />
                    {product.name}
                  </div>
                  <ShopExclusive shopPrices={product.shopCurrentPrices} />
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

function GroupProductsFallback() {
  return (
    <div className="container mx-auto pb-4 pt-4">
      <div className="flex flex-1 flex-col gap-4">
        <TypographyH3>Asignar productos a grupo</TypographyH3>
        <div className="text-sm text-muted-foreground">Cargando...</div>
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

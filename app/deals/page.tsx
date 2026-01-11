import { AddListButton } from "@/components/add-list";
import { PricePerUnit } from "@/components/price-per-unit";
import { ProductImage } from "@/components/product-image";
import { TypographyH3 } from "@/components/typography-h3";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Unit } from "@/components/unit";
import { db } from "@/db";
import { formatDropPercentage, toSlug } from "@/lib/utils";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

const SUPERMARKET_BRAND_NAMES = ["Bravo", "Jumbo Market", "Sirena", "Plaza Lama"];

type Props = {
  searchParams: Promise<{ shop_id?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { shop_id } = await searchParams;
  const shopIdValue = parseShopId(shop_id);

  if (shop_id && shopIdValue === null) {
    return { title: "Ofertas" };
  }

  if (typeof shopIdValue !== "number") {
    return { title: "Ofertas de hoy" };
  }

  const shop = await getShop(shopIdValue);

  if (!shop) {
    return { title: "Ofertas" };
  }

  return { title: `Ofertas en ${shop.name}` };
}

export default function Page({ searchParams }: Props) {
  return (
    <Suspense fallback={<DealsSkeleton />}>
      <DealsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DealsContent({ searchParams }: Props) {
  const { shop_id } = await searchParams;
  const shopIdValue = parseShopId(shop_id);

  if (shop_id && shopIdValue === null) {
    return <div>Supermercado no encontrado.</div>;
  }

  const [shop, deals] = await Promise.all([
    typeof shopIdValue === "number" ? getShop(shopIdValue) : Promise.resolve(null),
    getDeals(shopIdValue ?? undefined),
  ]);

  if (typeof shopIdValue === "number" && !shop) {
    return <div>Supermercado no encontrado.</div>;
  }

  const title = shop ? `Ofertas en ${shop.name}` : "Ofertas de hoy";
  const emptyMessage = shop
    ? "No hay ofertas disponibles para este supermercado."
    : "No hay ofertas disponibles por ahora.";

  return (
    <main className="container mx-auto pb-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="px-2 md:px-0">
          <div className="flex items-baseline gap-2">
            <TypographyH3>{title}</TypographyH3>
            <span className="text-sm text-muted-foreground">({deals.length})</span>
          </div>
        </div>

        {deals.length === 0 ? (
          <div className="px-2 md:px-0 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
            {deals.map((deal) => (
              <div
                key={deal.productId}
                className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px] relative"
              >
                <div className="absolute top-2 right-2 z-10">
                  <AddListButton productId={deal.productId} type="icon" />
                </div>
                <div className="absolute top-2 left-2 z-10">
                  <Badge variant="destructive">
                    -{formatDropPercentage(deal.dropPercentage)}%
                  </Badge>
                </div>
                <Link
                  href={`/product/${toSlug(deal.name)}/${deal.productId}`}
                  className="flex flex-col gap-2"
                >
                  <div className="flex justify-center">
                    <div className="h-[220px] w-[220px] relative">
                      <DealImage deal={deal} />
                    </div>
                  </div>
                  <Unit unit={deal.unit} />
                  <div>
                    <BrandName
                      name={deal.brandName}
                      possibleName={deal.possibleBrandName}
                    />
                    {deal.name}
                  </div>
                  <DealPrice deal={deal} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function parseShopId(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

async function getShop(shopId: number) {
  "use cache";

  return await db.query.shops.findFirst({
    columns: {
      id: true,
      name: true,
      logo: true,
    },
    where: (shops, { eq }) => eq(shops.id, shopId),
  });
}

async function getDeals(shopId?: number) {
  "use cache";

  return await db.query.todaysDeals.findMany({
    where: (deals, { and, eq, gt }) => {
      const positiveDrop = gt(deals.dropPercentage, "0");
      if (typeof shopId === "number") {
        return and(eq(deals.shopId, shopId), positiveDrop);
      }
      return positiveDrop;
    },
    orderBy: (deals, { desc }) => [desc(deals.dropPercentage), desc(deals.rank)],
    with: {
      product: {
        columns: {
          categoryId: true,
        },
      },
    },
  });
}

type Deal = Awaited<ReturnType<typeof getDeals>>[number];

function DealImage({ deal }: { deal: Deal }) {
  if (!deal.image) {
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
      src={deal.image}
      fill
      alt={deal.name + deal.unit}
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

function DealPrice({ deal }: { deal: Deal }) {
  const numericPrice = Number(deal.priceToday);

  return (
    <div>
      <div className="font-bold text-lg pt-1">RD${deal.priceToday}</div>
      {Number.isFinite(numericPrice) && deal.product ? (
        <PricePerUnit
          unit={deal.unit}
          price={numericPrice}
          categoryId={deal.product.categoryId}
          productName={deal.name}
        />
      ) : null}
    </div>
  );
}

function DealsSkeleton() {
  return (
    <main className="container mx-auto pb-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="px-2 md:px-0">
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
        <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]"
            >
              <Skeleton className="w-full max-w-[220px] aspect-square mx-auto" />
              <Skeleton className="h-4 w-12 mt-3" />
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-4 w-2/3 mt-2" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function BrandName({
  name,
  possibleName,
}: {
  name: string;
  possibleName: string | null;
}) {
  if (!possibleName) {
    return <div className="font-bold">{name}</div>;
  }

  if (SUPERMARKET_BRAND_NAMES.includes(name)) {
    return <div className="font-bold">{possibleName}</div>;
  }

  return <div className="font-bold">{name}</div>;
}

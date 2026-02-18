import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BadgePercent } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DealsFilters } from "@/components/deals-filters";
import { DealsList } from "@/components/deals-list";
import { TypographyH3 } from "@/components/typography-h3";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/db";
import { getDeals, parseShopId } from "@/lib/deals";
import { DEALS_DESKTOP_PAGE_SIZE, type DealsFilters as DealsFiltersType } from "@/types/deals";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const SITE_URL = "https://supermercadosrd.com";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const shopIdParam =
    typeof resolvedSearchParams.shop_id === "string"
      ? resolvedSearchParams.shop_id
      : undefined;
  const shopIdsParam =
    typeof resolvedSearchParams.shop_ids === "string"
      ? resolvedSearchParams.shop_ids
      : undefined;
  const shopIdValue = parseShopId(shopIdParam);

  if (shopIdParam && shopIdValue === null && !shopIdsParam) {
    return {
      title: "Ofertas",
      description: "Ofertas y descuentos en supermercados de República Dominicana.",
    };
  }

  if (typeof shopIdValue !== "number") {
    const title = "Ofertas de supermercados en RD - Actualizadas diariamente";
    const description =
      "Las mejores ofertas y descuentos de hoy en supermercados de República Dominicana. Compara precios en Sirena, Nacional, Jumbo, Bravo y más.";
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        url: "/ofertas",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      alternates: {
        canonical: "/ofertas",
      },
    };
  }

  const shop = await getShop(shopIdValue);

  if (!shop) {
    return {
      title: "Ofertas",
      description: "Ofertas y descuentos en supermercados de República Dominicana.",
    };
  }

  const title = `Ofertas en ${shop.name} hoy - Precios más baratos en RD`;
  const description = `Descubre las mejores ofertas y descuentos en ${shop.name}. Compara precios y ahorra en tus compras.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/ofertas?shop_id=${shopIdValue}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `/ofertas?shop_id=${shopIdValue}`,
    },
  };
}

export default function Page({ searchParams }: Props) {
  return (
    <Suspense fallback={<DealsSkeleton />}>
      <DealsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DealsContent({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const shopIdParam =
    typeof resolvedSearchParams.shop_id === "string"
      ? resolvedSearchParams.shop_id
      : undefined;
  const shopIdsParam =
    typeof resolvedSearchParams.shop_ids === "string"
      ? resolvedSearchParams.shop_ids
      : undefined;
  const shopIdValue = parseShopId(shopIdParam);
  const filters = parseFiltersFromSearchParams(resolvedSearchParams);

  if (shopIdParam && shopIdValue === null && !shopIdsParam) {
    return <div>Supermercado no encontrado.</div>;
  }

  const [shop, dealsResult] = await Promise.all([
    typeof shopIdValue === "number" ? getShop(shopIdValue) : Promise.resolve(null),
    getDeals({
      offset: 0,
      limit: DEALS_DESKTOP_PAGE_SIZE,
      filters,
    }),
  ]);

  if (typeof shopIdValue === "number" && !shop) {
    return <div>Supermercado no encontrado.</div>;
  }

  const title = shop ? `Ofertas en ${shop.name}` : "Ofertas de hoy";
  const emptyMessage = shop
    ? `No hay ofertas disponibles para ${shop.name} en este momento.`
    : "No hay ofertas disponibles por ahora.";
  const hasDeals = dealsResult.total > 0;
  const breadcrumbItems = buildOffersBreadcrumbItems(shop);
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <DealsHero shop={shop} />
      <main className="container mx-auto pb-4 pt-4">
        <div className="flex flex-1 flex-col gap-4">
          <div className="px-2 md:px-0">
            <div className="flex items-baseline gap-2">
              <TypographyH3>{title}</TypographyH3>
              <span className="text-sm text-muted-foreground">({dealsResult.total})</span>
            </div>
          </div>

          {!hasDeals ? (
            <div className="flex gap-6">
              <DealsFilters variant="desktop" />
              <div className="flex-1 min-w-0 px-2 md:px-0">
                <div className="pb-2 lg:hidden">
                  <DealsFilters variant="mobile" />
                </div>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BadgePercent />
                    </EmptyMedia>
                    <EmptyTitle>No hay ofertas disponibles</EmptyTitle>
                    <EmptyDescription>{emptyMessage}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            </div>
          ) : (
            <div className="flex gap-6">
              <DealsFilters variant="desktop" />
              <div className="flex-1 min-w-0">
                <DealsList
                  shopId={typeof shopIdValue === "number" ? shopIdValue : undefined}
                  initialDeals={dealsResult.deals}
                  total={dealsResult.total}
                  initialOffset={dealsResult.nextOffset}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function parseFiltersFromSearchParams(
  searchParams?: { [key: string]: string | string[] | undefined }
): DealsFiltersType {
  if (!searchParams) return {};

  const filters: DealsFiltersType = {};
  const shopIds = new Set<number>();
  const shopIdsParam =
    typeof searchParams.shop_ids === "string" ? searchParams.shop_ids : undefined;
  const shopIdParam =
    typeof searchParams.shop_id === "string" ? searchParams.shop_id : undefined;

  if (shopIdsParam) {
    shopIdsParam
      .split(",")
      .map((value) => parseInt(value.trim(), 10))
      .filter((value) => Number.isFinite(value) && value > 0)
      .forEach((value) => shopIds.add(value));
  }

  if (shopIdParam) {
    const parsed = Number(shopIdParam);
    if (Number.isFinite(parsed) && parsed > 0) {
      shopIds.add(parsed);
    }
  }

  if (shopIds.size > 0) {
    filters.shopIds = Array.from(shopIds);
  }

  const groupIdsParam =
    typeof searchParams.group_ids === "string"
      ? searchParams.group_ids
      : undefined;

  if (groupIdsParam) {
    const groupIds = groupIdsParam
      .split(",")
      .map((value) => parseInt(value.trim(), 10))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (groupIds.length > 0) {
      filters.groupIds = groupIds;
    }
  }

  const minPriceParam =
    typeof searchParams.min_price === "string" ? searchParams.min_price : undefined;
  if (minPriceParam) {
    const parsed = Number(minPriceParam);
    if (Number.isFinite(parsed) && parsed >= 0) {
      filters.minPrice = parsed;
    }
  }

  const maxPriceParam =
    typeof searchParams.max_price === "string" ? searchParams.max_price : undefined;
  if (maxPriceParam) {
    const parsed = Number(maxPriceParam);
    if (Number.isFinite(parsed) && parsed > 0) {
      filters.maxPrice = parsed;
    }
  }

  const minDropParam =
    typeof searchParams.min_drop === "string" ? searchParams.min_drop : undefined;
  if (minDropParam) {
    const parsed = Number(minDropParam);
    if (Number.isFinite(parsed) && parsed > 0) {
      filters.minDrop = parsed;
    }
  }

  return filters;
}

async function getShop(shopId: number): Promise<{ id: number; name: string } | null> {
  "use cache";

  const shop = await db.query.shops.findFirst({
    columns: {
      id: true,
      name: true,
    },
    where: (shops, { eq }) => eq(shops.id, shopId),
  });

  return shop ?? null;
}

function buildOffersBreadcrumbItems(shop: { id: number; name: string } | null) {
  const items = [
    { name: "Inicio", href: `${SITE_URL}/` },
    { name: "Ofertas", href: `${SITE_URL}/ofertas` },
  ];

  if (shop) {
    items.push({
      name: shop.name,
      href: `${SITE_URL}/ofertas?shop_id=${shop.id}`,
    });
  }

  return items;
}


function DealsSkeleton() {
  return (
    <>
      <DealsHero shop={null} />
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
    </>
  );
}

function DealsHero({ shop }: { shop: { id: number; name: string } | null }) {
  return (
    <section className="relative isolate w-full max-h-[38vh] overflow-hidden bg-[#0b0812] lg:max-h-[28vh]">
      <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/50 to-transparent z-10 lg:hidden" />
      <div className="relative container mx-auto flex max-h-[38vh] w-full flex-col justify-center gap-8 px-4 py-12 md:px-0 lg:max-h-[28vh] lg:flex-row lg:items-center lg:justify-between lg:pb-8 lg:pt-10">
        <div className="absolute top-2 left-4 z-20 md:left-0">
          <Breadcrumb>
            <BreadcrumbList className="text-sm text-white/80">
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-white/80 hover:text-white">
                  <Link href="/">Inicio</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              {shop ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild className="text-white/80 hover:text-white">
                      <Link href="/ofertas">Ofertas</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-white/60" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-white">{shop.name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-white">Ofertas</BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="relative z-10 max-w-2xl space-y-4 lg:max-w-xl">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Encuentra el mejor precio
          </h1>
          <p className="text-base text-white/80 sm:text-lg">
            Comparamos miles de productos cada día para mostrarte dónde comprar
            más barato hoy.
          </p>
        </div>

        <div className="absolute inset-y-0 right-0 flex w-full items-center justify-end lg:static lg:w-[520px] xl:w-[600px]">
          <div className="relative h-[30vh] w-[96vw] max-w-[620px] overflow-visible sm:h-[32vh] sm:w-[96vw] sm:max-w-[720px] lg:h-[30vh] lg:w-full lg:max-w-none xl:h-[36vh]">
            <Image
              src="/deals-image.png"
              alt="Productos en oferta"
              fill
              priority
              sizes="(max-width: 640px) 96vw, (max-width: 1024px) 96vw, (max-width: 1280px) 720px, 820px"
              className="origin-right object-contain object-right drop-shadow-[0_25px_60px_rgba(0,0,0,0.45)] duration-300 transition-transform"
              unoptimized
            />
          </div>
        </div>
      </div>
    </section>
  );
}

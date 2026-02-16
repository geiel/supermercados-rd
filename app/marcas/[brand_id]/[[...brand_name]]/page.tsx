import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { PackageSearch } from "lucide-react";
import { redirect } from "next/navigation";

import { BrandExplorerFilters } from "@/components/brand-explorer-filters";
import { BrandProductsList } from "@/components/brand-products-list";
import { TypographyH3 } from "@/components/typography-h3";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { getBrandProducts, getVisibleBrandById } from "@/lib/brand-products";
import { toSlug } from "@/lib/utils";
import {
  BRAND_EXPLORER_DESKTOP_PAGE_SIZE,
  type BrandExplorerFilters as BrandExplorerFiltersType,
} from "@/types/brand-explorer";

type Props = {
  params: Promise<{
    brand_id: string;
    brand_name?: string[];
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand_id } = await params;
  const brandId = Number(brand_id);

  if (!Number.isFinite(brandId) || brandId <= 0) {
    return {
      title: "Supermercados RD",
      description: "Compara precios de supermercados en República Dominicana.",
    };
  }

  const brand = await getVisibleBrandById(brandId);

  if (!brand) {
    return {
      title: "Supermercados RD",
      description: "Compara precios de supermercados en República Dominicana.",
    };
  }

  const canonicalPath = `/marcas/${brand.id}/${toSlug(brand.name)}`;
  const title = `Productos ${brand.name} - Compara precios y encuentra las mejores ofertas`;
  const description = `Encuentra todos los productos de ${brand.name} y compara precios por supermercado en República Dominicana.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalPath,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function Page({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<BrandPageSkeleton />}>
      <BrandPageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function BrandPageContent({ params, searchParams }: Props) {
  const { brand_id } = await params;
  const brandId = Number(brand_id);

  if (!Number.isFinite(brandId) || brandId <= 0) {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;
  const filters = parseFiltersFromSearchParams(resolvedSearchParams);

  const brand = await getVisibleBrandById(brandId);

  if (!brand) {
    redirect("/");
  }

  const productsResult = await getBrandProducts({
    brandId,
    offset: 0,
    limit: BRAND_EXPLORER_DESKTOP_PAGE_SIZE,
    filters,
  });

  const hasProducts = productsResult.total > 0;

  return (
    <>
      <BrandHero name={brand.name} logo={brand.brandImage} />
      <main className="container mx-auto pb-4 pt-4">
        <div className="flex flex-1 flex-col gap-4">
          <div className="px-2 md:px-0">
            <div className="flex items-baseline gap-2">
              <TypographyH3>Productos de {brand.name}</TypographyH3>
              <span className="text-sm text-muted-foreground">
                ({productsResult.total})
              </span>
            </div>
          </div>

          {!hasProducts ? (
            <div className="flex gap-6">
              <BrandExplorerFilters brandId={brandId} variant="desktop" />
              <div className="flex-1 min-w-0 px-2 md:px-0">
                <div className="pb-2 lg:hidden">
                  <BrandExplorerFilters brandId={brandId} variant="mobile" />
                </div>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <PackageSearch />
                    </EmptyMedia>
                    <EmptyTitle>No hay productos disponibles</EmptyTitle>
                    <EmptyDescription>
                      No encontramos productos para esta marca con los filtros
                      seleccionados.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            </div>
          ) : (
            <div className="flex gap-6">
              <BrandExplorerFilters brandId={brandId} variant="desktop" />
              <div className="flex-1 min-w-0">
                <BrandProductsList
                  brandId={brandId}
                  initialProducts={productsResult.products}
                  total={productsResult.total}
                  initialOffset={productsResult.nextOffset}
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
): BrandExplorerFiltersType {
  if (!searchParams) return {};

  const filters: BrandExplorerFiltersType = {};

  const shopIdsParam =
    typeof searchParams.shop_ids === "string" ? searchParams.shop_ids : undefined;

  if (shopIdsParam) {
    const shopIds = shopIdsParam
      .split(",")
      .map((value) => parseInt(value.trim(), 10))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (shopIds.length > 0) {
      filters.shopIds = shopIds;
    }
  }

  const groupIdsParam =
    typeof searchParams.group_ids === "string" ? searchParams.group_ids : undefined;

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

function BrandHero({ name, logo }: { name: string; logo: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || "M";

  return (
    <section className="relative isolate w-full overflow-hidden bg-[#07020d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_#2b0f45_0%,_#10051f_40%,_#07020d_100%)]" />
      <div className="relative container mx-auto px-4 py-8 md:px-0 md:py-10">
        <Breadcrumb>
          <BreadcrumbList className="text-white/70">
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="hover:text-white text-white/70">
                <Link href="/">Inicio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-white/60" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-white/85">{name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mt-7 flex items-center gap-4 md:gap-6">
          <div className="relative h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-full bg-black/20 md:h-24 md:w-24">
            {logo ? (
              <Image
                src={logo}
                alt={`Logo de ${name}`}
                fill
                sizes="96px"
                className="object-contain p-1.5"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-white">
                {initial}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
              {name}
            </h1>
            <p className="mt-1 text-sm text-white/75 md:text-lg">
              Compara precios y descubre todos sus productos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BrandPageSkeleton() {
  return (
    <>
      <section className="relative isolate w-full overflow-hidden bg-[#07020d]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_#2b0f45_0%,_#10051f_40%,_#07020d_100%)]" />
        <div className="relative container mx-auto px-4 py-8 md:px-0 md:py-10">
          <Skeleton className="h-4 w-36 bg-white/20" />
          <div className="mt-7 flex items-center gap-4 md:gap-6">
            <Skeleton className="h-20 w-20 rounded-full bg-white/20 md:h-24 md:w-24" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-white/20" />
              <Skeleton className="h-4 w-64 bg-white/20" />
            </div>
          </div>
        </div>
      </section>
      <main className="container mx-auto pb-4 pt-4">
        <div className="px-2 md:px-0">
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]">
              <Skeleton className="w-full max-w-[220px] aspect-square mx-auto" />
              <Skeleton className="h-4 w-14 mt-3" />
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-4 w-2/3 mt-2" />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

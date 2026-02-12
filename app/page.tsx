import { FrontPageDealCard } from "@/components/front-page-deal-card";
import { GroupCategoriesStrip } from "@/components/group-categories-strip";
import { HomePageCategoriesSection } from "@/components/home-page-categories-section";
import { RecentlyVisitedProductsSection } from "@/components/recently-visited-products-section";
import { TypographyH3 } from "@/components/typography-h3";
import ScrollPeek from "@/components/ui/scroll-peek";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/db";
import Link from "next/link";
import { Suspense } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/searchbar";
import { SearchBarSkeleton } from "@/components/searchbar-skeleton";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SupermercadosRD - Comparador de precios de supermercados en RD",
  description:
    "Busca, compara y ahorra en tus compras. Encuentra el supermercado más barato en RD comparando precios de Sirena, Nacional, Jumbo, Bravo, Plaza Lama y PriceSmart.",
  alternates: {
    canonical: "/",
  },
};

const SUPERMARKET_DEALS = [
  { id: 6, name: "Bravo", logo: "bravo.png" },
  { id: 3, name: "Jumbo Market", logo: "jumbo.webp" },
  { id: 1, name: "Sirena", logo: "sirena.png" },
  { id: 2, name: "Nacional", logo: "nacional.webp" },
  { id: 4, name: "Plaza Lama", logo: "plaza_lama.png" },
  { id: 5, name: "PriceSmart", logo: "pricesmart.png" },
] as const;

export default function Home() {
  return (
    <>
      <main className="container mx-auto p-2 space-y-10">
        <div>
          <section className="p-5 rounded-3xl flex flex-col items-center gap-5 md:py-8 lg:px-40 lg:py-14" style={{ background: 'radial-gradient(120% 120% at 50% 0%, #4A2169 0%, #3A1857 60%, #2E1248 100%)' }}>
            <div>
              <h1 className="scroll-m-20 text-center text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-balance text-white">
                <span className="block">Busca, compara y ahorra</span>
                <span className="block">Encuentra el supermercado más barato hoy</span>
              </h1>
              
              <p className="leading-7 [&:not(:first-child)]:mt-4 text-center text-white">
                Compara precios en República Dominicana y decide dónde comprar antes de salir de casa
              </p>
            </div>
            <div className="w-full md:w-[60%]">
              <Suspense fallback={<SearchBarSkeleton />}>
                <SearchBar />
              </Suspense>
            </div>
          </section>
          <div className="pt-3">
            <Suspense fallback={null}>
              <GroupCategoriesStrip />
            </Suspense>
          </div>
        </div>

      <Suspense fallback={<TodaysDealsSkeleton />}>
        <TodaysDealsSection />
      </Suspense>

      <section>
        <div className="space-y-4">
          <TypographyH3>Ofertas por supermercados</TypographyH3>
          
          <ScrollPeek>
            <div className="flex gap-4">
              {SUPERMARKET_DEALS.map((shop) => (
                <Button key={shop.id} className="h-30 w-42" variant="outline" asChild>
                  <Link
                    href={`/ofertas?shop_id=${shop.id}`}
                    aria-label={`Ver ofertas en ${shop.name}`}
                  >
                    <Image
                      src={`/supermarket-logo/${shop.logo}`}
                      width={0}
                      height={0}
                      sizes="100vw"
                      className="w-[70px] h-auto"
                      alt={`Logo ${shop.name}`}
                      unoptimized
                    />
                  </Link>
                </Button>
              ))}
            </div>
          </ScrollPeek>
        </div>
      </section>

      <RecentlyVisitedProductsSection />

      <Suspense fallback={<HomePageCategoriesSectionSkeleton />}>
        <HomePageCategoriesSection />
      </Suspense>
      </main>
    </>
  );
}

async function TodaysDealsSection() {
  const todaysDeals = await db.query.todaysDeals.findMany({
    orderBy: (deals, { desc }) => [desc(deals.dateWasSet), desc(deals.rank)],
    where: (deals, { gte }) => (gte(deals.dropPercentage, "10")),
    limit: 20,
    with: {
      product: {
        columns: {
          categoryId: true,
        },
      },
    },
  });

  return (
    <section>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <TypographyH3>Mejores ofertas de hoy</TypographyH3>
            <Button variant="link" size="sm" asChild>
              <Link href="/ofertas">Ver todas</Link>
            </Button>
          </div>
          <ScrollPeek
            itemWidth="min(max(35vw, 110px), 218px)"
            itemWidthMd="224px"
          >
            <div className="flex space-x-2 p-2 relative">
              {todaysDeals.map(deal => (
                <FrontPageDealCard key={deal.productId} deal={deal} />
              ))}
            </div>
          </ScrollPeek>
        </div>
      </section>
  )
}

function TodaysDealsSkeleton() {
  return (
    <section>
      <div className="space-y-4">
        <TypographyH3>Ofertas De Hoy</TypographyH3>
        <ScrollPeek
          itemWidth="clamp(160px, 50vw, 210px)"
          itemWidthMd="clamp(110px, 11vw, 150px)"
        >
          <div className="flex w-max space-x-2 p-2">
            {Array.from({ length: 18 }).map((_, index) => (
              <Skeleton key={index} className="h-72" />
            ))}
          </div>
        </ScrollPeek>
      </div>
    </section>
  )
}

function HomePageCategoriesSectionSkeleton() {
  return (
    <section>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <TypographyH3>Mejor valor por tu dinero</TypographyH3>
          <Skeleton className="h-5 w-16" />
        </div>
        <ScrollPeek
          itemWidth="min(max(35vw, 110px), 218px)"
          itemWidthMd="224px"
        >
          <div className="flex space-x-2 p-2 relative">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-2 min-w-0">
                <Skeleton className="w-full max-w-[180px] aspect-square mx-auto" />
                <div className="px-2 flex flex-col gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-14" />
                </div>
              </div>
            ))}
          </div>
        </ScrollPeek>
      </div>
    </section>
  );
}

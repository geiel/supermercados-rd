import { ExploreSection } from "@/components/explore-section";
import { ProductImage } from "@/components/product-image";
import { TypographyH3 } from "@/components/typography-h3";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ScrollPeek from "@/components/ui/scroll-peek";
import { Skeleton } from "@/components/ui/skeleton";
import { Unit } from "@/components/unit";
import { db } from "@/db";
import { formatDropPercentage, toSlug } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/searchbar";
import { SearchBarSkeleton } from "@/components/searchbar-skeleton";

const SUPERMARKET_BRAND_NAMES = ["Bravo", "Jumbo Market", "Sirena", "Plaza Lama"];
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
    <main className="container mx-auto p-2 space-y-6">
      <section className="bg-purple-900 p-6 rounded-3xl flex flex-col items-center gap-6 md:py-10 lg:px-40 lg:py-20">
        <div>
          <h1 className="scroll-m-20 text-center text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-balance text-white">
            <span className="block">Busca, compara y ahorra</span>
            <span className="block">Encuentra el supermercado más barato hoy</span>
          </h1>
          
          <p className="leading-7 [&:not(:first-child)]:mt-4 text-center text-white">
            Compara precios de productos de supermercado en República Dominicana 
            y decide dónde comprar antes de salir de casa
          </p>
        </div>
        <div className="w-full md:w-[60%]">
          <Suspense fallback={<SearchBarSkeleton />}>
            <SearchBar />
          </Suspense>
        </div>
      </section>

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
                    href={`/deals?shop_id=${shop.id}`}
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

      {/* <Suspense fallback={<ExploreSectionSkeleton />}>
        <ExploreSection />
      </Suspense> */}
    </main>
  );
}

async function TodaysDealsSection() {
  const todaysDeals = await db.query.todaysDeals.findMany({
    orderBy: (deals, { desc }) => [desc(deals.dropPercentage), desc(deals.rank)],
    limit: 20
  });

  return (
    <section>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <TypographyH3>Mejores ofertas de hoy</TypographyH3>
            <Button variant="link" size="sm" asChild>
              <Link href="/deals">Ver todas</Link>
            </Button>
          </div>
          <ScrollPeek
            itemWidth="min(max(35vw, 110px), 218px)"
            itemWidthMd="224px"
          >
            <div className="flex space-x-2 p-2 relative">
              {todaysDeals.map(deal => (
                <Link
                  href={`/product/${toSlug(deal.name)}/${deal.productId}`}
                  className="flex flex-col gap-2 relative"
                  key={deal.productId}
                >
                  <div className="absolute top-0 left-0 z-10">
                    <Badge variant="destructive">
                      -{formatDropPercentage(deal.dropPercentage)}%
                    </Badge>
                  </div>
                  <div className="relative w-full max-w-[180px] aspect-square mx-auto">
                    {deal.image ? (
                      <ProductImage
                        src={deal.image}
                        fill
                        alt={deal.name + deal.unit}
                        sizes="(min-width: 1024px) 180px, 32vw"
                        style={{
                          objectFit: "contain",
                        }}
                        placeholder="blur"
                        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                        className="max-w-none"
                      />
                    ) : null}
                  </div>
                  <div className="px-2">
                    <Unit unit={deal.unit} />
                    <div>
                      <BrandName name={deal.brandName} possibleName={deal.possibleBrandName} />
                      {deal.name}
                    </div>
                    <div className="font-bold text-lg">RD${deal.priceToday}</div>
                  </div>
                </Link>
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

function ExploreSectionSkeleton() {
  return (
    <section>
      <div className="space-y-4">
        <TypographyH3>Explora</TypographyH3>
        <ScrollPeek>
          <div className="flex space-x-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="w-80 bg-muted/60 border-none py-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardHeader>
                <CardContent className="px-4">
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 4 }).map((_, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="flex flex-col gap-2 max-w-full bg-white p-2 rounded"
                      >
                        <div className="flex justify-center">
                          <Skeleton className="h-[130px] w-[130px]" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollPeek>
      </div>
    </section>
  )
}

function BrandName({ name, possibleName }: { name: string; possibleName: string | null }) {
  if (!possibleName) {
    return <div className="font-bold">{name}</div>;
  }

  if (SUPERMARKET_BRAND_NAMES.includes(name)) {
    return <div className="font-bold">{possibleName}</div>;
  }

  return <div className="font-bold">{name}</div>;
}

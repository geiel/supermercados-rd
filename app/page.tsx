import { ExploreSection } from "@/components/explore-section";
import { ProductImage } from "@/components/product-image";
import { TypographyH3 } from "@/components/typography-h3";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ScrollFade from "@/components/ui/scroll-fade";
import { Skeleton } from "@/components/ui/skeleton";
import { Unit } from "@/components/unit";
import { db } from "@/db";
import { toSlug } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/searchbar";

const SUPERMARKET_BRAND_NAMES = ["Bravo", "Jumbo Market", "Sirena", "Plaza Lama"];

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
          <Suspense fallback={<div>loading...</div>}>
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
          
          <ScrollFade>
            <div className="flex gap-4">
              <Button className="h-30 w-42" variant="outline">
                <Image
                    src={`/supermarket-logo/bravo.png`}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-[70px] h-auto"
                    alt="logo bravo"
                    unoptimized
                  />
              </Button>

              <Button className="h-30 w-42" variant="outline">
                <Image
                    src={`/supermarket-logo/jumbo.webp`}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-[70px] h-auto"
                    alt="logo bravo"
                    unoptimized
                  />
              </Button>

              <Button className="h-30 w-42" variant="outline">
                <Image
                    src={`/supermarket-logo/sirena.png`}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-[70px] h-auto"
                    alt="logo bravo"
                    unoptimized
                  />
              </Button>

              <Button className="h-30 w-42" variant="outline">
                <Image
                    src={`/supermarket-logo/nacional.webp`}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-[70px] h-auto"
                    alt="logo bravo"
                    unoptimized
                  />
              </Button>

              <Button className="h-30 w-42" variant="outline">
                <Image
                    src={`/supermarket-logo/plaza_lama.png`}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-[70px] h-auto"
                    alt="logo bravo"
                    unoptimized
                  />
              </Button>

              <Button className="h-30 w-42" variant="outline">
                <Image
                    src={`/supermarket-logo/pricesmart.png`}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-[70px] h-auto"
                    alt="logo bravo"
                    unoptimized
                  />
              </Button>
            </div>
          </ScrollFade>
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
    orderBy: (deals, { desc }) => [desc(deals.dropPercentage), desc(deals.rank)]
  });

  return (
    <section>
        <div className="space-y-4">
          <TypographyH3>Mejores ofertas de hoy</TypographyH3>
          <ScrollFade>
            <div className="flex w-40 space-x-6 p-2 relative">
              {todaysDeals.map(deal => (
                <Link
                  href={`/product/${toSlug(deal.name)}/${deal.productId}`}
                  className="flex flex-col gap-2 relative"
                  key={deal.productId}
                >
                  <div className="absolute top-0 left-0 z-10">
                    <Badge variant="destructive">-{Math.round(Number(deal.dropPercentage))}%</Badge>
                  </div>
                  <div className="h-[132px] w-[132px] md:h-[180px] md:w-[180px] relative">
                    {deal.image ? (
                      <ProductImage
                        src={deal.image}
                        fill
                        alt={deal.name + deal.unit}
                        sizes="132px, 180px"
                        style={{
                          objectFit: "contain",
                        }}
                        placeholder="blur"
                        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                        className="max-w-none"
                      />
                    ) : null}
                  </div>
                  <Unit unit={deal.unit} />
                  <div>
                    <BrandName name={deal.brandName} possibleName={deal.possibleBrandName} />
                    {deal.name}
                  </div>
                  <div className="font-bold text-lg">RD${deal.priceToday}</div>
                </Link>
              ))}
            </div>
          </ScrollFade>
        </div>
      </section>
  )
}

function TodaysDealsSkeleton() {
  return (
    <section>
      <div className="space-y-4">
        <TypographyH3>Ofertas De Hoy</TypographyH3>
        <ScrollFade>
          <div className="flex w-max space-x-6 p-2">
            {Array.from({ length: 18 }).map((_, index) => (
              <Skeleton key={index} className="h-72 w-44 shrink-0" />
            ))}
          </div>
        </ScrollFade>
      </div>
    </section>
  )
}

function ExploreSectionSkeleton() {
  return (
    <section>
      <div className="space-y-4">
        <TypographyH3>Explora</TypographyH3>
        <ScrollFade>
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
        </ScrollFade>
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

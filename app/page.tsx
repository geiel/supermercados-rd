export const revalidate = 3600;

import { ProductImage } from "@/components/product-image";
import { TypographyH3 } from "@/components/typography-h3";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Unit } from "@/components/unit";
import { db } from "@/db";
import { toSlug } from "@/lib/utils";
import Link from "next/link";

export default async function Home() {
  const todaysDeals = await db.query.todaysDeals.findMany({
    orderBy: (deals, { desc }) => [desc(deals.dropPercentage), desc(deals.rank)]
  });

  return (
    <main className="container mx-auto p-2">
      <section>
        <div>
          <TypographyH3>Ofertas De Hoy</TypographyH3>
          <ScrollArea>
            <div className="flex w-40 space-x-4 p-2 relative">
              {todaysDeals.map(deal => (
                <Link
                  href={`/product/${toSlug(deal.name)}/${deal.productId}`}
                  className="flex flex-col gap-2 relative"
                  key={deal.productId}
                >
                  <div className="absolute top-0 left-0 z-10">
                    <Badge variant="destructive">-{Math.round(Number(deal.dropPercentage))}%</Badge>
                  </div>
                  <div className="h-[132px] w-[132px] md:h-[175px] md:w-[175px] relative">
                    {deal.image ? (
                      <ProductImage
                        src={deal.image}
                        fill
                        alt={deal.name + deal.unit}
                        sizes="132px, 175px"
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
                    <div className="font-bold">{deal.brandName}</div>
                    {deal.name}
                  </div>
                  <div className="font-bold text-lg">RD${deal.priceToday}</div>
                </Link>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </section>
    </main>
  );
}

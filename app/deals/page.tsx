import { DealsList } from "@/components/deals-list";
import { TypographyH3 } from "@/components/typography-h3";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/db";
import { getDeals, parseShopId } from "@/lib/deals";
import { DEALS_DESKTOP_PAGE_SIZE } from "@/types/deals";
import { Metadata } from "next";
import { Suspense } from "react";

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

  const [shop, dealsResult] = await Promise.all([
    typeof shopIdValue === "number" ? getShop(shopIdValue) : Promise.resolve(null),
    getDeals({
      shopId: typeof shopIdValue === "number" ? shopIdValue : undefined,
      offset: 0,
      limit: DEALS_DESKTOP_PAGE_SIZE,
    }),
  ]);

  if (typeof shopIdValue === "number" && !shop) {
    return <div>Supermercado no encontrado.</div>;
  }

  const title = shop ? `Ofertas en ${shop.name}` : "Ofertas de hoy";
  const emptyMessage = shop
    ? "No hay ofertas disponibles para este supermercado."
    : "No hay ofertas disponibles por ahora.";
  const hasDeals = dealsResult.total > 0;

  return (
    <main className="container mx-auto pb-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="px-2 md:px-0">
          <div className="flex items-baseline gap-2">
            <TypographyH3>{title}</TypographyH3>
            <span className="text-sm text-muted-foreground">
              ({dealsResult.total})
            </span>
          </div>
        </div>

        {!hasDeals ? (
          <div className="px-2 md:px-0 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <DealsList
            shopId={typeof shopIdValue === "number" ? shopIdValue : undefined}
            initialDeals={dealsResult.deals}
            total={dealsResult.total}
            initialOffset={dealsResult.nextOffset}
          />
        )}
      </div>
    </main>
  );
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

import {
  productsBrandsSelect,
  productsSelect,
  productsShopsPrices,
} from "@/db/schema";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { ProductImage } from "./product-image";
import Link from "next/link";
import { toSlug } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { PricePerUnit } from "./price-per-unit";

export function RelatedProducts({
  relatedProducts,
}: {
  relatedProducts: Array<
    productsSelect & { brand: productsBrandsSelect } & {
      shopCurrentPrices: productsShopsPrices[];
    }
  >;
}) {
  return (
    <ScrollArea>
      <div className="flex max-w-lg space-x-4">
        {relatedProducts.map((relatedProduct) => (
          <Link
            href={`/product/${toSlug(relatedProduct.name)}/${
              relatedProduct.id
            }`}
            className="flex flex-col gap-2 pb-2"
            key={relatedProduct.id}
          >
            <div className="h-[130px] w-[130px] relative">
              {relatedProduct.image ? (
                <ProductImage
                  src={relatedProduct.image}
                  fill
                  alt={relatedProduct.name + relatedProduct.unit}
                  sizes="130px"
                  style={{
                    objectFit: "contain",
                  }}
                  placeholder="blur"
                  blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                  className="max-w-none"
                />
              ) : null}
            </div>
            <Badge>{relatedProduct.unit}</Badge>
            <div>
              <div className="font-bold">{relatedProduct.brand.name}</div>
              {relatedProduct.name}
            </div>
            <CheapestPrice
              shopCurrentPrices={relatedProduct.shopCurrentPrices}
              unit={relatedProduct.unit}
              categoryId={relatedProduct.categoryId}
            />
          </Link>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function CheapestPrice({
  shopCurrentPrices,
  unit,
  categoryId,
}: {
  shopCurrentPrices: productsShopsPrices[];
  unit: string;
  categoryId: number;
}) {
  const cheapest = shopCurrentPrices.reduce((minSoFar, current) =>
    Number(current.currentPrice) < Number(minSoFar.currentPrice)
      ? current
      : minSoFar
  );

  return (
    <div>
      <div className="font-bold text-lg">RD${cheapest.currentPrice}</div>
      <PricePerUnit
        unit={unit}
        price={Number(cheapest.currentPrice)}
        categoryId={categoryId}
      />
    </div>
  );
}

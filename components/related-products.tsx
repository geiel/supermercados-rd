import {
  productsBrandsSelect,
  productsSelect,
  productsShopsPrices,
} from "@/db/schema";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { ProductImage } from "./product-image";
import Link from "next/link";
import { toSlug } from "@/lib/utils";
import { PricePerUnit } from "./price-per-unit";
import { Unit } from "./unit";
import { ProductBrand } from "./product-brand";

export function RelatedProducts({
  relatedProducts,
}: {
  relatedProducts: Array<
    productsSelect & { brand: productsBrandsSelect, possibleBrand: productsBrandsSelect | null } & {
      shopCurrentPrices: productsShopsPrices[];
    }
  >;
}) {
  return (
    <ScrollArea>
      <div className="flex w-38 space-x-4">
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
                  className="max-w-none"
                />
              ) : null}
            </div>
            <Unit unit={relatedProduct.unit} />
            <div>
              <ProductBrand brand={relatedProduct.brand} possibleBrand={relatedProduct.possibleBrand} type="related" />
              {relatedProduct.name}
            </div>
            <CheapestPrice
              shopCurrentPrices={relatedProduct.shopCurrentPrices}
              unit={relatedProduct.unit}
              categoryId={relatedProduct.categoryId}
              productName={relatedProduct.name}
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
  productName,
}: {
  shopCurrentPrices: productsShopsPrices[];
  unit: string;
  categoryId: number;
  productName: string;
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
        productName={productName}
      />
    </div>
  );
}

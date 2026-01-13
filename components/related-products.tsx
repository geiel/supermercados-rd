import {
  productsBrandsSelect,
  productsSelect,
  productsShopsPrices,
} from "@/db/schema";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { RelatedProductCard } from "./related-product-card";

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
          <RelatedProductCard key={relatedProduct.id} product={relatedProduct} />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

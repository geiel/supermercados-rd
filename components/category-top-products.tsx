import {
  productsBrandsSelect,
  productsSelect,
  productsShopsPrices,
} from "@/db/schema";
import ScrollPeek from "@/components/ui/scroll-peek";
import { PRODUCT_SCROLL_PEEK_PROPS } from "@/components/ui/product-scroll-config";
import { CategoryTopProductCard } from "@/components/category-top-product-card";

export function CategoryTopProducts({
  products,
}: {
  products: Array<
    productsSelect & {
      brand: productsBrandsSelect;
      possibleBrand: productsBrandsSelect | null;
      shopCurrentPrices: productsShopsPrices[];
      productDeal: { dropPercentage: string | number } | null;
    }
  >;
}) {
  return (
    <ScrollPeek {...PRODUCT_SCROLL_PEEK_PROPS}>
      <div className="flex gap-1.5 p-2 md:gap-2">
        {products.map((product) => (
          <CategoryTopProductCard key={product.id} product={product} />
        ))}
      </div>
    </ScrollPeek>
  );
}

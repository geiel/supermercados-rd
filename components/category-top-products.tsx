import {
  productsBrandsSelect,
  productsSelect,
  productsShopsPrices,
} from "@/db/schema";
import ScrollPeek from "@/components/ui/scroll-peek";
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
    <ScrollPeek itemWidth="190px" itemWidthMd="220px">
      <div className="flex space-x-4 p-2">
        {products.map((product) => (
          <CategoryTopProductCard key={product.id} product={product} />
        ))}
      </div>
    </ScrollPeek>
  );
}

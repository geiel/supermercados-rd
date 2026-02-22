import {
  RelatedProductCard,
  type RelatedProductCardProduct,
} from "./related-product-card";
import ScrollPeek from "./ui/scroll-peek";
import { RELATED_PRODUCTS_SCROLL_PEEK_PROPS } from "./ui/product-scroll-config";

export function RelatedProducts({
  relatedProducts,
}: {
  relatedProducts: RelatedProductCardProduct[];
}) {
  return (
    <ScrollPeek {...RELATED_PRODUCTS_SCROLL_PEEK_PROPS}>
      <div className="flex gap-1.5 p-2 md:gap-2">
        {relatedProducts.map((relatedProduct) => (
          <RelatedProductCard key={relatedProduct.id} product={relatedProduct} />
        ))}
      </div>
    </ScrollPeek>
  );
}

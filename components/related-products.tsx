import {
  RelatedProductCard,
  type RelatedProductCardProduct,
} from "./related-product-card";
import ScrollPeek from "./ui/scroll-peek";

export function RelatedProducts({
  relatedProducts,
}: {
  relatedProducts: RelatedProductCardProduct[];
}) {
  return (
    <ScrollPeek itemWidth="150px">
      <div className="flex space-x-4 p-2">
        {relatedProducts.map((relatedProduct) => (
          <RelatedProductCard key={relatedProduct.id} product={relatedProduct} />
        ))}
      </div>
    </ScrollPeek>
  );
}

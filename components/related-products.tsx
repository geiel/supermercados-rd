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
    <ScrollPeek
      itemWidth="136px"
      itemWidthSm="144px"
      itemWidthMd="152px"
      itemWidthLg="178px"
      itemWidthXl="188px"
      gutter="12px"
      peek="34%"
    >
      <div className="flex space-x-2 p-2">
        {relatedProducts.map((relatedProduct) => (
          <RelatedProductCard key={relatedProduct.id} product={relatedProduct} />
        ))}
      </div>
    </ScrollPeek>
  );
}

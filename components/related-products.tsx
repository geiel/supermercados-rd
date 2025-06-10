import { productsBrandsSelect, productsSelect } from "@/db/schema";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { ProductImage } from "./product-image";
import Link from "next/link";
import { toSlug } from "@/lib/utils";
import { Badge } from "./ui/badge";

export function RelatedProducts({
  relatedProducts,
}: {
  relatedProducts: Array<productsSelect & { brand: productsBrandsSelect }>;
}) {
  return (
    <ScrollArea>
      <div className="flex max-w-xl space-x-4">
        {relatedProducts.map((relatedProduct) => (
          <Link
            href={`/product/${toSlug(relatedProduct.name)}/${
              relatedProduct.id
            }`}
            className="flex flex-col gap-2"
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
          </Link>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

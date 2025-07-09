"use client";

import { useState } from "react";
import { TypographyH3 } from "./typography-h3";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { adminMergeProduct } from "@/lib/scrappers/admin-functions";
import { Loader2 } from "lucide-react";
import { toSlug } from "@/lib/utils";
import { ProductImage } from "./product-image";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { ScrollBar } from "./ui/scroll-area";
import Link from "next/link";
import { Badge } from "./ui/badge";
import {
  DuplicateProducts,
  findDuplicateProducts,
} from "@/lib/duplicate-query";

export function MergeProductsV2() {
  const [parentProductId, setParentProductId] = useState("");
  const [childProductId, setChildProductId] = useState("");
  const [loadingProcess, setLoadingProcess] = useState(false);
  const [duplicateProducts, setDuplicateProducts] = useState<
    DuplicateProducts[]
  >([]);
  const [ignoredProducts, setIgnoredProducts] = useState<number[]>([]);

  async function mergeProduct() {
    setLoadingProcess(true);
    try {
      await adminMergeProduct(Number(parentProductId), Number(childProductId));
    } catch (error) {
      console.error(error);
    }

    setLoadingProcess(false);
  }

  async function searchDuplicateProducts() {
    setDuplicateProducts(await findDuplicateProducts(18, 6, ignoredProducts));
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TypographyH3>Merge products V2</TypographyH3>
      <div className="flex gap-2">
        <Input
          type="number"
          value={parentProductId}
          onChange={(e) => setParentProductId(e.target.value)}
          placeholder="ID Padre"
        />
        <Input
          type="number"
          value={childProductId}
          onChange={(e) => setChildProductId(e.target.value)}
          placeholder="ID Hijo"
        />
        <Button onClick={mergeProduct} disabled={loadingProcess}>
          {loadingProcess ? <Loader2 className="animate-spin" /> : null}
          Procesar
        </Button>
      </div>
      <div>
        <Button onClick={searchDuplicateProducts}>Search...</Button>
      </div>

      <div className="flex flex-col gap-2">
        {duplicateProducts.map((duplicate, key) => (
          <div key={duplicate.product.id} className="flex gap-2 w-full">
            <Button
              onClick={() => {
                setIgnoredProducts((ig) => [...ig, duplicate.product.id]);
                setDuplicateProducts(
                  duplicateProducts.filter((_, i) => i !== key)
                );
              }}
            >
              Ignorar
            </Button>
            <div className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]">
              <div className="font-semibold">{duplicate.product.id}</div>
              <Link
                href={`/product/${toSlug(duplicate.product.name)}/${
                  duplicate.product.id
                }`}
                className="flex flex-col gap-2"
              >
                <div className="flex justify-center">
                  <div className="h-[220px] w-[220px] relative">
                    {duplicate.product.image ? (
                      <ProductImage
                        src={duplicate.product.image}
                        fill
                        alt={duplicate.product.name + duplicate.product.unit}
                        sizes="220px"
                        style={{
                          objectFit: "contain",
                        }}
                        placeholder="blur"
                        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                        className="max-w-none"
                      />
                    ) : null}
                  </div>
                </div>
                <Badge>{duplicate.product.unit}</Badge>
                <div className="font-semibold">{duplicate.product.name}</div>
              </Link>
            </div>

            <ScrollArea>
              <div className="flex w-full space-x-4">
                {duplicate.similars.map((relatedProduct) => (
                  <Link
                    href={`/product/${toSlug(relatedProduct.name)}/${
                      relatedProduct.id
                    }`}
                    className="flex flex-col gap-2 pb-2"
                    key={relatedProduct.id}
                  >
                    <div className="h-[220px] w-[220px] relative">
                      {relatedProduct.image ? (
                        <ProductImage
                          src={relatedProduct.image}
                          fill
                          alt={relatedProduct.name + relatedProduct.unit}
                          sizes="220px"
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
                    <div>{relatedProduct.name}</div>
                  </Link>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        ))}
      </div>
    </div>
  );
}

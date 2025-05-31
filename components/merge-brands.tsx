"use client";

import {
  productsBrandsSelect,
  productsCategoriesSelect,
  productsSelect,
} from "@/db/schema";
import { TypographyH3 } from "./typography-h3";
import { Combobox } from "./combobox";
import { useState } from "react";
import { Button } from "./ui/button";
import { getProductsByBrand } from "@/lib/scrappers/product-brand";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toSlug } from "@/lib/utils";
import Image from "next/image";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  adminMergeProduct,
  getSimilarProducts,
} from "@/lib/scrappers/admin-functions";

export default function MergeProducts({
  brands,
  categories,
}: {
  brands: productsBrandsSelect[];
  categories: productsCategoriesSelect[];
}) {
  const [brandId, setBrandId] = useState(0);
  const [cateogoryId, setCategoryId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<productsSelect[]>([]);
  const [similarProducts, setSimilarProducts] = useState<
    {
      id1: number;
      name1: string;
      image1: string | null;
      unit1: string;
      brand1Name: string;
      id2: number;
      name2: string;
      image2: string;
      unit2: string;
      brand2Name: string;
      sml: number;
    }[]
  >([]);
  const [parentProductId, setParentProductId] = useState("");
  const [childProductId, setChildProductId] = useState("");
  const [loadingProcess, setLoadingProcess] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [ignoredProducts, setIgnoredProducts] = useState<number[]>([]);

  async function searchProducts() {
    setLoading(true);
    setProducts(await getProductsByBrand(brandId));
    setLoading(false);
  }

  async function mergeProduct() {
    setLoadingProcess(true);
    await adminMergeProduct(Number(parentProductId), Number(childProductId));
    setLoadingProcess(false);
  }

  async function searchSimilarProducts() {
    setLoadingSimilar(true);
    setSimilarProducts(
      await getSimilarProducts(Number(cateogoryId), ignoredProducts)
    );
    setLoadingSimilar(false);
  }

  function removeItem(index: number, productId: number) {
    setIgnoredProducts((ignoredProducts) => [...ignoredProducts, productId]);
    setSimilarProducts(similarProducts.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TypographyH3>Merge products</TypographyH3>

      <div className="flex gap-2">
        <Combobox
          options={brands.map((c) => ({
            value: c.id.toString(),
            label: c.name,
          }))}
          emptyMessage="Marca no encontrada"
          placeholder="Marca"
          onValueChange={(value) => setBrandId(Number(value.value))}
        />
        <Button disabled={!brandId || loading} onClick={searchProducts}>
          {loading ? <Loader2 className="animate-spin" /> : null}
          Buscar
        </Button>
      </div>

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

      <div className="flex gap-2">
        <Combobox
          options={categories.map((c) => ({
            value: c.id.toString(),
            label: c.name,
          }))}
          emptyMessage="Categoría no encontrada"
          placeholder="Categoría"
          onValueChange={(option) => setCategoryId(option.value)}
        />
        <Button onClick={searchSimilarProducts}>
          {loadingSimilar ? <Loader2 className="animate-spin" /> : null}
          Buscar similares
        </Button>
        <div>
          <Button onClick={() => setIgnoredProducts([])}>Reset</Button>
        </div>
      </div>

      <div className="flex">
        <div className="grid grid-cols-3">
          {similarProducts.map((product, index) => (
            <>
              <div
                key={product.id1}
                className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]"
              >
                <div>{product.brand1Name}</div>
                <div className="font-semibold">{product.id1}</div>
                <Link
                  href={`/product/${toSlug(product.name1)}/${product.id1}`}
                  className="flex flex-col gap-2"
                >
                  <div className="flex justify-center">
                    {product.image1 ? (
                      <Image
                        src={product.image1}
                        width={200}
                        height={200}
                        alt={product.name1}
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <Badge>{product.unit1}</Badge>
                  <div className="font-semibold">{product.name1}</div>
                </Link>
              </div>
              <div
                key={product.id2}
                className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]"
              >
                <div>{product.brand2Name}</div>
                <div className="font-semibold">{product.id2}</div>
                <Link
                  href={`/product/${toSlug(product.name2)}/${product.id2}`}
                  className="flex flex-col gap-2"
                >
                  <div className="flex justify-center">
                    {product.image2 ? (
                      <Image
                        src={product.image2}
                        width={200}
                        height={200}
                        alt={product.name2}
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <Badge>{product.unit2}</Badge>
                  <div className="font-semibold">{product.name2}</div>
                </Link>
              </div>
              <div>
                <Button onClick={() => removeItem(index, product.id2)}>
                  Ignorar
                </Button>
              </div>
            </>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
        {products.map((product) => (
          <div
            key={product.id}
            className="aspect-square p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]"
          >
            <div className="font-semibold">{product.id}</div>
            <Link
              href={`/product/${toSlug(product.name)}/${product.id}`}
              className="flex flex-col gap-2"
            >
              <div className="flex justify-center">
                {product.image ? (
                  <Image
                    src={product.image}
                    width={200}
                    height={200}
                    alt={product.name + product.unit}
                    unoptimized
                  />
                ) : null}
              </div>
              <Badge>{product.unit}</Badge>
              <div className="font-semibold">{product.name}</div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { productsBrandsSelect, productsSelect } from "@/db/schema";
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
import { adminMergeProduct } from "@/lib/scrappers/admin-functions";

export default function MergeProducts({
  brands,
}: {
  brands: productsBrandsSelect[];
}) {
  const [brandId, setBrandId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<productsSelect[]>([]);
  const [parentProductId, setParentProductId] = useState("");
  const [childProductId, setChildProductId] = useState("");
  const [loadingProcess, setLoadingProcess] = useState(false);

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

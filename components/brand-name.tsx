"use client";

import { productsCategoriesSelect, productsSelect } from "@/db/schema";
import { TypographyH3 } from "./typography-h3";
import { Combobox } from "./combobox";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { setProductBrand } from "@/lib/scrappers/product-brand";
import Link from "next/link";
import { toSlug } from "@/lib/utils";
import Image from "next/image";

export default function BrandName({
  categories,
}: {
  categories: productsCategoriesSelect[];
}) {
  const [cateogoryId, setCategoryId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatedProducts, setUpdatedProducts] = useState<productsSelect[]>([]);

  async function configureBrandName() {
    if (!brandName || !cateogoryId) {
      return;
    }
    setLoading(true);
    setUpdatedProducts(await setProductBrand(brandName, Number(cateogoryId)));
    setLoading(false);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TypographyH3>Set Brand Name</TypographyH3>

      <Combobox
        options={categories.map((c) => ({
          value: c.id.toString(),
          label: c.name,
        }))}
        emptyMessage="Categoría no encontrada"
        placeholder="Categoría"
        onValueChange={(option) => setCategoryId(option.value)}
      />

      <Input
        value={brandName}
        onChange={(e) => setBrandName(e.target.value)}
        placeholder="Marca"
      />

      <div>
        <Button onClick={configureBrandName} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : null}
          Procesar
        </Button>
      </div>

      <div className="grid grid-cols-2 place-items-stretch md:grid-cols-3 lg:grid-cols-5">
        {updatedProducts.map((product) => (
          <div
            key={product.id}
            className="aspect-square p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]"
          >
            <Link
              href={`/productos/${toSlug(product.name)}/${product.id}`}
              className="flex flex-col gap-2"
              prefetch={false}
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
              <div className="font-semibold">{product.name}</div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

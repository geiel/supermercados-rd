"use client";

import { Combobox } from "@/components/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { productsCategoriesSelect, shopsSelect } from "@/db/schema";
import { getProductListSirena } from "@/lib/scrappers/sirena-extractor";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { TypographyH3 } from "./typography-h3";
import { getProductListJumbo } from "@/lib/scrappers/jumbo-extractor";
import {
  getProductListNacional,
  type NacionalExtractorResult,
  updateNacionalProductName,
} from "@/lib/scrappers/nacional-extractor";
import { getProductListPlazaLama } from "@/lib/scrappers/plaza-lama-extractor";
import { getProductListPricesmart } from "@/lib/scrappers/pricesmart-extractor";
import { getProductListBravo } from "@/lib/scrappers/bravo-extractor";
import { ProductImage } from "./product-image";

export function ProductExtractor({
  shops,
  categories,
}: {
  shops: shopsSelect[];
  categories: productsCategoriesSelect[];
}) {
  const [shopId, setShopId] = useState<string>("");
  const [cateogoryId, setCategoryId] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [existingProducts, setExistingProducts] = useState<
    NacionalExtractorResult["existingProducts"]
  >([]);
  const [editedNames, setEditedNames] = useState<Record<number, string>>({});
  const [updatingProductId, setUpdatingProductId] = useState<number | null>(
    null
  );

  async function processSupermarket() {
    if (!shopId || !cateogoryId || !url) return;

    setLoading(true);
    setExistingProducts([]);
    setEditedNames({});

    try {
      switch (shopId) {
        case "1":
          await getProductListSirena(Number(cateogoryId), url);
          break;
        case "2": {
          const result = await getProductListNacional(
            Number(cateogoryId),
            url
          );
          setExistingProducts(result.existingProducts);
          setEditedNames(
            Object.fromEntries(
              result.existingProducts.map((item) => [
                item.existing.id,
                item.existing.name,
              ])
            )
          );
          break;
        }
        case "3":
          await getProductListJumbo(Number(cateogoryId), url);
          break;
        case "4":
          await getProductListPlazaLama(Number(cateogoryId));
          break;
        case "5":
          await getProductListPricesmart(Number(cateogoryId));
          break;
        case "6":
          await getProductListBravo(Number(cateogoryId), url);
          break;
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateExistingName(productId: number) {
    const newName = (editedNames[productId] ?? "").trim();

    if (!newName) return;

    setUpdatingProductId(productId);

    try {
      const updated = await updateNacionalProductName(productId, newName);

      setExistingProducts((prev) =>
        prev.map((item) =>
          item.existing.id === productId
            ? { ...item, existing: { ...item.existing, name: updated.name } }
            : item
        )
      );

      setEditedNames((prev) => ({
        ...prev,
        [productId]: updated.name,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingProductId(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TypographyH3>Products Extractor</TypographyH3>
      <Select onValueChange={setShopId}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Supermercado" />
        </SelectTrigger>
        <SelectContent>
          {shops.map((shop) => (
            <SelectItem key={shop.id} value={shop.id.toString()}>
              {shop.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Combobox
        options={categories.map((c) => ({
          value: c.id.toString(),
          label: c.name,
        }))}
        emptyMessage="Categoría no encontrada"
        placeholder="Categoría"
        onValueChange={(option) => setCategoryId(option.value)}
      />

      <Textarea
        placeholder="URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <div>
        <Button onClick={processSupermarket} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : null}
          Procesar
        </Button>
      </div>

      {existingProducts.length > 0 ? (
        <div className="space-y-3 rounded-lg border border-dashed border-neutral-300 p-4">
          <div>
            <TypographyH3>Productos ya existentes</TypographyH3>
            <p className="text-sm text-muted-foreground">
              Estos productos ya estaban en la base de datos. Puedes ajustar el
              nombre si es necesario.
            </p>
          </div>

          <div className="space-y-4">
            {existingProducts.map((item) => {
              const inputValue =
                editedNames[item.existing.id] ?? item.existing.name;

              return (
                <div
                  key={item.existing.id}
                  className="space-y-3 rounded-lg border p-3"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <ProductCard
                      title="En base"
                      product={item.existing}
                      fallbackLabel="Sin imagen"
                    />
                    <ProductCard
                      title="Scrapeado"
                      product={item.incoming}
                      fallbackLabel="Imagen nueva"
                    />
                  </div>

                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <Input
                      value={inputValue}
                      onChange={(e) =>
                        setEditedNames((prev) => ({
                          ...prev,
                          [item.existing.id]: e.target.value,
                        }))
                      }
                      className="md:max-w-lg"
                      placeholder="Nombre del producto"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setEditedNames((prev) => ({
                            ...prev,
                            [item.existing.id]: item.incoming.name,
                          }))
                        }
                      >
                        Usar nombre scrapeado
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleUpdateExistingName(item.existing.id)}
                        disabled={updatingProductId === item.existing.id}
                      >
                        {updatingProductId === item.existing.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Actualizar nombre
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProductCard({
  title,
  product,
  fallbackLabel,
}: {
  title: string;
  product: {
    id?: number;
    name: string;
    unit: string;
    image: string | null;
    brandName: string;
  };
  fallbackLabel: string;
}) {
  return (
    <div className="space-y-2 rounded-md border bg-white p-3 shadow-sm">
      <div className="text-sm font-semibold text-neutral-700">{title}</div>
      <div className="flex gap-3">
        <div className="relative h-24 w-24 overflow-hidden rounded-md bg-neutral-50">
          {product.image ? (
            <ProductImage
              src={product.image}
              productId={product.id}
              alt={`${product.name} ${product.unit}`}
              fill
              sizes="96px"
              className="object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
              {fallbackLabel}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold leading-tight">
            {product.name}
          </div>
          <div className="text-xs text-neutral-600">{product.brandName}</div>
          <div className="text-xs text-neutral-600">{product.unit}</div>
        </div>
      </div>
    </div>
  );
}

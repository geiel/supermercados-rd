"use client";

import {
  productsBrandsSelect,
  productsCategoriesSelect,
  productsSelect,
} from "@/db/schema";
import { TypographyH3 } from "./typography-h3";
import { Combobox } from "./combobox";
import { useEffect, useState } from "react";
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
      deleted1: boolean | null;
      id2: number;
      name2: string;
      image2: string;
      unit2: string;
      brand2Name: string;
      deleted2: boolean | null;
      sml: number;
      totalSimilar: number;
    }[]
  >([]);
  const [parentProductId, setParentProductId] = useState("");
  const [childProductId, setChildProductId] = useState("");
  const [loadingProcess, setLoadingProcess] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [ignoredProducts, setIgnoredProducts] = useState<number[]>([]);
  const [ignoreBaseProducts, setIgnoreBaseProducts] = useState<number[]>([]);
  const [pendingSimilarCount, setPendingSimilarCount] = useState<number | null>(
    null
  );
  const [ignoredWords, setIgnoredWords] = useState<string[]>([]);
  const [ignoredWordInput, setIgnoredWordInput] = useState("");

  useEffect(() => {
    const ignoredProductsFromStorage = localStorage.getItem("ignoredProducts");
    if (ignoredProductsFromStorage) {
      try {
        const parsed = JSON.parse(ignoredProductsFromStorage);
        if (Array.isArray(parsed)) {
          setIgnoredProducts(parsed);
        }
      } catch (error) {
        console.error("Failed to parse ignoredProducts", error);
      }
    }

    const ignoredWordsFromStorage = localStorage.getItem("ignoredWords");
    if (ignoredWordsFromStorage) {
      try {
        const parsed = JSON.parse(ignoredWordsFromStorage);
        if (Array.isArray(parsed)) {
          setIgnoredWords(parsed);
        }
      } catch (error) {
        console.error("Failed to parse ignoredWords", error);
      }
    }
  }, []);

  useEffect(() => {
    if (ignoredProducts.length === 0) {
      localStorage.removeItem("ignoredProducts");
      return;
    }

    localStorage.setItem("ignoredProducts", JSON.stringify(ignoredProducts));
  }, [ignoredProducts]);

  useEffect(() => {
    if (ignoredWords.length === 0) {
      localStorage.removeItem("ignoredWords");
      return;
    }

    localStorage.setItem("ignoredWords", JSON.stringify(ignoredWords));
  }, [ignoredWords]);

  async function searchProducts() {
    setLoading(true);
    setProducts(await getProductsByBrand(brandId));
    setLoading(false);
  }

  async function mergeProduct() {
    setLoadingProcess(true);
    try {
      await adminMergeProduct(Number(parentProductId), Number(childProductId));
    } catch (error) {
      console.error(error);
    }

    setLoadingProcess(false);
  }

  async function searchSimilarProducts() {
    setLoadingSimilar(true);
    const response = await getSimilarProducts(
      Number(cateogoryId),
      ignoredProducts,
      ignoreBaseProducts,
      ignoredWords
    );


    setSimilarProducts(response);
    setPendingSimilarCount(response.length > 0 ? response[0].totalSimilar : 0);

    // setSimilarProducts(await getGlobalSimilarProducts(ignoredProducts));
    setLoadingSimilar(false);
  }

  function removeItem(
    index: number,
    productId: number,
    db = true,
    base = false
  ) {
    if (base) {
      setIgnoreBaseProducts((ignoredBaseProducts) => [
        ...ignoredBaseProducts,
        productId,
      ]);
    }

    if (db) {
      setIgnoredProducts((prev) => {
        if (prev.includes(productId)) {
          return prev;
        }

        return [...prev, productId];
      });
    }
    setSimilarProducts((prev) => prev.filter((_, i) => i !== index));
  }

  function addIgnoredWord() {
    const sanitizedWord = ignoredWordInput.trim().toLowerCase();

    if (!sanitizedWord) {
      return;
    }

    setIgnoredWords((prev) =>
      prev.includes(sanitizedWord) ? prev : [...prev, sanitizedWord]
    );
    setIgnoredWordInput("");
  }

  function removeIgnoredWord(word: string) {
    setIgnoredWords((prev) => prev.filter((w) => w !== word));
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

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            value={ignoredWordInput}
            onChange={(event) => setIgnoredWordInput(event.target.value)}
            placeholder="Palabra clave a ignorar"
          />
          <Button onClick={addIgnoredWord} disabled={!ignoredWordInput.trim()}>
            Agregar palabra
          </Button>
        </div>
        {ignoredWords.length ? (
          <div className="flex flex-wrap gap-2">
            {ignoredWords.map((word) => (
              <Badge
                key={word}
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1 text-sm"
              >
                {word}
                <button
                  type="button"
                  className="text-xs font-semibold"
                  onClick={() => removeIgnoredWord(word)}
                  aria-label={`Eliminar palabra ${word}`}
                >
                  x
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
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
          <Button
            onClick={() => {
              setIgnoredProducts([]);
              setPendingSimilarCount(null);
            }}
          >
            Reset
          </Button>
        </div>
        {pendingSimilarCount !== null ? (
          <div className="self-center text-sm text-muted-foreground">
            Productos pendientes por comparar:{" "}
            <span className="font-semibold">{pendingSimilarCount}</span>
          </div>
        ) : null}
      </div>

      <div className="flex">
        <div className="grid grid-cols-3">
          {similarProducts.map((product, originalIndex) => (
            <>
              <div
                key={product.id1}
                className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]"
              >
                <div className="flex justify-between">
                  <div>
                    <div>{product.brand1Name}</div>
                    <div className="font-semibold">{product.id1}</div>
                  </div>
                  {product.deleted1 ? (<span className="text-red-500 font-bold">Eliminado</span>) : null}
                </div>
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
                <div className="flex justify-between">
                  <div>
                    <div>{product.brand2Name}</div>
                    <div className="font-semibold">{product.id2}</div>
                  </div>
                  {product.deleted2 ? (<span className="text-red-500 font-bold">Eliminado</span>) : null}
                </div>
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    removeItem(originalIndex, product.id2, false, false)
                  }
                >
                  Ignorar
                </Button>
                <Button
                  onClick={() =>
                    removeItem(originalIndex, product.id2, true, false)
                  }
                >
                  Ignorar DB
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    removeItem(originalIndex, product.id1, false, true)
                  }
                >
                  Ignorar Base
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

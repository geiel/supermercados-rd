"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { productsBrandsSelect } from "@/db/schema";
import { adminMergeProduct, getBrandSimilarProducts } from "@/lib/scrappers/admin-functions";
import { toSlug } from "@/lib/utils";
import { TypographyH3 } from "./typography-h3";
import { Combobox } from "./combobox";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

const BRAND_RESULTS_LIMIT = 600;
const PAIR_RESULTS_LIMIT = 50;

type SimilarProductPair = {
  id1: number;
  name1: string;
  image1: string | null;
  unit1: string;
  brand1Name: string;
  deleted1: boolean | null;
  id2: number;
  name2: string;
  image2: string | null;
  unit2: string;
  brand2Name: string;
  deleted2: boolean | null;
  sml: number;
  totalSimilar: number;
};

export default function MergeProductsByBrand({
  brands,
}: {
  brands: productsBrandsSelect[];
}) {
  const [brandIndex, setBrandIndex] = useState(0);
  const [parentProductId, setParentProductId] = useState("");
  const [childProductId, setChildProductId] = useState("");
  const [loadingProcess, setLoadingProcess] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<
    SimilarProductPair[]
  >([]);
  const [ignoredProducts, setIgnoredProducts] = useState<number[]>([]);
  const [ignoredWords, setIgnoredWords] = useState<string[]>([]);
  const [ignoredWordInput, setIgnoredWordInput] = useState("");
  const [pendingSimilarCount, setPendingSimilarCount] = useState<number | null>(
    null
  );

  const currentBrand = brands[brandIndex];

  useEffect(() => {
    setIgnoredProducts([]);
    setIgnoredWords([]);
    setSimilarProducts([]);
    setPendingSimilarCount(null);
  }, [brandIndex]);

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
    if (!currentBrand) {
      return;
    }

    setLoadingSimilar(true);
    const response = await getBrandSimilarProducts(
      currentBrand.name,
      ignoredProducts,
      ignoredWords,
      0.1,
      BRAND_RESULTS_LIMIT,
      PAIR_RESULTS_LIMIT
    );

    setSimilarProducts(response);
    setPendingSimilarCount(response.length > 0 ? response[0].totalSimilar : 0);
    setLoadingSimilar(false);
  }

  function addIgnoredProduct(productId: number) {
    setIgnoredProducts((prev) =>
      prev.includes(productId) ? prev : [...prev, productId]
    );
    setSimilarProducts((prev) =>
      prev.filter((product) => product.id1 !== productId && product.id2 !== productId)
    );
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

  function resetIgnored() {
    setIgnoredProducts([]);
    setIgnoredWords([]);
    setSimilarProducts([]);
    setPendingSimilarCount(null);
  }

  if (!currentBrand) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <TypographyH3>Merge products by brand</TypographyH3>
        <div>No hay marcas disponibles.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TypographyH3>Merge products by brand</TypographyH3>

      <div className="flex flex-wrap items-center gap-2">
        <Combobox
          options={brands.map((brand) => ({
            value: brand.id.toString(),
            label: brand.name,
          }))}
          emptyMessage="Marca no encontrada"
          placeholder="Marca"
          onValueChange={(option) => {
            const index = brands.findIndex(
              (brand) => brand.id.toString() === option.value
            );
            if (index >= 0) {
              setBrandIndex(index);
            }
          }}
        />
        <Button
          variant="outline"
          onClick={() => setBrandIndex((index) => Math.max(0, index - 1))}
          disabled={brandIndex === 0}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setBrandIndex((index) => Math.min(brands.length - 1, index + 1))
          }
          disabled={brandIndex >= brands.length - 1}
        >
          Siguiente
        </Button>
        <div className="text-sm text-muted-foreground">
          {brandIndex + 1} / {brands.length}
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Marca actual: <span className="font-semibold">{currentBrand.name}</span>
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

      <div className="flex flex-wrap gap-2">
        <Button onClick={searchSimilarProducts} disabled={loadingSimilar}>
          {loadingSimilar ? <Loader2 className="animate-spin" /> : null}
          Buscar similares
        </Button>
        <Button variant="outline" onClick={resetIgnored}>
          Reset
        </Button>
        {pendingSimilarCount !== null ? (
          <div className="self-center text-sm text-muted-foreground">
            Productos pendientes por comparar: {" "}
            <span className="font-semibold">{pendingSimilarCount}</span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3">
        {similarProducts.map((product) => (
          <div key={`${product.id1}-${product.id2}`} className="contents">
            <div className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]">
              <div className="flex justify-between">
                <div>
                  <div>{product.brand1Name}</div>
                  <div className="font-semibold">{product.id1}</div>
                </div>
                {product.deleted1 ? (
                  <span className="text-red-500 font-bold">Eliminado</span>
                ) : null}
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
            <div className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]">
              <div className="flex justify-between">
                <div>
                  <div>{product.brand2Name}</div>
                  <div className="font-semibold">{product.id2}</div>
                </div>
                {product.deleted2 ? (
                  <span className="text-red-500 font-bold">Eliminado</span>
                ) : null}
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
            <div className="flex flex-col gap-2 p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]">
              <Button
                variant="secondary"
                onClick={() => {
                  setParentProductId(product.id1.toString());
                  setChildProductId(product.id2.toString());
                }}
              >
                Usar IDs en formulario
              </Button>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => addIgnoredProduct(product.id1)}>
                  Ignorar {product.id1}
                </Button>
                <Button variant="outline" onClick={() => addIgnoredProduct(product.id2)}>
                  Ignorar {product.id2}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

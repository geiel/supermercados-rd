"use client";

import * as Sentry from "@sentry/nextjs";
import type { productsBrandsSelect, productsCategoriesSelect, productsSelect } from "@/db/schema";
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
  adminMergeProductBySource,
  getSimilarProducts,
  type ProductSource,
  type SimilarProductsIgnoredIds,
} from "@/lib/scrappers/admin-functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type SimilarProductPair = {
  id1: number;
  name1: string;
  image1: string | null;
  unit1: string;
  brand1Name: string;
  deleted1: boolean | null;
  source1: ProductSource;
  id2: number;
  name2: string;
  image2: string | null;
  unit2: string;
  brand2Name: string;
  deleted2: boolean | null;
  source2: ProductSource;
  sml: number;
  totalSimilar: number;
};

const EMPTY_IGNORED_IDS: SimilarProductsIgnoredIds = {
  products: [],
  unverifiedProducts: [],
  baseUnverifiedProducts: [],
};

const SOURCE_LABEL: Record<ProductSource, string> = {
  products: "Producto",
  unverified_products: "No verificado",
};

const IGNORED_PRODUCTS_STORAGE_KEY = "mergeProductsIgnoredIds";
const IGNORED_WORDS_STORAGE_KEY = "mergeProductsIgnoredWords";

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
  const [similarProducts, setSimilarProducts] = useState<SimilarProductPair[]>([]);
  const [parentProductId, setParentProductId] = useState("");
  const [parentProductSource, setParentProductSource] =
    useState<ProductSource>("products");
  const [childProductId, setChildProductId] = useState("");
  const [childProductSource, setChildProductSource] =
    useState<ProductSource>("products");
  const [loadingProcess, setLoadingProcess] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [ignoredIds, setIgnoredIds] =
    useState<SimilarProductsIgnoredIds>(EMPTY_IGNORED_IDS);
  const [pendingSimilarCount, setPendingSimilarCount] = useState<number | null>(
    null
  );
  const [ignoredWords, setIgnoredWords] = useState<string[]>([]);
  const [ignoredWordInput, setIgnoredWordInput] = useState("");

  useEffect(() => {
    const ignoredIdsFromStorage = localStorage.getItem(
      IGNORED_PRODUCTS_STORAGE_KEY
    );
    if (ignoredIdsFromStorage) {
      try {
        const parsed = JSON.parse(ignoredIdsFromStorage);
        const parsedProducts = Array.isArray(parsed?.products)
          ? parsed.products.filter((id: unknown) => Number.isInteger(id))
          : [];
        const parsedUnverifiedProducts = Array.isArray(
          parsed?.unverifiedProducts
        )
          ? parsed.unverifiedProducts.filter((id: unknown) => Number.isInteger(id))
          : [];
        const parsedBaseUnverifiedProducts = Array.isArray(
          parsed?.baseUnverifiedProducts
        )
          ? parsed.baseUnverifiedProducts.filter((id: unknown) => Number.isInteger(id))
          : [];

        setIgnoredIds({
          products: parsedProducts,
          unverifiedProducts: parsedUnverifiedProducts,
          baseUnverifiedProducts: parsedBaseUnverifiedProducts,
        });
      } catch (error) {
        Sentry.logger.error("Failed to parse ignored IDs", { error });
      }
    }

    const ignoredWordsFromStorage = localStorage.getItem(
      IGNORED_WORDS_STORAGE_KEY
    );
    if (ignoredWordsFromStorage) {
      try {
        const parsed = JSON.parse(ignoredWordsFromStorage);
        if (Array.isArray(parsed)) {
          setIgnoredWords(parsed);
        }
      } catch (error) {
        Sentry.logger.error("Failed to parse ignoredWords", { error });
      }
    }
  }, []);

  useEffect(() => {
    const hasIgnoredProducts =
      ignoredIds.products.length > 0 ||
      ignoredIds.unverifiedProducts.length > 0 ||
      ignoredIds.baseUnverifiedProducts.length > 0;

    if (!hasIgnoredProducts) {
      localStorage.removeItem(IGNORED_PRODUCTS_STORAGE_KEY);
      return;
    }

    localStorage.setItem(IGNORED_PRODUCTS_STORAGE_KEY, JSON.stringify(ignoredIds));
  }, [ignoredIds]);

  useEffect(() => {
    if (ignoredWords.length === 0) {
      localStorage.removeItem(IGNORED_WORDS_STORAGE_KEY);
      return;
    }

    localStorage.setItem(IGNORED_WORDS_STORAGE_KEY, JSON.stringify(ignoredWords));
  }, [ignoredWords]);

  async function searchProducts() {
    setLoading(true);
    setProducts(await getProductsByBrand(brandId));
    setLoading(false);
  }

  async function mergeProduct() {
    const parentId = Number(parentProductId);
    const childId = Number(childProductId);

    if (!Number.isInteger(parentId) || !Number.isInteger(childId)) {
      return;
    }

    setLoadingProcess(true);
    try {
      await adminMergeProductBySource(
        parentId,
        parentProductSource,
        childId,
        childProductSource
      );
    } catch (error) {
      Sentry.logger.error("Unexpected error", { error });
    }

    setLoadingProcess(false);
  }

  async function searchSimilarProducts() {
    if (!cateogoryId) {
      return;
    }

    setLoadingSimilar(true);
    const response = await getSimilarProducts(
      Number(cateogoryId),
      ignoredIds,
      ignoredWords
    );

    setSimilarProducts(response);
    setPendingSimilarCount(response.length > 0 ? response[0].totalSimilar : 0);
    setLoadingSimilar(false);
  }

  function removeItem(
    index: number,
    product: { id: number; source: ProductSource },
    persist = true,
    base = false
  ) {
    if (base && product.source === "unverified_products") {
      setIgnoredIds((prev) => ({
        ...prev,
        baseUnverifiedProducts: prev.baseUnverifiedProducts.includes(product.id)
          ? prev.baseUnverifiedProducts
          : [...prev.baseUnverifiedProducts, product.id],
      }));
    }

    if (persist) {
      setIgnoredIds((prev) => {
        if (product.source === "products") {
          return {
            ...prev,
            products: prev.products.includes(product.id)
              ? prev.products
              : [...prev.products, product.id],
          };
        }

        return {
          ...prev,
          unverifiedProducts: prev.unverifiedProducts.includes(product.id)
            ? prev.unverifiedProducts
            : [...prev.unverifiedProducts, product.id],
        };
      });
    }

    setSimilarProducts((prev) => prev.filter((_, i) => i !== index));
  }

  function setMergeValuesFromPair(pair: SimilarProductPair) {
    if (pair.source1 === "products" && pair.source2 === "unverified_products") {
      setParentProductId(pair.id1.toString());
      setParentProductSource(pair.source1);
      setChildProductId(pair.id2.toString());
      setChildProductSource(pair.source2);
      return;
    }

    if (pair.source1 === "unverified_products" && pair.source2 === "products") {
      setParentProductId(pair.id2.toString());
      setParentProductSource(pair.source2);
      setChildProductId(pair.id1.toString());
      setChildProductSource(pair.source1);
      return;
    }

    setParentProductId(pair.id1.toString());
    setParentProductSource(pair.source1);
    setChildProductId(pair.id2.toString());
    setChildProductSource(pair.source2);
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
      <div className="flex flex-wrap gap-2">
        <Input
          type="number"
          value={parentProductId}
          onChange={(e) => setParentProductId(e.target.value)}
          placeholder="ID Padre"
        />
        <Select
          value={parentProductSource}
          onValueChange={(value) => setParentProductSource(value as ProductSource)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tabla padre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="products">products</SelectItem>
            <SelectItem value="unverified_products">unverified_products</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="number"
          value={childProductId}
          onChange={(e) => setChildProductId(e.target.value)}
          placeholder="ID Hijo"
        />
        <Select
          value={childProductSource}
          onValueChange={(value) => setChildProductSource(value as ProductSource)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tabla hijo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="products">products</SelectItem>
            <SelectItem value="unverified_products">unverified_products</SelectItem>
          </SelectContent>
        </Select>

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
        <Button onClick={searchSimilarProducts} disabled={!cateogoryId}>
          {loadingSimilar ? <Loader2 className="animate-spin" /> : null}
          Buscar similares
        </Button>
        <div>
          <Button
            onClick={() => {
              setIgnoredIds(EMPTY_IGNORED_IDS);
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
            <div key={`${product.source1}-${product.id1}-${product.source2}-${product.id2}`} className="contents">
              <SimilarProductCard
                id={product.id1}
                name={product.name1}
                image={product.image1}
                unit={product.unit1}
                brandName={product.brand1Name}
                deleted={product.deleted1}
                source={product.source1}
              />
              <SimilarProductCard
                id={product.id2}
                name={product.name2}
                image={product.image2}
                unit={product.unit2}
                brandName={product.brand2Name}
                deleted={product.deleted2}
                source={product.source2}
              />
              <div className="flex flex-col gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setMergeValuesFromPair(product)}
                >
                  Usar IDs en formulario
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      removeItem(
                        originalIndex,
                        { id: product.id2, source: product.source2 },
                        false,
                        false
                      )
                    }
                  >
                    Ignorar
                  </Button>
                  <Button
                    onClick={() =>
                      removeItem(
                        originalIndex,
                        { id: product.id2, source: product.source2 },
                        true,
                        false
                      )
                    }
                  >
                    Ignorar DB
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      removeItem(
                        originalIndex,
                        { id: product.id1, source: product.source1 },
                        false,
                        true
                      )
                    }
                  >
                    Ignorar Base
                  </Button>
                </div>
              </div>
            </div>
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
              href={`/productos/${toSlug(product.name)}/${product.id}`}
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

function SimilarProductCard({
  id,
  name,
  image,
  unit,
  brandName,
  deleted,
  source,
}: {
  id: number;
  name: string;
  image: string | null;
  unit: string;
  brandName: string;
  deleted: boolean | null;
  source: ProductSource;
}) {
  const content = (
    <>
      <div className="flex justify-between gap-2">
        <div>
          <div>{brandName}</div>
          <div className="font-semibold">{id}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={source === "products" ? "default" : "secondary"}>
            {SOURCE_LABEL[source]}
          </Badge>
          {deleted ? <span className="text-red-500 font-bold">Eliminado</span> : null}
        </div>
      </div>
      <div className="flex justify-center">
        {image ? (
          <Image src={image} width={200} height={200} alt={name} unoptimized />
        ) : null}
      </div>
      <Badge>{unit}</Badge>
      <div className="font-semibold">{name}</div>
    </>
  );

  return (
    <div className="p-4 border border-[#eeeeee] mb-[-1px] ml-[-1px]">
      {source === "products" ? (
        <Link href={`/productos/${toSlug(name)}/${id}`} className="flex flex-col gap-2">
          {content}
        </Link>
      ) : (
        <div className="flex flex-col gap-2">{content}</div>
      )}
    </div>
  );
}

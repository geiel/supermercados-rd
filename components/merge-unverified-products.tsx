"use client";

import * as Sentry from "@sentry/nextjs";
import type {
  productsCategoriesSelect,
  shopsSelect,
} from "@/db/schema";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { TypographyH3 } from "./typography-h3";
import { Combobox } from "./combobox";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "./ui/empty";
import {
  adminMergeProductBySource,
  getSimilarUnverifiedToVerifiedProducts,
  type SimilarUnverifiedProductsIgnoredIds,
  type SimilarUnverifiedToVerifiedPair,
} from "@/lib/scrappers/admin-functions";
import { toSlug } from "@/lib/utils";

const EMPTY_IGNORED_IDS: SimilarUnverifiedProductsIgnoredIds = {
  products: [],
  unverifiedProducts: [],
};

const IGNORED_IDS_STORAGE_KEY = "mergeUnverifiedProductsIgnoredIds";
const IGNORED_WORDS_STORAGE_KEY = "mergeUnverifiedProductsIgnoredWords";

export default function MergeUnverifiedProducts({
  categories,
  shops,
}: {
  categories: productsCategoriesSelect[];
  shops: shopsSelect[];
}) {
  const [categoryId, setCategoryId] = useState("");
  const [shopId, setShopId] = useState("");
  const [parentProductId, setParentProductId] = useState("");
  const [childProductId, setChildProductId] = useState("");
  const [loadingProcess, setLoadingProcess] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<
    SimilarUnverifiedToVerifiedPair[]
  >([]);
  const [ignoredIds, setIgnoredIds] =
    useState<SimilarUnverifiedProductsIgnoredIds>(EMPTY_IGNORED_IDS);
  const [ignoredWords, setIgnoredWords] = useState<string[]>([]);
  const [ignoredWordInput, setIgnoredWordInput] = useState("");
  const [pendingSimilarCount, setPendingSimilarCount] = useState<number | null>(
    null
  );
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [similarError, setSimilarError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const ignoredIdsFromStorage = localStorage.getItem(IGNORED_IDS_STORAGE_KEY);
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

        setIgnoredIds({
          products: parsedProducts,
          unverifiedProducts: parsedUnverifiedProducts,
        });
      } catch (error) {
        Sentry.logger.error("Failed to parse ignored IDs", { error });
      }
    }

    const ignoredWordsFromStorage = localStorage.getItem(IGNORED_WORDS_STORAGE_KEY);
    if (ignoredWordsFromStorage) {
      try {
        const parsed = JSON.parse(ignoredWordsFromStorage);
        if (Array.isArray(parsed)) {
          setIgnoredWords(parsed);
        }
      } catch (error) {
        Sentry.logger.error("Failed to parse ignored words", { error });
      }
    }
  }, []);

  useEffect(() => {
    const hasIgnoredProducts =
      ignoredIds.products.length > 0 || ignoredIds.unverifiedProducts.length > 0;

    if (!hasIgnoredProducts) {
      localStorage.removeItem(IGNORED_IDS_STORAGE_KEY);
      return;
    }

    localStorage.setItem(IGNORED_IDS_STORAGE_KEY, JSON.stringify(ignoredIds));
  }, [ignoredIds]);

  useEffect(() => {
    if (ignoredWords.length === 0) {
      localStorage.removeItem(IGNORED_WORDS_STORAGE_KEY);
      return;
    }

    localStorage.setItem(IGNORED_WORDS_STORAGE_KEY, JSON.stringify(ignoredWords));
  }, [ignoredWords]);

  async function mergeProduct() {
    const parentId = Number(parentProductId);
    const childId = Number(childProductId);

    if (!Number.isInteger(parentId) || parentId <= 0) {
      return;
    }

    if (!Number.isInteger(childId) || childId <= 0) {
      return;
    }

    setLoadingProcess(true);
    setMergeError(null);

    try {
      await adminMergeProductBySource(
        parentId,
        "products",
        childId,
        "unverified_products"
      );

      setSimilarProducts((prev) =>
        prev.filter(
          (pair) =>
            !(pair.productId === parentId && pair.unverifiedId === childId)
        )
      );
    } catch (error) {
      Sentry.logger.error("Unexpected error while merging product", { error });
      setMergeError(
        error instanceof Error ? error.message : "No se pudo procesar el merge."
      );
    } finally {
      setLoadingProcess(false);
    }
  }

  async function searchSimilarProducts() {
    if (!categoryId || !shopId) {
      return;
    }

    setLoadingSimilar(true);
    setHasSearched(true);
    setSimilarError(null);

    try {
      const response = await getSimilarUnverifiedToVerifiedProducts(
        Number(categoryId),
        Number(shopId),
        ignoredIds,
        ignoredWords
      );
      setSimilarProducts(response);
      setPendingSimilarCount(response.length > 0 ? response[0].totalSimilar : 0);
    } catch (error) {
      Sentry.logger.error("Unexpected error while searching similar products", {
        error,
      });
      setSimilarProducts([]);
      setPendingSimilarCount(0);
      setSimilarError(
        error instanceof Error
          ? error.message
          : "No se pudieron buscar productos similares."
      );
    } finally {
      setLoadingSimilar(false);
    }
  }

  function setMergeValuesFromPair(pair: SimilarUnverifiedToVerifiedPair) {
    setParentProductId(pair.productId.toString());
    setChildProductId(pair.unverifiedId.toString());
  }

  function removeItem(
    index: number,
    pair: SimilarUnverifiedToVerifiedPair,
    persist = false,
    ignoreProduct = false
  ) {
    if (persist) {
      setIgnoredIds((prev) => {
        if (ignoreProduct) {
          return {
            ...prev,
            products: prev.products.includes(pair.productId)
              ? prev.products
              : [...prev.products, pair.productId],
          };
        }

        return {
          ...prev,
          unverifiedProducts: prev.unverifiedProducts.includes(pair.unverifiedId)
            ? prev.unverifiedProducts
            : [...prev.unverifiedProducts, pair.unverifiedId],
        };
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

  function resetFilters() {
    setIgnoredIds(EMPTY_IGNORED_IDS);
    setIgnoredWords([]);
    setIgnoredWordInput("");
    setPendingSimilarCount(null);
    setSimilarProducts([]);
    setHasSearched(false);
    setSimilarError(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TypographyH3>Merge unverified products</TypographyH3>

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
          placeholder="ID Padre (products)"
        />
        <Input
          type="number"
          value={childProductId}
          onChange={(e) => setChildProductId(e.target.value)}
          placeholder="ID Hijo (unverified_products)"
        />
        <Button onClick={mergeProduct} disabled={loadingProcess}>
          {loadingProcess ? <Loader2 className="animate-spin" /> : null}
          Procesar
        </Button>
      </div>

      {mergeError ? <div className="text-sm text-destructive">{mergeError}</div> : null}

      <div className="flex flex-wrap gap-2">
        <Combobox
          value={categoryId}
          options={categories.map((category) => ({
            value: category.id.toString(),
            label: category.name,
          }))}
          emptyMessage="Categoría no encontrada"
          placeholder="Categoría"
          onValueChange={(option) => setCategoryId(option.value)}
        />
        <Combobox
          value={shopId}
          options={shops.map((shop) => ({
            value: shop.id.toString(),
            label: shop.name,
          }))}
          emptyMessage="Tienda no encontrada"
          placeholder="Tienda"
          onValueChange={(option) => setShopId(option.value)}
        />
        <Button
          onClick={searchSimilarProducts}
          disabled={!categoryId || !shopId || loadingSimilar}
        >
          {loadingSimilar ? <Loader2 className="animate-spin" /> : null}
          Buscar similares
        </Button>
        <Button variant="outline" onClick={resetFilters}>
          Reset
        </Button>
        {pendingSimilarCount !== null ? (
          <div className="self-center text-sm text-muted-foreground">
            Productos pendientes por comparar:{" "}
            <span className="font-semibold">{pendingSimilarCount}</span>
          </div>
        ) : null}
      </div>

      {similarError ? (
        <div className="text-sm text-destructive">{similarError}</div>
      ) : null}

      {hasSearched && similarProducts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No hay pares para esta búsqueda</EmptyTitle>
            <EmptyDescription>
              Ajusta la categoría, la tienda o las palabras ignoradas para buscar
              nuevos resultados.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      ) : null}

      {similarProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3">
          {similarProducts.map((pair, index) => (
            <div
              key={`${pair.productId}-${pair.unverifiedId}`}
              className="contents"
            >
              <SimilarProductCard
                id={pair.productId}
                name={pair.productName}
                image={pair.productImage}
                unit={pair.productUnit}
                brandName={pair.productBrandName}
                deleted={pair.productDeleted}
                source="products"
              />
              <SimilarProductCard
                id={pair.unverifiedId}
                name={pair.unverifiedName}
                image={pair.unverifiedImage}
                unit={pair.unverifiedUnit}
                brandName={pair.unverifiedBrandName}
                deleted={pair.unverifiedDeleted}
                source="unverified_products"
                externalUrl={pair.unverifiedUrl}
              />
              <div className="flex flex-col gap-2 border border-[#eeeeee] p-4">
                <div className="text-sm text-muted-foreground">
                  Similitud: <span className="font-semibold">{pair.sml.toFixed(3)}</span>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setMergeValuesFromPair(pair)}
                >
                  Usar IDs en formulario
                </Button>
                <Button onClick={() => removeItem(index, pair, false, false)}>
                  Ignorar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => removeItem(index, pair, true, false)}
                >
                  Ignorar no verificado
                </Button>
                <Button
                  variant="outline"
                  onClick={() => removeItem(index, pair, true, true)}
                >
                  Ignorar producto
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
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
  externalUrl,
}: {
  id: number;
  name: string;
  image: string | null;
  unit: string;
  brandName: string;
  deleted: boolean | null;
  source: "products" | "unverified_products";
  externalUrl?: string | null;
}) {
  const content = (
    <>
      <div className="flex justify-between gap-2">
        <div>
          <div>{brandName}</div>
          <div className="font-semibold">{id}</div>
          {source === "products" ? (
            <Link
              href={`/productos/${toSlug(name)}/${id}`}
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              Ver producto
            </Link>
          ) : externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="block max-w-[220px] break-all text-xs text-muted-foreground underline underline-offset-2"
            >
              {externalUrl}
            </a>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={source === "products" ? "default" : "secondary"}>
            {source === "products" ? "Producto" : "No verificado"}
          </Badge>
          {deleted ? <span className="font-bold text-red-500">Eliminado</span> : null}
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
    <div className="border border-[#eeeeee] p-4">
      <div className="flex flex-col gap-2">{content}</div>
    </div>
  );
}

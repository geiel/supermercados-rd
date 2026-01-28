"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toSlug } from "@/lib/utils";
import type { BestValueProduct, HomePageCategory } from "./page";

type Props = {
  products: BestValueProduct[];
  categories: HomePageCategory[];
  replaceAction: (
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean; insertedCount?: number }>;
};

export function BestValueProductsClient({
  products,
  categories,
  replaceAction,
}: Props) {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    insertedCount?: number;
  } | null>(null);
  const [recalculateResult, setRecalculateResult] = useState<{
    success?: boolean;
    error?: string;
    updatedGroups?: number;
    groupsWithProducts?: number;
  } | null>(null);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setRecalculateResult(null);

    try {
      const response = await fetch("/api/admin/groups/calculate-stats", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to recalculate stats");
      }

      const data = await response.json();
      setRecalculateResult({
        success: true,
        updatedGroups: data.updatedGroups,
        groupsWithProducts: data.groupsWithProducts,
      });

      // Refresh the page to show updated products
      router.refresh();
    } catch {
      setRecalculateResult({
        success: false,
        error: "Error al recalcular estadísticas",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleReplace = () => {
    if (!selectedCategoryId) return;

    const formData = new FormData();
    formData.set("categoryId", selectedCategoryId);

    startTransition(async () => {
      const res = await replaceAction(formData);
      setResult(res);
    });
  };

  const selectedCategory = categories.find(
    (c) => c.id === Number(selectedCategoryId)
  );

  return (
    <div className="space-y-6">
      {/* Recalculate Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4 bg-blue-50 border-blue-200">
        <div className="space-y-1">
          <p className="text-sm font-medium">Recalcular Estadísticas</p>
          <p className="text-xs text-muted-foreground">
            Ejecuta el algoritmo para calcular el mejor valor de cada grupo.
            Necesario si hay grupos sin productos asignados.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRecalculate}
          disabled={isRecalculating}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRecalculating ? "animate-spin" : ""}`}
          />
          {isRecalculating ? "Recalculando..." : "Recalcular"}
        </Button>
      </div>

      {/* Recalculate result message */}
      {recalculateResult && (
        <div
          className={`rounded-lg p-4 ${
            recalculateResult.success
              ? "bg-blue-50 text-blue-800 border border-blue-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {recalculateResult.success ? (
            <>
              Se actualizaron {recalculateResult.updatedGroups} grupos.{" "}
              {recalculateResult.groupsWithProducts} grupos tienen productos con
              mejor valor.
            </>
          ) : (
            <>Error: {recalculateResult.error}</>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4 bg-muted/30">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label className="text-sm font-medium">Categoría destino:</label>
          <Select
            value={selectedCategoryId}
            onValueChange={setSelectedCategoryId}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {products.length} productos
          </span>
          <Button
            onClick={handleReplace}
            disabled={!selectedCategoryId || isPending}
          >
            {isPending ? "Reemplazando..." : "Reemplazar Productos"}
          </Button>
        </div>
      </div>

      {/* Result message */}
      {result && (
        <div
          className={`rounded-lg p-4 ${
            result.success
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {result.success ? (
            <>
              Se insertaron {result.insertedCount} productos en la categoría{" "}
              <strong>{selectedCategory?.name}</strong>.
            </>
          ) : (
            <>Error: {result.error}</>
          )}
        </div>
      )}

      {/* Products grid */}
      {products.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay grupos con productos de mejor valor calculados. Ejecuta el
          cálculo de estadísticas de grupos primero.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard key={product.productId} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: BestValueProduct }) {
  const formattedPrice = product.currentPrice
    ? `RD$${Number(product.currentPrice).toFixed(2)}`
    : "Sin precio";

  return (
    <div className="rounded-lg border p-3 bg-card hover:shadow-md transition-shadow">
      <Link
        href={`/productos/${toSlug(product.productName)}/${product.productId}`}
        className="flex flex-col gap-2"
        prefetch={false}
      >
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
          {product.productImage ? (
            <ProductImage
              src={product.productImage}
              alt={product.productName}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
              Sin imagen
            </div>
          )}
        </div>

        {/* Group badge */}
        <Badge variant="secondary" className="w-fit text-xs">
          {product.groupName}
        </Badge>

        {/* Product info */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{product.brandName}</p>
          <p className="text-sm font-medium line-clamp-2">
            {product.productName}
          </p>
          <p className="text-xs text-muted-foreground">{product.productUnit}</p>
        </div>

        {/* Price */}
        <p className="text-sm font-semibold text-primary">{formattedPrice}</p>
      </Link>
    </div>
  );
}

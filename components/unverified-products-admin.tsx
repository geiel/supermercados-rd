"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  promoteAllUnverifiedProducts,
  promoteSelectedUnverifiedProducts,
  type PromoteUnverifiedProductsSummary,
} from "@/lib/scrappers/admin-functions";

export type UnverifiedProductRow = {
  id: number;
  name: string;
  image: string | null;
  unit: string;
  brandName: string;
  categoryName: string;
};

export function UnverifiedProductsAdmin({
  products,
}: {
  products: UnverifiedProductRow[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isPromotingSelected, setIsPromotingSelected] = useState(false);
  const [isPromotingAll, setIsPromotingAll] = useState(false);
  const [summary, setSummary] =
    useState<PromoteUnverifiedProductsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const availableIds = new Set(products.map((product) => product.id));
    setSelectedIds((current) =>
      current.filter((productId) => availableIds.has(productId))
    );
  }, [products]);

  const allSelected = useMemo(
    () => products.length > 0 && selectedIds.length === products.length,
    [products.length, selectedIds.length]
  );

  function toggleProduct(productId: number) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  function toggleSelectAll() {
    setSelectedIds((current) =>
      current.length === products.length ? [] : products.map((product) => product.id)
    );
  }

  async function handlePromoteSelected() {
    if (selectedIds.length === 0) {
      return;
    }

    setIsPromotingSelected(true);
    setError(null);

    try {
      const result = await promoteSelectedUnverifiedProducts(selectedIds);
      setSummary(result);
      setSelectedIds([]);
      router.refresh();
    } catch (err) {
      Sentry.logger.error("Unexpected error", { error: err });
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron enviar los productos seleccionados."
      );
    } finally {
      setIsPromotingSelected(false);
    }
  }

  async function handlePromoteAll() {
    setIsPromotingAll(true);
    setError(null);

    try {
      const result = await promoteAllUnverifiedProducts();
      setSummary(result);
      setSelectedIds([]);
      router.refresh();
    } catch (err) {
      Sentry.logger.error("Unexpected error", { error: err });
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron enviar todos los productos."
      );
    } finally {
      setIsPromotingAll(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handlePromoteSelected}
          disabled={selectedIds.length === 0 || isPromotingSelected || isPromotingAll}
        >
          {isPromotingSelected ? <Loader2 className="animate-spin" /> : null}
          Enviar seleccionados a products
        </Button>
        <Button
          variant="outline"
          onClick={handlePromoteAll}
          disabled={products.length === 0 || isPromotingSelected || isPromotingAll}
        >
          {isPromotingAll ? <Loader2 className="animate-spin" /> : null}
          Enviar todos a products
        </Button>
        <div className="text-sm text-muted-foreground">
          Seleccionados: <span className="font-semibold">{selectedIds.length}</span>
        </div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {summary ? (
        <div className="text-sm text-muted-foreground">
          Última ejecución: encontrados {summary.found}, enviados {summary.promoted},
          duplicados {summary.duplicates}, removidos de unverified {summary.removed}.
        </div>
      ) : null}

      <div className="rounded-md border">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Checkbox
            id="select-all-unverified"
            checked={allSelected}
            onCheckedChange={toggleSelectAll}
          />
          <label htmlFor="select-all-unverified" className="text-sm font-medium">
            Seleccionar todos
          </label>
        </div>

        <div className="divide-y">
          {products.map((product) => (
            <div key={product.id} className="flex items-start gap-3 p-4">
              <Checkbox
                id={`select-unverified-${product.id}`}
                checked={selectedIds.includes(product.id)}
                onCheckedChange={() => toggleProduct(product.id)}
              />

              <label
                htmlFor={`select-unverified-${product.id}`}
                className="flex w-full cursor-pointer gap-3"
              >
                <div className="relative h-16 w-16 overflow-hidden rounded-md bg-muted">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="64px"
                      unoptimized
                      className="object-contain"
                    />
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col gap-1">
                  <div className="text-xs text-muted-foreground">ID {product.id}</div>
                  <div className="font-semibold">{product.name}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">No verificado</Badge>
                    <Badge>{product.unit}</Badge>
                    <Badge variant="outline">{product.brandName}</Badge>
                    <Badge variant="outline">{product.categoryName}</Badge>
                  </div>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

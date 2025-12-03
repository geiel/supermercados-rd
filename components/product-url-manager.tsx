"use client";

import { shopsSelect } from "@/db/schema";
import {
  ProductShopUrlRow,
  UrlVisibilityFilter,
  fetchProductShopUrls,
  updateProductShopUrl,
} from "@/lib/admin/product-urls";
import { toSlug } from "@/lib/utils";
import { ProductImage } from "./product-image";
import { TypographyH3 } from "./typography-h3";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "./ui/card";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";
import { Spinner } from "./ui/spinner";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

const IGNORED_STORAGE_KEY = "productUrlManager:ignoredKeys";

type ProductUrlManagerProps = {
  shops: shopsSelect[];
  initialRows: ProductShopUrlRow[];
};

function buildDrafts(rows: ProductShopUrlRow[]) {
  return rows.reduce<Record<string, string>>((acc, row) => {
    acc[`${row.productId}-${row.shopId}`] = row.url;
    return acc;
  }, {});
}

export function ProductUrlManager({ shops, initialRows }: ProductUrlManagerProps) {
  const [rows, setRows] = useState<ProductShopUrlRow[]>(initialRows);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    buildDrafts(initialRows)
  );
  const [ignoredKeys, setIgnoredKeys] = useState<Set<string>>(new Set());
  const [visibility, setVisibility] = useState<UrlVisibilityFilter>("hidden");
  const [shopFilter, setShopFilter] = useState<string>("all");
  const [isFetching, setIsFetching] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const shopFilterNumber = useMemo(
    () => (shopFilter === "all" ? undefined : Number(shopFilter)),
    [shopFilter]
  );

  useEffect(() => {
    setDrafts(buildDrafts(rows));
  }, [rows]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(IGNORED_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      const parsedSet = Array.isArray(parsed)
        ? new Set(parsed.filter((item) => typeof item === "string"))
        : new Set<string>();

      setIgnoredKeys(parsedSet);
      setRows((current) =>
        current.filter(
          (item) => !parsedSet.has(`${item.productId}-${item.shopId}`)
        )
      );
    } catch (error) {
      console.error("Failed to load ignored product keys:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      IGNORED_STORAGE_KEY,
      JSON.stringify(Array.from(ignoredKeys))
    );
  }, [ignoredKeys]);

  const refreshRows = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await fetchProductShopUrls({
        visibility,
        shopId: shopFilterNumber,
      });
      setRows(
        data.filter(
          (row) => !ignoredKeys.has(`${row.productId}-${row.shopId}`)
        )
      );
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar los productos.");
    } finally {
      setIsFetching(false);
    }
  }, [ignoredKeys, shopFilterNumber, visibility]);

  useEffect(() => {
    refreshRows();
  }, [refreshRows]);

  async function handleUpdate(row: ProductShopUrlRow) {
    const rowKey = `${row.productId}-${row.shopId}`;
    const newUrl = (drafts[rowKey] ?? "").trim();

    if (!newUrl) {
      toast.error("La URL no puede estar vacía.");
      return;
    }

    setPendingId(rowKey);

    startTransition(async () => {
      try {
        const updated = await updateProductShopUrl({
          productId: row.productId,
          shopId: row.shopId,
          url: newUrl,
        });

        setRows((current) =>
          current.map((item) =>
            item.productId === row.productId && item.shopId === row.shopId
              ? {
                  ...item,
                  url: updated.url,
                  hidden: updated.hidden,
                }
              : item
          )
        );

        toast.success("URL actualizada");
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la URL."
        );
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <TypographyH3>Actualizar URLs de supermercados</TypographyH3>
        <p className="text-sm text-muted-foreground">
          Filtra los productos y ajusta la URL por supermercado cuando cambie.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={visibility}
              onValueChange={(value: UrlVisibilityFilter) => setVisibility(value)}
            >
              <SelectTrigger size="sm">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hidden">Ocultos</SelectItem>
                <SelectItem value="visible">Visibles</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={shopFilter}
              onValueChange={(value) => setShopFilter(value)}
            >
              <SelectTrigger size="sm">
                <SelectValue placeholder="Supermercado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los supermercados</SelectItem>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id.toString()}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              onClick={refreshRows}
              disabled={isFetching}
            >
              {isFetching ? (
                <Spinner />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Refrescar
            </Button>
          </div>
          <CardDescription>
            Se muestran hasta 50 resultados según los filtros seleccionados.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {isFetching && rows.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cargando productos...
            </div>
          ) : null}

          {!isFetching && rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No se encontraron productos con los filtros seleccionados.
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            {rows
              .filter((row) => !ignoredKeys.has(`${row.productId}-${row.shopId}`))
              .map((row) => {
              const rowKey = `${row.productId}-${row.shopId}`;
              const draftUrl = drafts[rowKey] ?? row.url;
              const isUpdating = pendingId === rowKey && isPending;

              return (
                <div
                  key={rowKey}
              className="grid gap-4 rounded-lg border border-border bg-card/50 p-4 shadow-sm md:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="relative h-20 w-20 overflow-hidden rounded-md bg-muted">
                      {row.productImage ? (
                        <ProductImage
                          src={row.productImage}
                          alt={row.productName}
                          fill
                          sizes="80px"
                          className="object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/product/${toSlug(row.productName)}/${row.productId}`}
                          className="font-semibold hover:underline"
                        >
                          {row.productName}
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            const key = `${row.productId}-${row.shopId}`;
                            navigator.clipboard
                              .writeText(row.productName)
                              .then(() => {
                                setCopiedKey(key);
                                setTimeout(() => setCopiedKey(null), 1500);
                              })
                              .catch(() => toast.error("No se pudo copiar el nombre"));
                          }}
                          title="Copiar nombre del producto"
                        >
                          {copiedKey === `${row.productId}-${row.shopId}` ? (
                            <Check className="size-4 text-emerald-600" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {row.productId} · Unidad: {row.productUnit}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline">{row.shopName}</Badge>
                        {row.hidden ? (
                          <Badge variant="destructive">Oculto</Badge>
                        ) : (
                          <Badge variant="secondary">Visible</Badge>
                        )}
                      </div>
                      <ScrollArea className="max-w-full">
                        <div className="text-sm text-muted-foreground underline decoration-dotted">
                          <Link href={row.url} target="_blank">
                            {row.url}
                          </Link>
                        </div>
                      </ScrollArea>
                    </div>
                  </div>

                    <div className="flex flex-col gap-2 md:border-l md:border-dashed md:pl-4">
                      <Input
                        value={draftUrl}
                        onChange={(e) =>
                          setDrafts((current) => ({
                          ...current,
                          [rowKey]: e.target.value,
                        }))
                      }
                      placeholder="Nueva URL del supermercado"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleUpdate(row)}
                        disabled={isUpdating || !draftUrl}
                      >
                        {isUpdating ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        Actualizar URL
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDrafts((current) => ({
                            ...current,
                            [rowKey]: row.url,
                          }))
                        }
                        disabled={isUpdating || draftUrl === row.url}
                      >
                        Revertir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIgnoredKeys((current) => {
                            const next = new Set(current);
                            next.add(rowKey);
                            return next;
                          });
                          setRows((current) =>
                            current.filter(
                              (item) =>
                                !(
                                  item.productId === row.productId &&
                                  item.shopId === row.shopId
                                )
                            )
                          );
                        }}
                      >
                        Ocultar de la lista
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import type { NacionalUpdateResult } from "@/lib/scrappers/update-nacional-products";
import { cn } from "@/lib/utils";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";

type UpdateResponse = {
  results: NacionalUpdateResult[];
  error?: string;
};

type ManualUpdateResponse = {
  appliedUrl?: string;
  error?: string;
};

type UpdateNacionalProductsClientProps = {
  runUpdateAction: (
    limit: number,
    ignoredProductIds: number[]
  ) => Promise<UpdateResponse>;
  applyManualAction: (input: {
    productId: number;
    shopId: number;
    url: string;
  }) => Promise<ManualUpdateResponse>;
};

const IGNORED_NOT_FOUND_KEY = "nacionalUpdater:ignoredNotFoundIds";

function ProductAvatar({
  image,
  name,
}: {
  image: string | null;
  name: string;
}) {
  if (!image) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
        Sin imagen
      </div>
    );
  }

  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-md bg-muted">
      <ProductImage
        src={image}
        alt={name}
        fill
        sizes="80px"
        className="object-contain"
      />
    </div>
  );
}

export function UpdateNacionalProductsClient({
  runUpdateAction,
  applyManualAction,
}: UpdateNacionalProductsClientProps) {
  const [limitValue, setLimitValue] = useState("1");
  const [results, setResults] = useState<NacionalUpdateResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingProductId, setPendingProductId] = useState<number | null>(null);
  const [isRunning, startRunning] = useTransition();
  const [isApplying, startApplying] = useTransition();
  const [ignoredNotFound, setIgnoredNotFound] = useState<Set<number>>(new Set());

  const matchesPending = isRunning || isApplying;

  const updated = useMemo(
    () =>
      results.filter(
        (
          item
        ): item is Extract<NacionalUpdateResult, { status: "updated" }> =>
          item.status === "updated"
      ),
    [results]
  );
  const needsManual = useMemo(
    () =>
      results.filter(
        (
          item
        ): item is Extract<NacionalUpdateResult, { status: "multiple" }> =>
          item.status === "multiple"
      ),
    [results]
  );
  const notFound = useMemo(
    () =>
      results.filter(
        (
          item
        ): item is Extract<NacionalUpdateResult, { status: "not_found" }> =>
          item.status === "not_found"
      ),
    [results]
  );
  const errored = useMemo(
    () =>
      results.filter(
        (
          item
        ): item is Extract<NacionalUpdateResult, { status: "error" }> =>
          item.status === "error"
      ),
    [results]
  );

  // Load ignored not-found list
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(IGNORED_NOT_FOUND_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      const set = new Set<number>(
        Array.isArray(parsed)
          ? parsed
              .map((val) => Number(val))
              .filter((val) => Number.isFinite(val) && val > 0)
          : []
      );
      setIgnoredNotFound(set);
    } catch {
      // ignore parse errors
    }
  }, []);

  // Persist ignored list
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      IGNORED_NOT_FOUND_KEY,
      JSON.stringify(Array.from(ignoredNotFound))
    );
  }, [ignoredNotFound]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedLimit = Number(limitValue);
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.round(parsedLimit)
        : 1;

    startRunning(async () => {
      setError(null);
      setStatusMessage(null);

      const response = await runUpdateAction(
        safeLimit,
        Array.from(ignoredNotFound)
      );

      const responseResults = response.results ?? [];

      const newlyNotFound = responseResults
        .filter((item) => item.status === "not_found")
        .map((item) => item.productId);

      if (newlyNotFound && newlyNotFound.length > 0) {
        setIgnoredNotFound((current) => {
          const next = new Set(current);
          newlyNotFound.forEach((id) => next.add(id));
          return next;
        });
      }

      if (response.error) {
        setError(response.error);
      } else if (responseResults.length === 0) {
        setStatusMessage("No se encontraron productos para procesar.");
      } else {
        setStatusMessage(
          `Procesados ${responseResults.length} producto(s).`
        );
      }

      setResults(responseResults);
      setLimitValue(String(safeLimit));
    });
  }

  function handleApplyUrl(
    result: Extract<NacionalUpdateResult, { status: "multiple" }>,
    selectedUrl: string
  ) {
    startApplying(async () => {
      setPendingProductId(result.productId);
      setError(null);
      const response = await applyManualAction({
        productId: result.productId,
        shopId: result.shopId,
        url: selectedUrl,
      });

      if (response.error) {
        setError(response.error);
        setPendingProductId(null);
        return;
      }

      setResults((current) =>
        current.map((item) =>
          item.productId === result.productId
            ? {
                ...item,
                status: "updated",
                matchedUrl: selectedUrl,
              }
            : item
        )
      );
      setPendingProductId(null);
      setStatusMessage("URL actualizada manualmente.");
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Actualizar URLs de Nacional</h1>
        <p className="text-sm text-muted-foreground">
          Busca coincidencias en Nacional (shopId=2) y aplica coincidencias únicas
          automáticamente. Si hay varias coincidencias, selecciónalas aquí mismo.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle>Ejecutar buscador</CardTitle>
            {matchesPending ? <Spinner /> : null}
          </div>
          <CardDescription>
            Se consulta la página de búsqueda de Nacional para los productos ocultos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex flex-col gap-2 sm:w-40">
              <label className="text-sm font-medium" htmlFor="limit">
                Límite de productos
              </label>
              <Input
                id="limit"
                name="limit"
                type="number"
                min={1}
                step={1}
                value={limitValue}
                onChange={(event) => setLimitValue(event.target.value)}
                disabled={matchesPending}
              />
            </div>

            <Button
              type="submit"
              className="sm:w-56"
              disabled={matchesPending}
            >
              {isRunning ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Ejecutar búsqueda
            </Button>
          </form>

          {error ? (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="size-4" />
              {error}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="mt-3 text-sm text-muted-foreground">
              {statusMessage}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {results.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>
              Se muestran los resultados del último proceso ejecutado.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <SummaryPill label="Actualizados" value={updated.length} />
            <SummaryPill
              label="Revisión manual"
              value={needsManual.length}
              tone="warning"
            />
            <SummaryPill label="Sin coincidencias" value={notFound.length} />
            <SummaryPill label="Errores" value={errored.length} tone="destructive" />
          </CardContent>
        </Card>
      ) : null}

      {needsManual.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Selecciona la URL correcta</CardTitle>
            <CardDescription>
              Escoge la coincidencia correcta para los productos con múltiples resultados.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {needsManual.map((item) => (
              <div
                key={`${item.productId}-${item.shopId}`}
                className="rounded-lg border border-border bg-card/40 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <ProductAvatar image={item.productImage} name={item.productName} />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold">
                        {item.productName}
                      </span>
                      <Badge variant="outline">ID: {item.productId}</Badge>
                      <Badge variant="secondary">{item.productUnit}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      URL actual:{" "}
                      <Link
                        href={item.previousUrl}
                        target="_blank"
                        className="underline decoration-dotted underline-offset-4"
                      >
                        {item.previousUrl}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium">Coincidencias encontradas</p>
                  <div className="space-y-2">
                    {item.matches?.map((matchUrl) => (
                      <div
                        key={matchUrl}
                        className="flex flex-col gap-2 rounded-md border border-border/80 bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <ExternalLink className="size-4 text-muted-foreground" />
                          <Link
                            href={matchUrl}
                            target="_blank"
                            className="truncate underline decoration-dotted underline-offset-4"
                          >
                            {matchUrl}
                          </Link>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleApplyUrl(item, matchUrl)}
                          disabled={matchesPending}
                        >
                          {pendingProductId === item.productId && isApplying ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : null}
                          Usar esta URL
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {updated.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Actualizados automáticamente</CardTitle>
            <CardDescription>
          Coincidencias únicas aplicadas sin intervención manual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {updated.map((item) => (
              <div
                key={`${item.productId}-${item.shopId}`}
                className="flex flex-col gap-2 rounded-md border border-border bg-card/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.productName}</span>
                    <Badge variant="outline">ID: {item.productId}</Badge>
                  </div>
                  <ScrollArea className="max-w-full">
                    <Link
                      href={item.matchedUrl}
                      target="_blank"
                      className="text-sm text-muted-foreground underline decoration-dotted underline-offset-4"
                    >
                      {item.matchedUrl}
                    </Link>
                  </ScrollArea>
                </div>
                <Badge variant="secondary">Actualizado</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {notFound.length > 0 || errored.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin coincidencias</CardTitle>
            <CardDescription>
              No se encontró coincidencia o hubo errores al procesar. Los productos sin coincidencia se ignorarán en ejecuciones futuras en este navegador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...notFound, ...errored].map((item) => (
              <div
                key={`${item.productId}-${item.shopId}`}
                className={cn(
                  "flex flex-col gap-1 rounded-md border border-border/70 bg-card/40 p-3",
                  item.status === "error" ? "border-destructive/50" : undefined
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.productName}</span>
                  <Badge variant="outline">ID: {item.productId}</Badge>
                  <Badge variant="secondary">{item.productUnit}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.status === "error"
                    ? `Error: ${item.error}`
                    : "No se encontraron coincidencias."}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "destructive";
}) {
  const toneClasses =
    tone === "warning"
      ? "border-amber-400/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
      : tone === "destructive"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "border-border bg-card";

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border p-3 text-sm shadow-sm",
        toneClasses
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>
    </div>
  );
}

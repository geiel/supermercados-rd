"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { productsBrandsSelect } from "@/db/schema";
import {
  autoAssignPossibleBrands,
  fetchBrandAssignmentCandidates,
  setPossibleBrandAssignment,
  type AutoAssignSummary,
  type BrandAssignmentCandidate,
} from "@/lib/admin/possible-brands";
import { TypographyH3 } from "@/components/typography-h3";
import { Combobox } from "@/components/combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product-image";

type PossibleBrandsClientProps = {
  brands: productsBrandsSelect[];
  initialCandidates: BrandAssignmentCandidate[];
};

export function PossibleBrandsClient({
  brands,
  initialCandidates,
}: PossibleBrandsClientProps) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [hasLoadedCandidates, setHasLoadedCandidates] = useState(
    initialCandidates.length > 0
  );
  const [selectedBrands, setSelectedBrands] = useState<Record<number, string>>(
    {}
  );
  const [autoSummary, setAutoSummary] = useState<AutoAssignSummary | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [pendingProductId, setPendingProductId] = useState<number | null>(null);
  const [isAutoAssigning, startAutoAssign] = useTransition();
  const [isAssigning, startAssigning] = useTransition();

  const brandOptions = useMemo(
    () =>
      brands.map((brand) => ({
        value: brand.id.toString(),
        label: brand.name,
      })),
    [brands]
  );

  function handleAutoAssign() {
    startAutoAssign(async () => {
      setError(null);
      try {
        const summary = await autoAssignPossibleBrands();
        const remaining = await fetchBrandAssignmentCandidates();
        setAutoSummary(summary);
        setCandidates(remaining);
        setHasLoadedCandidates(true);
        setSelectedBrands({});
      } catch (assignError) {
        console.error(assignError);
        setError(
          assignError instanceof Error
            ? assignError.message
            : "Auto assignment failed."
        );
      }
    });
  }

  function handleManualAssign(productId: number) {
    const selected = selectedBrands[productId];
    if (!selected) {
      return;
    }

    startAssigning(async () => {
      setError(null);
      setPendingProductId(productId);

      try {
        await setPossibleBrandAssignment(productId, Number(selected));
        setCandidates((current) =>
          current.filter((product) => product.id !== productId)
        );
        setSelectedBrands((current) => {
          const next = { ...current };
          delete next[productId];
          return next;
        });
      } catch (assignError) {
        console.error(assignError);
        setError(
          assignError instanceof Error
            ? assignError.message
            : "Manual assignment failed."
        );
      } finally {
        setPendingProductId(null);
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TypographyH3>Assign possible brands</TypographyH3>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleAutoAssign} disabled={isAutoAssigning || isAssigning}>
          {isAutoAssigning ? <Loader2 className="animate-spin" /> : null}
          Auto assign by name
        </Button>
        <div className="text-sm text-muted-foreground">
          Pending products:{" "}
          <span className="font-semibold">{candidates.length}</span>
        </div>
        {autoSummary ? (
          <div className="text-sm text-muted-foreground">
            Last run: assigned {autoSummary.assignedCount} of{" "}
            {autoSummary.candidateCount}. Unmatched {autoSummary.unmatchedCount}
            {autoSummary.multipleMatchCount > 0
              ? `, multiple matches ${autoSummary.multipleMatchCount}`
              : ""}
            .
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : null}

      {candidates.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          {hasLoadedCandidates
            ? "No products pending manual assignment."
            : "Run auto assign to load products for manual assignment."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((product) => (
            <div
              key={product.id}
              className="flex flex-col gap-3 rounded-md border border-border/80 bg-card/60 p-4"
            >
              <div className="flex gap-3">
                <div className="relative h-20 w-20 overflow-hidden rounded-md bg-muted">
                  {product.image ? (
                    <ProductImage
                      src={product.image}
                      productId={product.id}
                      alt={product.name}
                      fill
                      sizes="80px"
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="text-xs text-muted-foreground">
                    ID {product.id}
                  </div>
                  <div className="font-semibold">{product.name}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{product.unit}</Badge>
                    <Badge variant="secondary">{product.brandName}</Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Combobox
                  options={brandOptions}
                  placeholder="Brand"
                  emptyMessage="Brand not found"
                  onValueChange={(option) =>
                    setSelectedBrands((current) => ({
                      ...current,
                      [product.id]: option.value,
                    }))
                  }
                />
                <Button
                  onClick={() => handleManualAssign(product.id)}
                  disabled={
                    !selectedBrands[product.id] || isAssigning
                  }
                >
                  {isAssigning && pendingProductId === product.id ? (
                    <Loader2 className="animate-spin" />
                  ) : null}
                  Assign
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

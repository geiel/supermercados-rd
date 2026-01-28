"use client";

import { useCallback, useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer } from "recharts";
import { ChevronDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export type PriceStatsBucket = {
  rangeStart: number;
  rangeEnd: number;
  count: number;
};

export type PriceStatsQuickFilter = {
  label: string;
  minPrice: number | null;
  maxPrice: number | null;
  count: number;
};

export type PriceStatsScale = "linear" | "log";

export type PriceStatsData = {
  min: number;
  max: number;
  buckets: PriceStatsBucket[];
  quickFilters: PriceStatsQuickFilter[];
  scale?: PriceStatsScale;
};

type PriceFilterSectionProps = {
  title?: string;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: number;
  priceStats?: PriceStatsData | null;
  isLoading?: boolean;
  isPending?: boolean;
  currentMinPrice: string | null;
  currentMaxPrice: string | null;
  onRangeChange: (min: number | null, max: number | null) => void;
  allowZeroMin?: boolean;
};

export function PriceFilterSection({
  title = "Precio",
  isExpanded,
  onToggle,
  badge,
  priceStats,
  isLoading = false,
  isPending = false,
  currentMinPrice,
  currentMaxPrice,
  onRangeChange,
  allowZeroMin = true,
}: PriceFilterSectionProps) {
  const currentMinValue = currentMinPrice || "";
  const currentMaxValue = currentMaxPrice || "";
  const currentPriceKey = `${currentMinValue}|${currentMaxValue}`;

  const [localMin, setLocalMin] = useState(currentMinValue);
  const [localMax, setLocalMax] = useState(currentMaxValue);
  const [isEditingMin, setIsEditingMin] = useState(false);
  const [isEditingMax, setIsEditingMax] = useState(false);
  const [sliderDraft, setSliderDraft] = useState<{
    key: string;
    values: [number, number];
  } | null>(null);

  const effectiveSliderValues =
    sliderDraft && sliderDraft.key === currentPriceKey ? sliderDraft.values : null;
  const hasDraftValues =
    effectiveSliderValues !== null || isEditingMin || isEditingMax;
  const displayMin = hasDraftValues ? localMin : currentMinValue;
  const displayMax = hasDraftValues ? localMax : currentMaxValue;

  const syncLocalFromDisplay = useCallback(() => {
    if (effectiveSliderValues) {
      setLocalMin(String(effectiveSliderValues[0]));
      setLocalMax(String(effectiveSliderValues[1]));
      return;
    }
    setLocalMin(currentMinValue);
    setLocalMax(currentMaxValue);
  }, [currentMaxValue, currentMinValue, effectiveSliderValues]);

  const sliderScale = priceStats?.scale ?? "linear";

  const normalizeSliderValues = useCallback(
    (values: [number, number]) => {
      if (!priceStats) return values;
      const [rawMin, rawMax] = values;
      const safeMin = Number.isFinite(rawMin)
        ? Math.max(priceStats.min, rawMin)
        : priceStats.min;
      const safeMax = Number.isFinite(rawMax)
        ? Math.min(priceStats.max, rawMax)
        : priceStats.max;
      if (safeMin <= safeMax) return [safeMin, safeMax];
      return [safeMax, safeMax];
    },
    [priceStats]
  );

  const toScaledValue = useCallback(
    (value: number) => {
      if (sliderScale !== "log" || !priceStats) return value;
      const safeValue = Math.max(value, priceStats.min);
      return Math.log(safeValue);
    },
    [priceStats, sliderScale]
  );

  const fromScaledValue = useCallback(
    (value: number) => {
      if (sliderScale !== "log" || !priceStats) return Math.round(value);
      const actual = Math.round(Math.exp(value));
      if (actual < priceStats.min) return priceStats.min;
      if (actual > priceStats.max) return priceStats.max;
      return actual;
    },
    [priceStats, sliderScale]
  );

  const sliderBounds = useMemo(() => {
    if (!priceStats) return { min: 0, max: 100, step: 1 };
    if (sliderScale !== "log") {
      return { min: priceStats.min, max: priceStats.max, step: 1 };
    }
    const logMin = Math.log(priceStats.min);
    const logMax = Math.log(priceStats.max);
    const logRange = logMax - logMin;
    const step =
      Number.isFinite(logRange) && logRange > 0 ? logRange / 120 : 0.01;
    return { min: logMin, max: logMax, step };
  }, [priceStats, sliderScale]);

  const actualSliderValues = useMemo(() => {
    if (!priceStats) return [0, 100];
    if (effectiveSliderValues) {
      return normalizeSliderValues(effectiveSliderValues);
    }
    const min = currentMinPrice ? Number(currentMinPrice) : priceStats.min;
    const max = currentMaxPrice ? Number(currentMaxPrice) : priceStats.max;
    return normalizeSliderValues([min, max]);
  }, [
    currentMaxPrice,
    currentMinPrice,
    effectiveSliderValues,
    normalizeSliderValues,
    priceStats,
  ]);

  const sliderValue = useMemo(() => {
    if (!priceStats) return [0, 100];
    return [
      toScaledValue(actualSliderValues[0]),
      toScaledValue(actualSliderValues[1]),
    ];
  }, [actualSliderValues, priceStats, toScaledValue]);

  const handleSliderChange = useCallback(
    (values: number[]) => {
      if (values.length === 2 && priceStats) {
        const [rawMin, rawMax] = values;
        const convertedMin =
          sliderScale === "log" ? fromScaledValue(rawMin) : Math.round(rawMin);
        const convertedMax =
          sliderScale === "log" ? fromScaledValue(rawMax) : Math.round(rawMax);
        const [min, max] = normalizeSliderValues([convertedMin, convertedMax]);
        setSliderDraft({ key: currentPriceKey, values: [min, max] });
        setLocalMin(String(min));
        setLocalMax(String(max));
      }
    },
    [
      currentPriceKey,
      fromScaledValue,
      normalizeSliderValues,
      priceStats,
      sliderScale,
    ]
  );

  const handleSliderCommit = useCallback(
    (values: number[]) => {
      if (values.length === 2 && priceStats) {
        const [rawMin, rawMax] = values;
        const convertedMin =
          sliderScale === "log" ? fromScaledValue(rawMin) : Math.round(rawMin);
        const convertedMax =
          sliderScale === "log" ? fromScaledValue(rawMax) : Math.round(rawMax);
        const [min, max] = normalizeSliderValues([convertedMin, convertedMax]);
        const actualMin = min === priceStats.min ? null : min;
        const actualMax = max === priceStats.max ? null : max;
        onRangeChange(actualMin, actualMax);
      }
    },
    [
      fromScaledValue,
      normalizeSliderValues,
      onRangeChange,
      priceStats,
      sliderScale,
    ]
  );

  const commitInputs = useCallback(() => {
    const min = localMin ? Number(localMin) : null;
    const max = localMax ? Number(localMax) : null;
    const minIsValid =
      typeof min === "number" &&
      Number.isFinite(min) &&
      (allowZeroMin ? min >= 0 : min > 0);
    const maxIsValid = typeof max === "number" && Number.isFinite(max) && max > 0;
    const normalizedMin = minIsValid ? min : null;
    const normalizedMax = maxIsValid ? max : null;

    if (priceStats) {
      setSliderDraft({
        key: currentPriceKey,
        values: [
          normalizedMin ?? priceStats.min,
          normalizedMax ?? priceStats.max,
        ],
      });
    }

    onRangeChange(normalizedMin, normalizedMax);
  }, [allowZeroMin, currentPriceKey, localMax, localMin, onRangeChange, priceStats]);

  const handleMinBlur = useCallback(() => {
    setIsEditingMin(false);
    commitInputs();
  }, [commitInputs]);

  const handleMaxBlur = useCallback(() => {
    setIsEditingMax(false);
    commitInputs();
  }, [commitInputs]);

  const handleQuickFilter = useCallback(
    (minPrice: number | null, maxPrice: number | null) => {
      onRangeChange(minPrice, maxPrice);
    },
    [onRangeChange]
  );

  const activeQuickFilter = useMemo(() => {
    if (!priceStats) return null;
    const min = currentMinPrice ? Number(currentMinPrice) : null;
    const max = currentMaxPrice ? Number(currentMaxPrice) : null;

    for (const qf of priceStats.quickFilters) {
      if (qf.minPrice === min && qf.maxPrice === max) {
        return qf.label;
      }
    }
    return null;
  }, [currentMinPrice, currentMaxPrice, priceStats]);

  const hasPriceFilter = currentMinPrice || currentMaxPrice;
  const badgeValue = badge ?? (hasPriceFilter ? 1 : 0);

  return (
    <div className="border-b pb-4">
      <button
        className="flex items-center justify-between w-full py-2"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          {badgeValue > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              {badgeValue}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isExpanded ? "rotate-180" : ""
          )}
        />
      </button>
      {isExpanded && (
        <div className="pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner />
            </div>
          ) : priceStats && priceStats.buckets.length > 0 ? (
            <div className="space-y-4">
              <div>
                <PriceHistogram
                  buckets={priceStats.buckets}
                  minValue={actualSliderValues[0]}
                  maxValue={actualSliderValues[1]}
                />
                <Slider
                  value={sliderValue}
                  min={sliderBounds.min}
                  max={sliderBounds.max}
                  step={sliderBounds.step}
                  onValueChange={handleSliderChange}
                  onValueCommit={handleSliderCommit}
                  disabled={isPending}
                />
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={String(priceStats.min)}
                  value={displayMin}
                  onFocus={() => {
                    syncLocalFromDisplay();
                    setIsEditingMin(true);
                  }}
                  onChange={(e) => {
                    setLocalMin(e.target.value);
                    setIsEditingMin(true);
                  }}
                  onBlur={handleMinBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleMinBlur();
                    }
                  }}
                  className="h-9"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder={String(priceStats.max)}
                  value={displayMax}
                  onFocus={() => {
                    syncLocalFromDisplay();
                    setIsEditingMax(true);
                  }}
                  onChange={(e) => {
                    setLocalMax(e.target.value);
                    setIsEditingMax(true);
                  }}
                  onBlur={handleMaxBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleMaxBlur();
                    }
                  }}
                  className="h-9"
                />
              </div>

              <RadioGroup value={activeQuickFilter || ""} className="space-y-2">
                {priceStats.quickFilters.map((qf) => {
                  const isActive = activeQuickFilter === qf.label;
                  return (
                    <div
                      key={qf.label}
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => {
                        if (isActive) {
                          onRangeChange(null, null);
                        } else {
                          handleQuickFilter(qf.minPrice, qf.maxPrice);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem
                          value={qf.label}
                          disabled={isPending}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm">{qf.label}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {qf.count}
                      </span>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          ) : (
            <Empty className="border-0 p-4">
              <EmptyHeader className="gap-1">
                <EmptyDescription>
                  No hay datos de precios disponibles
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      )}
    </div>
  );
}

function PriceHistogram({
  buckets,
  minValue,
  maxValue,
}: {
  buckets: PriceStatsBucket[];
  minValue: number;
  maxValue: number;
}) {
  return (
    <div className="h-16">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {buckets.map((bucket, index) => {
              const isInRange =
                bucket.rangeStart >= minValue && bucket.rangeEnd <= maxValue;
              return (
                <Cell
                  key={index}
                  fill={isInRange ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                  fillOpacity={isInRange ? 0.75 : 0.55}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

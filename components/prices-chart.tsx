"use client";

import * as React from "react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  productsPricesHistorySelect,
  productsShopsPrices,
  productsVisibilityHistorySelect,
  shopsSelect,
} from "@/db/schema";
import { ChevronDown } from "lucide-react";
import { isToday } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";

const CHEAPEST_COLOR = "#4A2169";
const SHOP_COLORS = [
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const seriesKey = (shopId: number) => `shop-${shopId}`;

type PricePoint = {
  date: Date;
  price: number;
};

type VisibilityPoint = {
  date: Date;
  visibility: productsVisibilityHistorySelect["visibility"];
};

type ChartDatum = {
  date: string;
  [key: string]: number | string | null | undefined;
};

type HistoryRange = "1" | "3" | "all";

export function PricesChart({
  priceHistory,
  currentPrices,
  shops,
  visibilityHistory,
}: {
  priceHistory: Array<productsPricesHistorySelect>;
  currentPrices: Array<productsShopsPrices>;
  shops: Array<shopsSelect>;
  visibilityHistory: Array<productsVisibilityHistorySelect>;
}) {
  const shopNameById = React.useMemo(() => {
    const map = new Map<number, string>();
    shops.forEach((shop) => {
      map.set(shop.id, shop.name);
    });
    return map;
  }, [shops]);

  const shopHistories = React.useMemo(() => {
    const histories = new Map<number, PricePoint[]>();

    for (const entry of priceHistory) {
      const price = Number(entry.price);
      if (!Number.isFinite(price)) {
        continue;
      }

      const list = histories.get(entry.shopId) ?? [];
      list.push({
        date: new Date(entry.createdAt),
        price,
      });
      histories.set(entry.shopId, list);
    }

    for (const current of currentPrices) {
      if (current.currentPrice == null) {
        continue;
      }

      const price = Number(current.currentPrice);
      if (!Number.isFinite(price)) {
        continue;
      }

      const list = histories.get(current.shopId) ?? [];
      list.push({
        date: current.updateAt ? new Date(current.updateAt) : new Date(),
        price,
      });
      histories.set(current.shopId, list);
    }

    for (const [shopId, list] of histories) {
      list.sort((a, b) => a.date.getTime() - b.date.getTime());

      const deduped: PricePoint[] = [];
      for (const item of list) {
        const last = deduped[deduped.length - 1];
        if (!last || last.date.getTime() !== item.date.getTime()) {
          deduped.push(item);
        } else {
          deduped[deduped.length - 1] = item;
        }
      }

      histories.set(shopId, deduped);
    }

    return histories;
  }, [priceHistory, currentPrices]);

  const visibilityHistoryByShop = React.useMemo(() => {
    const histories = new Map<number, VisibilityPoint[]>();

    for (const entry of visibilityHistory) {
      const list = histories.get(entry.shopId) ?? [];
      list.push({
        date: new Date(entry.createdAt),
        visibility: entry.visibility,
      });
      histories.set(entry.shopId, list);
    }

    for (const [shopId, list] of histories) {
      list.sort((a, b) => a.date.getTime() - b.date.getTime());

      const deduped: VisibilityPoint[] = [];
      for (const item of list) {
        const last = deduped[deduped.length - 1];
        if (!last || last.date.getTime() !== item.date.getTime()) {
          deduped.push(item);
        } else {
          deduped[deduped.length - 1] = item;
        }
      }

      histories.set(shopId, deduped);
    }

    return histories;
  }, [visibilityHistory]);

  type TooltipFormatter = NonNullable<
    React.ComponentProps<typeof ChartTooltipContent>["formatter"]
  >;

  const tooltipFormatter = React.useCallback<TooltipFormatter>(
    (value, name, item) => {
      const dataKey = String(item.dataKey ?? name);
      const indicatorColor =
        typeof item.color === "string"
          ? item.color
          : "var(--muted-foreground)";
      const payload = item.payload as ChartDatum | undefined;

      let label = name;
      if (dataKey === "cheapestPrice") {
        const shop = payload?.cheapestShop as string | undefined;
        label = shop ? `${shop}` : "Precio mas barato";
      } else if (dataKey.startsWith("shop-")) {
        const id = Number(dataKey.replace("shop-", ""));
        label = shopNameById.get(id) ?? name;
      }

      return (
        <>
          <div
            className="h-2.5 w-2.5 shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)"
            style={
              {
                "--color-bg": indicatorColor,
                "--color-border": indicatorColor,
              } as React.CSSProperties
            }
          />
          <div className="flex flex-1 space-x-2 justify-between leading-none">
            <div className="grid gap-1.5">
              <span className="text-muted-foreground">{label}</span>
            </div>
            {value !== undefined && value !== null ? (
              <span className="text-foreground font-mono font-medium tabular-nums">
                {Array.isArray(value)
                  ? value.join(", ")
                  : typeof value === "number"
                    ? value.toLocaleString()
                    : value}
              </span>
            ) : null}
          </div>
        </>
      );
    },
    [shopNameById]
  );

  const [selectedShopIds, setSelectedShopIds] = React.useState<number[]>([]);
  const [historyRange, setHistoryRange] = React.useState<HistoryRange>("3");
  const [isShopMenuOpen, setIsShopMenuOpen] = React.useState(false);
  const lastPointerTypeRef = React.useRef<React.PointerEvent["pointerType"] | null>(
    null
  );

  const selectedShops = React.useMemo(
    () =>
      shops.filter(
        (shop) =>
          selectedShopIds.includes(shop.id) &&
          (shopHistories.get(shop.id)?.length ?? 0) > 0
      ),
    [shops, selectedShopIds, shopHistories]
  );

  const colorByShopId = React.useMemo(() => {
    const map = new Map<number, string>();
    shops.forEach((shop, index) => {
      map.set(shop.id, SHOP_COLORS[index % SHOP_COLORS.length]);
    });
    return map;
  }, [shops]);

  const chartConfig = React.useMemo<ChartConfig>(() => {
    return selectedShops.reduce<ChartConfig>(
      (config, shop) => {
        const color = colorByShopId.get(shop.id) ?? SHOP_COLORS[0];
        config[seriesKey(shop.id)] = {
          label: shop.name,
          color,
        };
        return config;
      },
      {
        cheapestPrice: {
          label: "Precio mas barato",
          color: CHEAPEST_COLOR,
        },
      }
    );
  }, [selectedShops, colorByShopId]);

  const chartData = React.useMemo(() => {
    const shopIds = Array.from(shopHistories.keys());
    if (shopIds.length === 0 && selectedShops.length === 0) {
      return [];
    }

    const timeline = new Set<number>();
    for (const history of shopHistories.values()) {
      history.forEach((entry) => timeline.add(entry.date.getTime()));
    }

    const shopIdSet = new Set(shopIds);
    for (const [shopId, history] of visibilityHistoryByShop) {
      if (!shopIdSet.has(shopId)) {
        continue;
      }
      history.forEach((entry) => timeline.add(entry.date.getTime()));
    }

    if (timeline.size === 0) {
      return [];
    }

    let latestTime: number | null = null;
    for (const time of timeline) {
      if (latestTime === null || time > latestTime) {
        latestTime = time;
      }
    }

    if (latestTime !== null && !isToday(new Date(latestTime))) {
      timeline.add(new Date().getTime());
    }

    const sortedTimeline = Array.from(timeline).sort((a, b) => a - b);
    const histories = shopIds.map((shopId) => shopHistories.get(shopId) ?? []);
    const visibilityHistories = shopIds.map(
      (shopId) => visibilityHistoryByShop.get(shopId) ?? []
    );
    const priceIndices = histories.map(() => 0);
    const visibilityIndices = visibilityHistories.map(() => 0);
    const lastPrices: Array<number | null> = histories.map(() => null);
    const visibilityStates = visibilityHistories.map(() => true);
    const shopIndexById = new Map<number, number>();

    shopIds.forEach((shopId, index) => {
      shopIndexById.set(shopId, index);
    });

    // Share a timeline, respect visibility changes, and carry last known prices.
    const data: ChartDatum[] = [];

    for (const time of sortedTimeline) {
      const row: ChartDatum = { date: new Date(time).toISOString() };
      const hideAfterRow = new Array(shopIds.length).fill(false);

      for (let index = 0; index < shopIds.length; index += 1) {
        const history = histories[index];
        while (
          priceIndices[index] < history.length &&
          history[priceIndices[index]].date.getTime() <= time
        ) {
          lastPrices[index] = history[priceIndices[index]].price;
          priceIndices[index] += 1;
        }

        const visibility = visibilityHistories[index];
        while (
          visibilityIndices[index] < visibility.length &&
          visibility[visibilityIndices[index]].date.getTime() < time
        ) {
          visibilityStates[index] =
            visibility[visibilityIndices[index]].visibility === "visible";
          visibilityIndices[index] += 1;
        }
        if (
          visibilityIndices[index] < visibility.length &&
          visibility[visibilityIndices[index]].date.getTime() === time
        ) {
          if (visibility[visibilityIndices[index]].visibility === "visible") {
            visibilityStates[index] = true;
          } else {
            hideAfterRow[index] = true;
          }
          visibilityIndices[index] += 1;
        }
      }

      let cheapestPrice: number | null = null;
      let cheapestShopId: number | null = null;

      for (let index = 0; index < shopIds.length; index += 1) {
        const price = lastPrices[index];
        if (price === null || !visibilityStates[index]) {
          continue;
        }

        if (cheapestPrice === null || price < cheapestPrice) {
          cheapestPrice = price;
          cheapestShopId = shopIds[index];
        }
      }

      if (cheapestPrice !== null && cheapestShopId !== null) {
        row.cheapestPrice = cheapestPrice;
        row.cheapestShop =
          shopNameById.get(cheapestShopId) ??
          `Supermercado ${cheapestShopId}`;
      } else {
        row.cheapestPrice = null;
        row.cheapestShop = undefined;
      }

      for (const shop of selectedShops) {
        const index = shopIndexById.get(shop.id);
        if (index === undefined) {
          row[seriesKey(shop.id)] = null;
          continue;
        }

        row[seriesKey(shop.id)] =
          visibilityStates[index] && lastPrices[index] !== null
            ? lastPrices[index]
            : null;
      }

      data.push(row);

      for (let index = 0; index < hideAfterRow.length; index += 1) {
        if (hideAfterRow[index]) {
          visibilityStates[index] = false;
        }
      }
    }

    const comparisonKeys = [
      "cheapestPrice",
      "cheapestShop",
      ...selectedShops.map((shop) => seriesKey(shop.id)),
    ];

    const toDayKey = (value: string) => {
      const date = new Date(value);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const grouped: ChartDatum[] = [];
    for (const row of data) {
      const last = grouped[grouped.length - 1];
      if (
        last &&
        toDayKey(last.date) === toDayKey(row.date) &&
        comparisonKeys.every((key) => last[key] === row[key])
      ) {
        grouped[grouped.length - 1] = row;
        continue;
      }
      grouped.push(row);
    }

    return grouped;
  }, [
    shopHistories,
    visibilityHistoryByShop,
    selectedShops,
    shopNameById,
  ]);

  const filteredChartData = React.useMemo(() => {
    if (historyRange === "all") {
      return chartData;
    }

    if (chartData.length === 0) {
      return chartData;
    }

    const months = historyRange === "1" ? 1 : 3;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    cutoff.setHours(0, 0, 0, 0);

    const filtered = chartData.filter(
      (row) => new Date(row.date).getTime() >= cutoff.getTime()
    );

    if (filtered.length === 0) {
      return filtered;
    }

    const lastBefore = [...chartData]
      .reverse()
      .find((row) => new Date(row.date).getTime() < cutoff.getTime());

    if (!lastBefore) {
      return filtered;
    }

    if (new Date(filtered[0].date).getTime() !== cutoff.getTime()) {
      filtered.unshift({
        ...lastBefore,
        date: cutoff.toISOString(),
      });
    }

    return filtered;
  }, [chartData, historyRange]);

  const { minPrice, maxPrice } = React.useMemo(() => {
    if (filteredChartData.length === 0) {
      return { minPrice: 0, maxPrice: 0 };
    }

    let min = Infinity;
    let max = -Infinity;

    for (const row of filteredChartData) {
      const cheapestValue = row.cheapestPrice;
      if (typeof cheapestValue === "number") {
        min = Math.min(min, cheapestValue);
        max = Math.max(max, cheapestValue);
      }

      for (const shop of selectedShops) {
        const value = row[seriesKey(shop.id)];
        if (typeof value === "number") {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { minPrice: 0, maxPrice: 0 };
    }

    return { minPrice: min, maxPrice: max };
  }, [filteredChartData, selectedShops]);

  const handleCheckedChange = React.useCallback(
    (checked: boolean | "indeterminate", shopId: number) => {
      const shouldSelect = checked === true || checked === "indeterminate";

      setSelectedShopIds((prev) => {
        if (shouldSelect) {
          if (prev.includes(shopId)) {
            return prev;
          }
          return [...prev, shopId];
        }
        return prev.filter((id) => id !== shopId);
      });
    },
    []
  );

  if (priceHistory.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <DropdownMenu open={isShopMenuOpen} onOpenChange={setIsShopMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onPointerDown={(event) => {
                lastPointerTypeRef.current = event.pointerType;
                if (event.pointerType === "touch") {
                  event.preventDefault();
                }
              }}
              onClick={() => {
                if (lastPointerTypeRef.current === "touch") {
                  setIsShopMenuOpen((prev) => !prev);
                }
              }}
            >
              Supermercados
              {selectedShops.length > 0 ? (
                <Badge variant="secondary" className="ml-1">
                  {selectedShops.length}
                </Badge>
              ) : null}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            <DropdownMenuLabel>Supermercados</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {shops.map((shop) => {
              const hasData =
                (shopHistories.get(shop.id)?.length ?? 0) > 0;
              return (
                <DropdownMenuCheckboxItem
                  key={shop.id}
                  checked={selectedShopIds.includes(shop.id)}
                  onCheckedChange={(value) =>
                    handleCheckedChange(value, shop.id)
                  }
                  disabled={!hasData}
                >
                  {shop.name}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ChartContainer
        config={chartConfig}
        className="h-[260px] w-full aspect-auto sm:h-[300px] lg:h-[320px] xl:h-[340px]"
      >
        <ComposedChart
          accessibilityLayer
          data={filteredChartData}
          margin={{
            left: 12,
            right: 12,
            top: 10,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString("es-ES", {
                month: "short",
                day: "numeric",
              });
            }}
          />
          <YAxis
            type="number"
            domain={[lower5th(minPrice), maxPrice]}
            hide
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={tooltipFormatter}
                labelFormatter={(value) => {
                  return new Date(String(value)).toLocaleDateString(
                    "es-ES",
                    {
                      month: "short",
                      day: "numeric",
                    }
                  );
                }}
              />
            }
          />
          <Area
            dataKey="cheapestPrice"
            type="linear"
            fill="var(--color-cheapestPrice)"
            fillOpacity={0.4}
            stroke="var(--color-cheapestPrice)"
            strokeWidth={1}
            connectNulls={false}
          />
          {selectedShops.map((shop) => {
            const key = seriesKey(shop.id);
            return (
              <Line
                key={key}
                dataKey={key}
                type="linear"
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            );
          })}
          {selectedShops.length > 0 ? (
            <ChartLegend content={<ChartLegendContent />} />
          ) : null}
        </ComposedChart>
      </ChartContainer>
      <div className="flex justify-center">
        <RadioGroup
          value={historyRange}
          onValueChange={(value) => setHistoryRange(value as HistoryRange)}
        >
          <div className="flex gap-2">
            <Label
              htmlFor="r1"
              className="border-input has-[[data-state=checked]]:bg-black has-[[data-state=checked]]:text-white has-[[data-state=checked]]:border-black hover:bg-muted flex cursor-pointer items-center gap-2 rounded-full border py-2 px-4 transition-colors"
            >
              <RadioGroupItem value="1" id="r1" className="sr-only" />
              1 Mes
            </Label>
            <Label
              htmlFor="r3"
              className="border-input has-[[data-state=checked]]:bg-black has-[[data-state=checked]]:text-white has-[[data-state=checked]]:border-black hover:bg-muted flex cursor-pointer items-center gap-2 rounded-full border py-2 px-4 transition-colors"
            >
              <RadioGroupItem value="3" id="r3" className="sr-only" />
              3 Meses
            </Label>
            <Label
              htmlFor="rAll"
              className="border-input has-[[data-state=checked]]:bg-black has-[[data-state=checked]]:text-white has-[[data-state=checked]]:border-black hover:bg-muted flex cursor-pointer items-center gap-2 rounded-full border py-2 px-4 transition-colors"
            >
              <RadioGroupItem value="all" id="rAll" className="sr-only" />
              Todos
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}

function lower5th(n: number) {
  return Math.floor((n - 1) / 5) * 5;
}

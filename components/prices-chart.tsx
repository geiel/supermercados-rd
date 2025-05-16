"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { productsPricesHistorySelect } from "@/db/schema";
import { Activity } from "lucide-react";
import { Card, CardContent } from "./ui/card";

const chartConfig = {
  price: {
    label: "Precio",
    color: "hsl(var(--chart-1))",
    icon: Activity,
  },
} satisfies ChartConfig;

function getLowestPricesByDate(history: productsPricesHistorySelect[]) {
  const minByDate = history.reduce<Record<string, number>>(
    (acc, { price, createdAt }) => {
      const day = createdAt.toISOString().slice(0, 10);
      const val = parseFloat(price);
      if (isNaN(val)) return acc;
      if (acc[day] === undefined || val < acc[day]) {
        acc[day] = val;
      }
      return acc;
    },
    {}
  );

  if (history.length > 0) {
    const dates = Object.keys(minByDate).sort();
    const lastDate = dates[dates.length - 1];
    const today = new Date().toISOString().slice(0, 10);

    if (today !== lastDate) {
      minByDate[today] = minByDate[lastDate];
    }
  }

  return Object.entries(minByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, price]) => ({ date, price }));
}

export function PricesChart({
  priceHistory,
}: {
  priceHistory: productsPricesHistorySelect[];
}) {
  const data = getLowestPricesByDate(priceHistory);
  return (
    <Card>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={data}
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
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Area
              dataKey="price"
              type="step"
              fill="var(--color-price)"
              fillOpacity={0.4}
              stroke="var(--color-price)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

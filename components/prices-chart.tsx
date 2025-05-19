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
import { isToday } from "@/lib/utils";

const chartConfig = {
  price: {
    label: "Precio",
    color: "hsl(var(--chart-1))",
    icon: Activity,
  },
} satisfies ChartConfig;

export function PricesChart({
  priceHistory,
}: {
  priceHistory: productsPricesHistorySelect[];
}) {
  console.log(priceHistory);

  const organizedPrice = priceHistory
    .map((price) => {
      const shopPrices = priceHistory.filter((p) => p.shopId === price.shopId);

      if (shopPrices.length === 1) {
        return { ...price, stillActive: true };
      }

      const sortedByRecent = shopPrices.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      if (price.createdAt === sortedByRecent[0].createdAt) {
        return { ...price, stillActive: true };
      }

      return { ...price, stillActive: false };
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const prices: Array<productsPricesHistorySelect & { stillActive: boolean }> =
    [];

  organizedPrice.forEach((price) => {
    if (prices.length === 0) {
      prices.push(price);
      return;
    }

    const priceBefore = prices.filter((p) => p.createdAt < price.createdAt);
    if (priceBefore.some((p) => p.stillActive && p.price < price.price)) {
      return;
    }

    prices.push(price);
  });

  const data = prices.map((p) => ({
    date: p.createdAt,
    price: Number(p.price),
  }));

  if (!isToday(data[data.length - 1].date)) {
    data.push({
      date: new Date(),
      price: data[data.length - 1].price,
    });
  }

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

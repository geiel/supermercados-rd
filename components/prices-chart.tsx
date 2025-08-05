"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { productsPricesHistorySelect, productsShopsPrices } from "@/db/schema";
import { DollarSign } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { isToday } from "@/lib/utils";

const chartConfig = {
  price: {
    label: "Precio",
    color: "hsl(var(--chart-1))",
    icon: DollarSign,
  },
} satisfies ChartConfig;

export function PricesChart({
  priceHistory,
  currentPrices,
}: {
  priceHistory: Array<productsPricesHistorySelect>;
  currentPrices: Array<productsShopsPrices>;
}) {
  if (priceHistory.length === 0) {
    return null;
  }

  const organizedPrice = priceHistory
    .map((price) => {
      const shopPrices = priceHistory.filter((p) => p.shopId === price.shopId);
      const shopActive = currentPrices.some(
        (current) => current.shopId === price.shopId
      );

      if (shopPrices.length === 1 && shopActive) {
        return { ...price, stillActive: true };
      }

      const sortedByRecent = shopPrices.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      if (price.createdAt === sortedByRecent[0].createdAt && shopActive) {
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

    const lastPrice = prices[prices.length - 1];

    if (!lastPrice.stillActive) {
      if (price.stillActive) {
        prices.push(price);
        return;
      }

      if (lastPrice.shopId === price.shopId) {
        prices.push(price);
        return;
      }

      if (Number(price.price) < Number(lastPrice.price)) {
        prices.push(price);
        return;
      }

      return;
    }

    if (!price.stillActive) {
      return;
    }

    if (Number(price.price) < Number(lastPrice.price)) {
      prices.push(price);
    }
  });

  const data = prices.map((p) => ({
    date: p.createdAt,
    price: Number(p.price),
    shop: getShopNameById(p.shopId),
  }));

  if (!isToday(data[data.length - 1].date)) {
    data.push({
      date: new Date(),
      price: data[data.length - 1].price,
      shop: data[data.length - 1].shop,
    });
  }

  const formatedData = data.map((d) => ({
    date: d.date.toISOString(),
    price: d.price,
    shop: d.shop,
  }));

  const onlyPrices = formatedData.map((item) => item.price);
  const maxPrice = Math.max(...onlyPrices);
  const minPrice = Math.min(...onlyPrices);

  return (
    <Card>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={formatedData}
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
            <YAxis type="number" domain={[lower5th(minPrice), maxPrice]} hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value, payload) => {
                    const date = new Date(value).toLocaleDateString("es-ES", {
                      month: "short",
                      day: "numeric",
                    });
                    return `${date} | ${payload[0].payload.shop}`;
                  }}
                />
              }
            />
            <Area
              dataKey="price"
              type="linear"
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

function lower5th(n: number) {
  return Math.floor((n - 1) / 5) * 5;
}

function getShopNameById(id: number) {
  switch (id) {
    case 1:
      return "La Sirena";
    case 2:
      return "Nacional";
    case 3:
      return "Jumbo";
    case 4:
      return "Plaza Lama";
    case 5:
      return "Pricesmart";
    case 6:
      return "Bravo";
  }
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatPriceWithCurrency } from "@/lib/price-format";

type PriceProps = {
  value: number | string | null | undefined;
  className?: string;
  currencyPrefix?: string;
  fallback?: ReactNode;
};

export function Price({
  value,
  className,
  currencyPrefix = "RD$",
  fallback = null,
}: PriceProps) {
  const formatted = formatPriceWithCurrency(value, currencyPrefix);

  if (!formatted) {
    if (fallback === null) {
      return null;
    }

    return <span className={cn(className)}>{fallback}</span>;
  }

  return <span className={cn(className)}>{formatted}</span>;
}

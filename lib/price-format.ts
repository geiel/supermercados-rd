export const normalizePriceValue = (
  value: number | string | null | undefined
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const sanitized = value.trim().replace(/,/g, "");
  if (!sanitized) {
    return null;
  }

  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatPriceValue = (value: number): string =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const formatPriceWithCurrency = (
  value: number | string | null | undefined,
  currencyPrefix = "RD$"
): string | null => {
  const numericValue = normalizePriceValue(value);

  if (numericValue === null) {
    return null;
  }

  return `${currencyPrefix}${formatPriceValue(numericValue)}`;
};

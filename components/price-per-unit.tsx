import { cn } from "@/lib/utils";

function convertToGrams(quantity: number, unit: string): number {
  switch (unit.toUpperCase()) {
    case "GR":
      return quantity;
    case "OZ":
      return quantity * 28.35;
    case "LB":
      return quantity * 453.59237;
    case "KG":
      return quantity * 1000;
    case "GL":
      return quantity * 3785.411784;
    default:
      return 0;
  }
}

function convertToMilliliters(quantity: number, unit: string): number {
  switch (unit.toUpperCase()) {
    case "CC":
      return quantity;
    case "ML":
      return quantity;
    case "CL":
      return quantity * 10;
    case "LT":
      return quantity * 1000;
    case "GR":
      return quantity;
    case "OZ":
      return quantity * 28.35;
    case "LB":
      return quantity * 453.59237;
    case "KG":
      return quantity * 1000;
    case "GL":
      return quantity * 3785.411784;
    default:
      return 0;
  }
}

function convertToPounds(quantity: number, unit: string): number {
  switch (unit) {
    case "LB":
      return quantity;
    case "OZ":
      return quantity / 16;
    case "GR":
      return quantity / 453.59237;
    case "KG":
      return quantity * 2.20462;
    default:
      return 0;
  }
}

function getPricePer100Grams(price: number, quantity: number, unit: string) {
  const gramWeight = convertToGrams(quantity, unit);

  const pricePerGram = price / gramWeight;
  return +(pricePerGram * 100).toFixed(2);
}

function getPricePer100Milliliters(
  price: number,
  quantity: number,
  unit: string
): number {
  const milliliterVolume = convertToMilliliters(quantity, unit);

  const pricePerMilliliter = price / milliliterVolume;
  return +(pricePerMilliliter * 100).toFixed(2);
}

export function PricePerUnit({
  unit,
  price,
  categoryId,
  className,
  productName,
}: {
  unit: string;
  price: number;
  categoryId: number;
  className?: string;
  productName?: string;
}) {
  const amountAndUnit = unit.split(" ");

  if (amountAndUnit.length < 2) {
    const unit = amountAndUnit[0];
    amountAndUnit[0] = "1";
    amountAndUnit.push(unit);
  }

  if (isNaN(Number(amountAndUnit[0]))) {
    return null;
  }

  const amount = Number(amountAndUnit[0]);
  const unitOnly = amountAndUnit[1];
  const pricePerUndFromName = pricePerAmountInName({
    name: productName,
    price,
  });

  if (
    unitOnly !== "LB" &&
    unitOnly !== "OZ" &&
    unitOnly !== "GR" &&
    unitOnly !== "UND" &&
    unitOnly !== "KG" &&
    unitOnly !== "ML" &&
    unitOnly !== "CC" &&
    unitOnly !== "LT" &&
    unitOnly !== "CL" &&
    unitOnly !== "GL"
  ) {
    if (pricePerUndFromName) {
      return (
        <div className={cn("text-xs", className)}>
          ${pricePerUndFromName} por UND
        </div>
      );
    }

    return null;
  }

  if (unitOnly === "UND") {
    const resolvedPricePerUnd =
      pricePerUndFromName ?? (price / amount).toFixed(2);

    return (
      <div className={cn("text-xs", className)}>
        ${resolvedPricePerUnd} por UND
      </div>
    );
  }

  const perUndSuffix = pricePerUndFromName
    ? `$${pricePerUndFromName} por UND`
    : "";

  if (
    unitOnly === "ML" ||
    unitOnly === "CC" ||
    unitOnly === "LT" ||
    unitOnly === "CL" ||
    unitOnly === "GL"
  ) {
    return (
      <div className={cn("text-xs", className)}>
        ${getPricePer100Milliliters(price, amount, unitOnly)} por 100 ML
        <div>
          {perUndSuffix}
        </div>
      </div>
    );
  }

  //Comprarar por 100 GR
  if (categoryId === 4) {
    return (
      <div className={cn("text-xs", className)}>
        ${getPricePer100Grams(price, amount, unitOnly)} por 100 GR
        <div>
          {perUndSuffix}
        </div>
      </div>
    );
  }

  //Comparar por 100 GR
  if (categoryId === 6) {
    return (
      <div className={cn("text-xs", className)}>
        ${getPricePer100Grams(price, amount, unitOnly)} por 100 GR
        <div>
          {perUndSuffix}
        </div>
      </div>
    );
  }

  //Comprarar por LB
  const lb = convertToPounds(amount, unitOnly);
  return (
    <div className={cn("text-xs", className)}>
      ${(price / lb).toFixed(2)} por LB
      <div>
        {perUndSuffix}
      </div>
    </div>
  );
}

function pricePerAmountInName({
  name,
  price,
}: {
  name: string | undefined;
  price: number;
}) {
  if (!name) {
    return null;
  }

  const match = name.match(
    /\b(\d+(?:[.,]\d+)?)\s*(?:UND|UNIDAD(?:ES)?|PACKS?)\b/i
  );

  if (!match) {
    return null;
  }

  const parsed = Number(match[1].replace(",", "."));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return (price / parsed).toFixed(2);
}

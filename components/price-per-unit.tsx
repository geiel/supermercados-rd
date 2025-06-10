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
}: {
  unit: string;
  price: number;
  categoryId: number;
  className?: string;
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

  if (
    unitOnly !== "LB" &&
    unitOnly !== "OZ" &&
    unitOnly !== "GR" &&
    unitOnly !== "UND" &&
    unitOnly !== "KG" &&
    unitOnly !== "ML" &&
    unitOnly !== "LT" &&
    unitOnly !== "CL" &&
    unitOnly !== "GL"
  ) {
    return null;
  }

  if (unitOnly === "UND") {
    return (
      <div className={cn("text-xs", className)}>
        ${(price / amount).toFixed(2)} por UND
      </div>
    );
  }

  //Comprarar por 100 GR
  if (categoryId === 4) {
    return (
      <div className={cn("text-xs", className)}>
        ${getPricePer100Grams(price, amount, unitOnly)} por 100 GR
      </div>
    );
  }

  //Comparar por 100 ML
  if (categoryId === 6) {
    //Comparar por 100 GR
    if (
      unitOnly !== "LT" &&
      unitOnly !== "ML" &&
      unitOnly !== "CL" &&
      unitOnly !== "GL"
    ) {
      return (
        <div className={cn("text-xs", className)}>
          ${getPricePer100Grams(price, amount, unitOnly)} por 100 GR
        </div>
      );
    }

    return (
      <div className={cn("text-xs", className)}>
        ${getPricePer100Milliliters(price, amount, unitOnly)} por 100 ML
      </div>
    );
  }

  //Comprarar por LB
  const lb = convertToPounds(amount, unitOnly);
  return (
    <div className={cn("text-xs", className)}>
      ${(price / lb).toFixed(2)} por LB
    </div>
  );
}

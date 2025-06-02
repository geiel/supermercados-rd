function convertToGrams(quantity: number, unit: string): number {
  switch (unit) {
    case "GR":
      return quantity;
    case "OZ":
      return quantity * 28.35;
    case "LB":
      return quantity * 453.59237;
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

export function PricePerUnit({
  unit,
  price,
  categoryId,
}: {
  unit: string;
  price: number;
  categoryId: number;
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

  if (amount <= 1 && unitOnly !== "KG" && unitOnly !== "LB") {
    return null;
  }

  if (
    unitOnly !== "LB" &&
    unitOnly !== "OZ" &&
    unitOnly !== "GR" &&
    unitOnly !== "UND" &&
    unitOnly !== "KG"
  ) {
    return null;
  }

  if (amount === 1) {
    if (unitOnly === "KG") {
      const lb = convertToPounds(amount, unitOnly);
      return <div className="text-xs">${(price / lb).toFixed(2)} por LB</div>;
    }

    if (unitOnly === "LB" && categoryId === 4) {
      return (
        <div className="text-xs">
          ${getPricePer100Grams(price, amount, unitOnly)} por 100 GR
        </div>
      );
    }

    return;
  }

  if (amount < 1 && unitOnly === "LB" && categoryId !== 4) {
    return <div className="text-xs">${(price / amount).toFixed(2)} por LB</div>;
  }

  if (unitOnly === "UND") {
    return (
      <div className="text-xs">${(price / amount).toFixed(2)} por UND</div>
    );
  }

  if (unitOnly === "LB" && categoryId !== 4) {
    return <div className="text-xs">${(price / amount).toFixed(2)} por LB</div>;
  }

  //Equal to "Carnes"
  if (categoryId === 2 || categoryId === 3 || unitOnly === "KG") {
    const lb = convertToPounds(amount, unitOnly);
    return <div className="text-xs">${(price / lb).toFixed(2)} por LB</div>;
  }

  return (
    <div className="text-xs">
      ${getPricePer100Grams(price, amount, unitOnly)} por 100 GR
    </div>
  );
}

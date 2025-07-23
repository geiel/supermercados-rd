export function isLessThan12HoursAgo(date: Date): boolean {
  const now = new Date();
  const twelveHoursInMs = 12 * 60 * 60 * 1000;
  return now.getTime() - date.getTime() < twelveHoursInMs;
}

export function formatUnit(unit: string) {
  unit = unit.replace(/^([0-9]+)([A-Za-z]+)$/, "$1 $2");

  const parts = unit.split(" ");
  if (parts.length <= 1) {
    return unit;
  }

  const unitAmount = parts[0];
  const unitType = parts[1].toUpperCase();

  if (unitType === "GRAMOS" || unitType === "GRS") {
    return `${unitAmount} GR`;
  }

  if (unitType === "UDS" || unitType === "UN" || unitType === "UNIDADES" || unitType === "UND/PAQ") {
    return `${unitAmount} UND`;
  }

  if (unitType === "ONZ") {
    return `${unitAmount} OZ`;
  }

  if (unitType === "L") {
    return `${unitAmount} LT`;
  }

  if (unitType === "G" && Number(unitAmount) > 20) {
    return `${unitAmount} GR`;
  }

  if (unitType === "LBS") {
    return `${unitAmount} LB`;
  }

  if (unitType[unitType.length - 1] === ".") {
    return `${unitAmount} ${unitType.slice(0, -1)}`;
  }

  return unit;
}

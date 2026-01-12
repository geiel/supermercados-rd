export type Measurement = "weight" | "volume" | "count" | "length";

export const measurementByUnit: Record<string, Measurement | undefined> = {
  LB: "weight",
  OZ: "weight",
  GR: "weight",
  KG: "weight",
  ML: "volume",
  CC: "volume",
  LT: "volume",
  CL: "volume",
  GL: "volume",
  UND: "count",
  M: "length",
  FT: "length",
  YD: "length",
};

export const EQUIVALENCE_TOLERANCE = 0.5; // allow small rounding differences when grouping (e.g. 16 OZ vs 1 LB)

export const FLUID_OUNCE_IN_ML = 29.5735;
export const OUNCES_IN_POUND = 16;
export const CENTIMETERS_IN_METER = 100;
export const CENTIMETERS_IN_FOOT = 30.48;
export const CENTIMETERS_IN_YARD = 91.44;

export function convertToBase(amount: number, unit: string, measurement: Measurement): number {
  switch (measurement) {
    case "weight": {
      switch (unit) {
        case "GR":
          return amount;
        case "OZ":
          return amount * 28.35;
        case "LB":
          return amount * 453.59237;
        case "KG":
          return amount * 1000;
        default:
          return 0;
      }
    }
    case "volume": {
      switch (unit) {
        case "CC":
        case "ML":
          return amount;
        case "CL":
          return amount * 10;
        case "LT":
          return amount * 1000;
        case "GL":
          return amount * 3785.411784;
        case "GR": // sometimes used for ml in data; keep parity with price-per-unit fallback
          return amount;
        case "OZ":
          return amount * 28.35;
        case "LB":
          return amount * 453.59237;
        case "KG":
          return amount * 1000;
        default:
          return 0;
      }
    }
    case "count":
      return amount;
    case "length": {
      switch (unit) {
        case "M":
          return amount * CENTIMETERS_IN_METER;
        case "FT":
          return amount * CENTIMETERS_IN_FOOT;
        case "YD":
          return amount * CENTIMETERS_IN_YARD;
        default:
          return 0;
      }
    }
  }
}

export function formatAmount(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  const fixed = value.toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}

export type ParsedUnit = {
  measurement: Measurement;
  base: number;
  display: string;
  amount: number;
  normalizedUnit: string;
};

export function parseUnit(unitRaw: string): ParsedUnit | null {
  const trimmed = unitRaw.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/);
  let amount = Number(parts[0]);
  let unit = parts[1];

  if (Number.isNaN(amount)) {
    amount = 1;
    unit = parts[0];
  }

  if (!unit) return null;

  const normalizedUnit = unit.toUpperCase();
  const measurement = measurementByUnit[normalizedUnit];
  if (!measurement) return null;

  const base = convertToBase(amount, normalizedUnit, measurement);
  if (!base) return null;

  const display = `${formatAmount(amount)} ${normalizedUnit}`;
  return { measurement, base, display, amount, normalizedUnit };
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function getFluidOunces(parsed: ParsedUnit): number | null {
  if (parsed.measurement === "volume") {
    return parsed.base / FLUID_OUNCE_IN_ML;
  }

  if (parsed.measurement === "weight") {
    if (parsed.normalizedUnit === "OZ") return parsed.amount;
    if (parsed.normalizedUnit === "LB") return parsed.amount * OUNCES_IN_POUND;
  }

  return null;
}

function addUnit(variants: Set<string>, amount: number | null, unit: string) {
  if (!amount || !Number.isFinite(amount)) return;
  if (amount <= 0) return;

  variants.add(`${formatAmount(amount)} ${unit}`);
}

// Expand a unit filter so OZ/LB/LT equivalents are included (e.g. 32 OZ -> 2 LB -> ~1 LT).
export function expandUnitFilter(unitRaw: string): string[] {
  const parsed = parseUnit(unitRaw);
  if (!parsed) {
    const fallback = unitRaw.trim();
    return fallback ? [fallback] : [];
  }

  const variants = new Set<string>([parsed.display]);
  const fluidOunces = getFluidOunces(parsed);

  if (fluidOunces) {
    addUnit(variants, fluidOunces, "OZ");
    addUnit(variants, Math.round(fluidOunces), "OZ");
    addUnit(variants, roundToStep(fluidOunces, 4), "OZ"); // map 1 LT -> 32 OZ bucket
    addUnit(variants, fluidOunces - 0.5, "OZ");
    addUnit(variants, fluidOunces + 0.5, "OZ");

    if (parsed.measurement === "weight") {
      const pounds = fluidOunces / OUNCES_IN_POUND;
      addUnit(variants, pounds, "LB");
      addUnit(variants, Math.round(pounds), "LB");
      const bucketPounds = roundToStep(pounds, 4);
      addUnit(variants, bucketPounds, "LB");
    }
  }

  const liters =
    fluidOunces !== null && fluidOunces !== undefined
      ? (fluidOunces * FLUID_OUNCE_IN_ML) / 1000
      : parsed.measurement === "volume"
        ? parsed.base / 1000
        : null;

  if (liters) {
    addUnit(variants, roundToStep(liters, 0.25), "LT"); // common packaging steps (0.5, 1, etc)
    addUnit(variants, Math.round(liters), "LT");
  }

  const grams = parsed.measurement === "weight" ? parsed.base : null;
  if (grams) {
    addUnit(variants, grams, "GR");
    addUnit(variants, Math.round(grams), "GR");
    addUnit(variants, roundToStep(grams, 50), "GR"); // common package rounding (e.g. 1800g)

    const kilograms = grams / 1000;
    addUnit(variants, kilograms, "KG");
    addUnit(variants, roundToStep(kilograms, 0.25), "KG");
    addUnit(variants, Math.round(kilograms), "KG");
  }

  const centimeters = parsed.measurement === "length" ? parsed.base : null;
  if (centimeters) {
    const meters = centimeters / CENTIMETERS_IN_METER;
    addUnit(variants, meters, "M");
    addUnit(variants, roundToStep(meters, 0.25), "M");
    addUnit(variants, Math.round(meters), "M");

    const feet = centimeters / CENTIMETERS_IN_FOOT;
    addUnit(variants, feet, "FT");
    addUnit(variants, roundToStep(feet, 0.25), "FT");
    addUnit(variants, Math.round(feet), "FT");

    const yards = centimeters / CENTIMETERS_IN_YARD;
    addUnit(variants, yards, "YD");
    addUnit(variants, roundToStep(yards, 0.25), "YD");
    addUnit(variants, Math.round(yards), "YD");
  }

  return Array.from(variants);
}

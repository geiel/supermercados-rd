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

// Special group conversions (hardcoded)
export const DEODORANT_SPRAY_GROUP_ID = 497;
export const DEODORANT_SPRAY_HUMAN_ID = "desodorante-en-spray";
export const GR_TO_ML_RATIO_DEODORANT = 150 / 91; // ~1.648

export const FLUID_OUNCE_IN_ML = 29.5735;
export const OUNCES_IN_POUND = 16;
export const CENTIMETERS_IN_METER = 100;
export const CENTIMETERS_IN_FOOT = 30.48;
export const CENTIMETERS_IN_YARD = 91.44;
export const MILLIMETERS_IN_CENTIMETER = 10;
export const GRAMS_IN_OUNCE = 28.35;
export const GRAMS_IN_KILOGRAM = 1000;

const SEARCH_UNIT_ALIASES: Record<string, string> = {
  lb: "LB",
  lbs: "LB",
  libra: "LB",
  libras: "LB",
  pound: "LB",
  pounds: "LB",
  oz: "OZ",
  onza: "OZ",
  onzas: "OZ",
  g: "GR",
  gr: "GR",
  grs: "GR",
  gramo: "GR",
  gramos: "GR",
  gram: "GR",
  grams: "GR",
  kg: "KG",
  kgs: "KG",
  kilo: "KG",
  kilos: "KG",
  kilogramo: "KG",
  kilogramos: "KG",
  kilogram: "KG",
  kilograms: "KG",
  ml: "ML",
  mls: "ML",
  mililitro: "ML",
  mililitros: "ML",
  milliliter: "ML",
  milliliters: "ML",
  cc: "CC",
  cl: "CL",
  cls: "CL",
  centilitro: "CL",
  centilitros: "CL",
  lt: "LT",
  lts: "LT",
  ltr: "LT",
  ltrs: "LT",
  litro: "LT",
  litros: "LT",
  liter: "LT",
  liters: "LT",
  l: "LT",
  gl: "GL",
  gal: "GL",
  gals: "GL",
  galon: "GL",
  galones: "GL",
  gallon: "GL",
  gallons: "GL",
  und: "UND",
  uds: "UND",
  ud: "UND",
  unidad: "UND",
  unidades: "UND",
  unit: "UND",
  units: "UND",
  m: "M",
  metro: "M",
  metros: "M",
  ft: "FT",
  pie: "FT",
  pies: "FT",
  yd: "YD",
  yarda: "YD",
  yardas: "YD",
};

const SEARCH_UNITS_SORTED = Object.keys(SEARCH_UNIT_ALIASES).sort(
  (a, b) => b.length - a.length
);
const SEARCH_UNITS_PATTERN = SEARCH_UNITS_SORTED.map((unit) =>
  unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
).join("|");
const SEARCH_UNIT_WITH_AMOUNT_REGEX = new RegExp(
  `(?:^|\\s)(\\d+(?:[\\.,]\\d+)?)\\s*(${SEARCH_UNITS_PATTERN})(?=\\b)`,
  "i"
);
const SEARCH_UNIT_ONLY_REGEX = new RegExp(
  `(?:^|\\s)(${SEARCH_UNITS_PATTERN})(?=\\b)`,
  "i"
);

export type SearchUnitTarget = {
  parsed: ParsedUnit;
  amountsByUnit: Record<string, number>;
  cleanedSearchText: string;
};

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

/**
 * Parse unit with special group-specific conversions.
 * For deodorant spray group, converts GR to ML using density ratio.
 */
export function parseUnitWithGroupConversion(
  unitRaw: string,
  groupHumanId?: string | null
): ParsedUnit | null {
  const parsed = parseUnit(unitRaw);
  if (!parsed) return null;

  // For deodorant spray, convert GR to ML
  if (
    groupHumanId === DEODORANT_SPRAY_HUMAN_ID &&
    parsed.normalizedUnit === "GR"
  ) {
    const mlAmount = parsed.amount * GR_TO_ML_RATIO_DEODORANT;
    return {
      measurement: "volume",
      base: mlAmount, // ML as base
      display: parsed.display, // Keep original display
      amount: mlAmount,
      normalizedUnit: "ML",
    };
  }

  return parsed;
}

function normalizeSearchUnitInput(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.,\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addSearchTargetAmount(
  target: Record<string, number>,
  unit: string,
  amount: number
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  const existing = target[unit];
  if (existing !== undefined && existing > 0) {
    // Keep the first amount for determinism.
    return;
  }

  target[unit] = amount;
}

function getEquivalentAmountsByUnit(parsed: ParsedUnit): Record<string, number> {
  const amountsByUnit: Record<string, number> = {};

  if (parsed.measurement === "count") {
    addSearchTargetAmount(amountsByUnit, "UND", parsed.base);
    return amountsByUnit;
  }

  if (parsed.measurement === "length") {
    addSearchTargetAmount(amountsByUnit, "CM", parsed.base);
    addSearchTargetAmount(amountsByUnit, "MM", parsed.base * MILLIMETERS_IN_CENTIMETER);
    addSearchTargetAmount(amountsByUnit, "M", parsed.base / CENTIMETERS_IN_METER);
    addSearchTargetAmount(amountsByUnit, "FT", parsed.base / CENTIMETERS_IN_FOOT);
    addSearchTargetAmount(amountsByUnit, "YD", parsed.base / CENTIMETERS_IN_YARD);
    return amountsByUnit;
  }

  const bridgeOunces =
    parsed.measurement === "weight"
      ? parsed.base / GRAMS_IN_OUNCE
      : parsed.base / FLUID_OUNCE_IN_ML;

  // Weight equivalents.
  const grams = bridgeOunces * GRAMS_IN_OUNCE;
  addSearchTargetAmount(amountsByUnit, "GR", grams);
  addSearchTargetAmount(amountsByUnit, "KG", grams / GRAMS_IN_KILOGRAM);
  addSearchTargetAmount(amountsByUnit, "OZ", bridgeOunces);
  addSearchTargetAmount(amountsByUnit, "LB", bridgeOunces / OUNCES_IN_POUND);

  // Volume equivalents.
  const milliliters = bridgeOunces * FLUID_OUNCE_IN_ML;
  addSearchTargetAmount(amountsByUnit, "ML", milliliters);
  addSearchTargetAmount(amountsByUnit, "CC", milliliters);
  addSearchTargetAmount(amountsByUnit, "CL", milliliters / 10);
  addSearchTargetAmount(amountsByUnit, "LT", milliliters / 1000);
  addSearchTargetAmount(amountsByUnit, "GL", milliliters / 3785.411784);

  return amountsByUnit;
}

export function extractSearchUnitTarget(valueRaw: string): SearchUnitTarget | null {
  const normalized = normalizeSearchUnitInput(valueRaw);
  if (!normalized) return null;

  const unitWithAmountMatch = normalized.match(SEARCH_UNIT_WITH_AMOUNT_REGEX);
  const unitOnlyMatch = unitWithAmountMatch
    ? null
    : normalized.match(SEARCH_UNIT_ONLY_REGEX);

  const rawUnit = unitWithAmountMatch?.[2] ?? unitOnlyMatch?.[1];
  const normalizedUnit = rawUnit ? SEARCH_UNIT_ALIASES[rawUnit.toLowerCase()] : undefined;
  if (!normalizedUnit) return null;

  const rawAmount = unitWithAmountMatch?.[1] ?? "1";
  const amount = Number(rawAmount.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const parsed = parseUnit(`${formatAmount(amount)} ${normalizedUnit}`);
  if (!parsed) return null;

  const cleanedSearchText = normalized
    .replace(SEARCH_UNIT_WITH_AMOUNT_REGEX, " ")
    .replace(SEARCH_UNIT_ONLY_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    parsed,
    amountsByUnit: getEquivalentAmountsByUnit(parsed),
    cleanedSearchText,
  };
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

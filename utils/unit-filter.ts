const UNIT_FILTER_DELIMITER = ",";

export function parseUnitFilterParam(raw: string | null): string[] {
  if (!raw) return [];

  const delimiter = raw.includes(UNIT_FILTER_DELIMITER) ? UNIT_FILTER_DELIMITER : "/";

  return raw
    .split(delimiter)
    .map((unit) => decodeURIComponent(unit).trim())
    .filter(Boolean);
}

export function serializeUnitFilters(units: string[]): string {
  return units.map((unit) => encodeURIComponent(unit)).join(UNIT_FILTER_DELIMITER);
}

export function normalizeUnitFiltersForSearch(units: string[]): string[] {
  return units.flatMap((unit) =>
    unit
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)
  );
}

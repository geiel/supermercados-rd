export const GROUP_EXPLORER_MOBILE_PAGE_SIZE = 24;
export const GROUP_EXPLORER_DESKTOP_PAGE_SIZE = 40;
export const GROUP_EXPLORER_MAX_LIMIT = 80;
export const GROUP_EXPLORER_SORT_VALUES = [
  "lowest_price",
  "best_value",
  "highest_price",
  "relevance",
] as const;

export type GroupExplorerSort = (typeof GROUP_EXPLORER_SORT_VALUES)[number];

export const GROUP_EXPLORER_DEFAULT_SORT: GroupExplorerSort = "relevance";

export const GROUP_EXPLORER_SORT_OPTIONS: {
  value: GroupExplorerSort;
  label: string;
}[] = [
  { value: "relevance", label: "Relevancia" },
  { value: "lowest_price", label: "Precio mas bajo" },
  { value: "best_value", label: "Mejor valor" },
  { value: "highest_price", label: "Precio mas alto" },
];

export const isGroupExplorerSort = (
  value: string | null | undefined
): value is GroupExplorerSort =>
  !!value && GROUP_EXPLORER_SORT_VALUES.includes(value as GroupExplorerSort);

export type GroupExplorerBrand = {
  id: number;
  name: string;
};

export type GroupExplorerProduct = {
  id: number;
  name: string;
  image: string | null;
  unit: string;
  categoryId: number;
  brand: GroupExplorerBrand;
  possibleBrand: GroupExplorerBrand | null;
  currentPrice: string | null;
  isCheaper: boolean;
};

export type GroupExplorerGroup = {
  id: number;
  name: string;
  humanId: string;
  cheaperProductId: number | null;
  isComparable: boolean;
};

export type GroupExplorerChildGroup = {
  id: number;
  name: string;
  humanNameId: string;
  isComparable: boolean;
};

export type GroupExplorerResponse = {
  group: GroupExplorerGroup;
  products: GroupExplorerProduct[];
  childGroups: GroupExplorerChildGroup[];
  total: number;
  nextOffset: number;
};

// Filter types
export type GroupExplorerFilters = {
  shopIds?: number[];
  units?: string[];
  minPrice?: number;
  maxPrice?: number;
};

// Price stats types for histogram
export type PriceStatsBucket = {
  rangeStart: number;
  rangeEnd: number;
  count: number;
};

export type PriceStatsResponse = {
  min: number;
  max: number;
  buckets: PriceStatsBucket[];
  scale: "linear" | "log";
  quickFilters: {
    label: string;
    minPrice: number | null;
    maxPrice: number | null;
    count: number;
  }[];
};

// Unit options type
export type UnitOption = {
  value: string;
  label: string;
  count: number;
};

// Shop option type for filters
export type ShopOption = {
  id: number;
  name: string;
  count: number;
};

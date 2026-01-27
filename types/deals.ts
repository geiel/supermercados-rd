export const DEALS_MOBILE_PAGE_SIZE = 24;
export const DEALS_DESKTOP_PAGE_SIZE = 40;
export const DEALS_MAX_LIMIT = 80;
export const DEALS_SORT_VALUES = [
  "highest_discount",
  "lowest_price",
  "highest_price",
  "most_recent",
  "relevance",
] as const;

export type DealsSort = (typeof DEALS_SORT_VALUES)[number];

export const DEALS_DEFAULT_SORT: DealsSort = "most_recent";

export const DEALS_SORT_OPTIONS: {
  value: DealsSort;
  label: string;
}[] = [
  { value: "highest_discount", label: "Descuento mas alto" },
  { value: "lowest_price", label: "Precio mas bajo" },
  { value: "highest_price", label: "Precio mas alto" },
  { value: "most_recent", label: "Mas recientes" },
  { value: "relevance", label: "Relevancia" },
];

export const DEALS_DISCOUNT_OPTIONS = [
  { value: 50, label: "50% o mas" },
  { value: 25, label: "25% o mas" },
  { value: 10, label: "10% o mas" },
  { value: 5, label: "5% o mas" },
] as const;

export const isDealsSort = (
  value: string | null | undefined
): value is DealsSort => !!value && DEALS_SORT_VALUES.includes(value as DealsSort);

export type DealsFilters = {
  shopIds?: number[];
  groupIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  minDrop?: number;
};

export type DealProduct = {
  categoryId: number;
};

export type DealItem = {
  productId: number;
  name: string;
  unit: string;
  image: string | null;
  rank: string | null;
  brandName: string;
  possibleBrandName: string | null;
  priceBeforeToday: string | null;
  priceToday: string;
  dropAmount: string;
  dropPercentage: string;
  shopId: number;
  amountOfShops: string;
  product: DealProduct | null;
};

export type DealsResponse = {
  deals: DealItem[];
  total: number;
  nextOffset: number;
};

export type DealsPriceStatsBucket = {
  rangeStart: number;
  rangeEnd: number;
  count: number;
};

export type DealsPriceStatsResponse = {
  min: number;
  max: number;
  buckets: DealsPriceStatsBucket[];
  quickFilters: {
    label: string;
    minPrice: number | null;
    maxPrice: number | null;
    count: number;
  }[];
};

export type DealsDiscountOption = {
  value: number;
  label: string;
  count: number;
};

export type DealsGroupOption = {
  id: number;
  name: string;
  count: number;
};

export type DealsShopOption = {
  id: number;
  name: string;
  count: number;
};

export const BRAND_EXPLORER_MOBILE_PAGE_SIZE = 24;
export const BRAND_EXPLORER_DESKTOP_PAGE_SIZE = 40;
export const BRAND_EXPLORER_MAX_LIMIT = 80;
export const BRAND_EXPLORER_SORT_VALUES = [
  "relevance",
  "lowest_price",
  "highest_price",
  "highest_discount",
] as const;

export type BrandExplorerSort = (typeof BRAND_EXPLORER_SORT_VALUES)[number];

export const BRAND_EXPLORER_DEFAULT_SORT: BrandExplorerSort = "relevance";

export const BRAND_EXPLORER_SORT_OPTIONS: {
  value: BrandExplorerSort;
  label: string;
}[] = [
  { value: "relevance", label: "Relevancia" },
  { value: "lowest_price", label: "Precio mas bajo" },
  { value: "highest_price", label: "Precio mas alto" },
  { value: "highest_discount", label: "Descuento mas alto" },
];

export const isBrandExplorerSort = (
  value: string | null | undefined
): value is BrandExplorerSort =>
  !!value && BRAND_EXPLORER_SORT_VALUES.includes(value as BrandExplorerSort);

export type BrandExplorerBrand = {
  id: number;
  name: string;
};

export type BrandExplorerProduct = {
  id: number;
  name: string;
  image: string | null;
  unit: string;
  categoryId: number;
  brand: BrandExplorerBrand;
  possibleBrand: BrandExplorerBrand | null;
  currentPrice: string | null;
  productDeal: { dropPercentage: string | number } | null;
};

export type BrandExplorerFilters = {
  shopIds?: number[];
  groupIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  minDrop?: number;
};

export type BrandExplorerResponse = {
  products: BrandExplorerProduct[];
  total: number;
  nextOffset: number;
};

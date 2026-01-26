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

export const GROUP_EXPLORER_DEFAULT_SORT: GroupExplorerSort = "lowest_price";

export const GROUP_EXPLORER_SORT_OPTIONS: {
  value: GroupExplorerSort;
  label: string;
}[] = [
  { value: "lowest_price", label: "Precio mas bajo" },
  { value: "best_value", label: "Mejor valor" },
  { value: "highest_price", label: "Precio mas alto" },
  { value: "relevance", label: "Relevancia" },
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

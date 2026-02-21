export const EXPLORE_SYNC_COUNT = 15;
export const EXPLORE_PREFETCH_COUNT = 10;
export const EXPLORE_BATCH_SIZE = EXPLORE_SYNC_COUNT + EXPLORE_PREFETCH_COUNT;

export type ExploreBrand = {
  id: number;
  name: string;
};

export type ExploreGroupResult = {
  name: string;
  humanId: string;
  groupId: number;
  isComparable: boolean;
  imageUrl: string | null;
  parentGroupName?: string | null;
};

export type ExploreProduct = {
  id: number;
  name: string;
  unit: string;
  categoryId: number;
  image: string | null;
  brand: ExploreBrand;
  possibleBrand: ExploreBrand | null;
  currentPrice: string | null;
  shopLogo: string | null;
  productDeal: { dropPercentage: string | number } | null;
};

export type ExploreProductsResponse = {
  products: ExploreProduct[];
  prefetch: ExploreProduct[];
  total: number;
  nextOffset: number;
  groupResults: ExploreGroupResult[];
};

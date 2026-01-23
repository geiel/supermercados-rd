export type CategorySubCategorySummary = {
  id: number;
  name: string;
  humanId: string;
};

export type CategoryPreview = {
  id: number;
  name: string;
  humanId: string;
  imageUrl: string | null;
  subCategories: CategorySubCategorySummary[];
};

export type CategorySubCategoriesResponse = {
  category: {
    id: number;
    name: string;
    humanId: string;
  };
  subCategories: CategorySubCategorySummary[];
  total: number;
  nextOffset: number;
};

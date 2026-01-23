import type { GroupExplorerProduct } from "@/types/group-explorer";

export type SubCategoryExplorerSummary = {
  id: number;
  name: string;
  humanId: string;
  mainCategoryId: number;
  isExplorable: boolean;
};

export type SubCategoryExplorerResponse = {
  subCategory: SubCategoryExplorerSummary;
  products: GroupExplorerProduct[];
  total: number;
  nextOffset: number;
};

export type SubCategoryGroupSummary = {
  id: number;
  name: string;
  humanId: string;
};

export type SubCategoryGroupsResponse = {
  subCategory: Pick<SubCategoryExplorerSummary, "id" | "name" | "humanId">;
  groups: Array<{
    id: number;
    name: string;
    humanId: string;
    image: string | null;
    childGroups: SubCategoryGroupSummary[];
  }>;
  total: number;
  nextOffset: number;
};

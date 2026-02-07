import { getGroupCategories } from "@/lib/group-categories";
import { GroupCategoriesStripClient } from "@/components/group-categories-strip-client";

export async function GroupCategoriesStrip() {
  const categories = await getGroupCategories();

  if (categories.length === 0) {
    return null;
  }

  return <GroupCategoriesStripClient categories={categories} />;
}

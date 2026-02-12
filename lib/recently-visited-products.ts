export const RECENTLY_VISITED_PRODUCTS_KEY = "recently-visited-products-v1";
export const MAX_RECENTLY_VISITED_PRODUCTS = 20;

export type RecentlyVisitedProduct = {
  id: number;
  name: string;
  unit: string;
  image: string | null;
  price: number | null;
  categoryId: number | null;
  visitedAt: number;
};

type RecentlyVisitedProductInput = Omit<RecentlyVisitedProduct, "visitedAt">;
type RecentlyVisitedProductFromStorage = Omit<
  RecentlyVisitedProduct,
  "price" | "categoryId"
> & {
  price?: number | null;
  categoryId?: number | null;
};

const isRecentlyVisitedProduct = (
  value: unknown
): value is RecentlyVisitedProductFromStorage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RecentlyVisitedProductFromStorage>;
  const hasValidPrice =
    candidate.price === undefined ||
    candidate.price === null ||
    Number.isFinite(candidate.price);
  const hasValidCategoryId =
    candidate.categoryId === undefined ||
    candidate.categoryId === null ||
    Number.isFinite(candidate.categoryId);

  return (
    Number.isFinite(candidate.id) &&
    typeof candidate.name === "string" &&
    typeof candidate.unit === "string" &&
    (candidate.image === null || typeof candidate.image === "string") &&
    hasValidPrice &&
    hasValidCategoryId &&
    Number.isFinite(candidate.visitedAt)
  );
};

export const getRecentlyVisitedProducts = (): RecentlyVisitedProduct[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(RECENTLY_VISITED_PRODUCTS_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isRecentlyVisitedProduct)
      .map((item) => ({
        ...item,
        price: item.price ?? null,
        categoryId: item.categoryId ?? null,
      }))
      .sort((first, second) => second.visitedAt - first.visitedAt)
      .slice(0, MAX_RECENTLY_VISITED_PRODUCTS);
  } catch {
    return [];
  }
};

export const saveRecentlyVisitedProduct = (
  product: RecentlyVisitedProductInput
) => {
  if (typeof window === "undefined") return;

  try {
    const current = getRecentlyVisitedProducts();
    const withoutDuplicates = current.filter((item) => item.id !== product.id);

    const updated: RecentlyVisitedProduct[] = [
      { ...product, visitedAt: Date.now() },
      ...withoutDuplicates,
    ].slice(0, MAX_RECENTLY_VISITED_PRODUCTS);

    localStorage.setItem(
      RECENTLY_VISITED_PRODUCTS_KEY,
      JSON.stringify(updated)
    );
  } catch {
    // Ignore localStorage errors
  }
};

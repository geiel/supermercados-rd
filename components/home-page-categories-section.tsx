import Link from "next/link";

import { TypographyH3 } from "@/components/typography-h3";
import { Button } from "@/components/ui/button";
import ScrollPeek from "@/components/ui/scroll-peek";
import { PRODUCT_SCROLL_PEEK_PROPS } from "@/components/ui/product-scroll-config";
import { getHomePageCategories } from "@/lib/home-page-categories";
import { HomePageCategoryProductCard } from "./home-page-category-product-card";

const PRODUCTS_PER_CATEGORY = 20;

export async function HomePageCategoriesSection() {
  const categories = await getHomePageCategories(PRODUCTS_PER_CATEGORY);

  if (categories.length === 0) {
    return null;
  }

  return (
    <>
      {categories.map((category) => (
        <section key={category.id}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <TypographyH3>{category.name}</TypographyH3>
                {category.description ? (
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                ) : null}
              </div>
              <Button variant="link" size="sm" asChild>
                <Link href={`/category/${category.id}`}>Ver todas</Link>
              </Button>
            </div>
            <ScrollPeek {...PRODUCT_SCROLL_PEEK_PROPS}>
              <div className="relative flex gap-1.5 p-2 md:gap-2">
                {category.products.map((product) => (
                  <HomePageCategoryProductCard
                    key={product.productId}
                    product={product}
                  />
                ))}
              </div>
            </ScrollPeek>
          </div>
        </section>
      ))}
    </>
  );
}

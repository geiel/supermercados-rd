"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";

const INITIAL_SUBCATEGORIES_COUNT = 5;

type CategorySubCategoryPreview = {
  id: number;
  name: string;
  humanId: string;
};

type CategoryCardProps = {
  category: {
    id: number;
    name: string;
    humanId: string;
    imageUrl: string | null;
    subCategories: CategorySubCategoryPreview[];
  };
};

export function CategoryCard({ category }: CategoryCardProps) {
  const [showAll, setShowAll] = useState(false);

  const allSubCategories = category.subCategories;
  const visibleSubCategories = showAll
    ? allSubCategories
    : allSubCategories.slice(0, INITIAL_SUBCATEGORIES_COUNT);
  const remaining = allSubCategories.length - INITIAL_SUBCATEGORIES_COUNT;
  const hasMore = remaining > 0 && !showAll;

  const categoryHref = `/explorar/${category.humanId}`;

  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <Link href={categoryHref} className="block" prefetch={false}>
        <AspectRatio ratio={4 / 3} className="overflow-hidden rounded-lg">
          {category.imageUrl ? (
            <Image
              src={category.imageUrl}
              alt={category.name}
              fill
              sizes="280px"
              style={{ objectFit: "contain" }}
              unoptimized
            />
          ) : (
            <Image
              src="/no-product-found.jpg"
              alt="image not found"
              fill
              sizes="280px"
              style={{ objectFit: "contain" }}
              unoptimized
            />
          )}
        </AspectRatio>
        <div className="mt-3 text-base font-semibold">{category.name}</div>
      </Link>

      <div className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
        {visibleSubCategories.map((subCategory) => (
          <Link
            key={subCategory.id}
            href={`/explorar/${category.humanId}/${subCategory.humanId}`}
            prefetch={false}
            className="hover:text-primary hover:underline underline-offset-4"
          >
            {subCategory.name}
          </Link>
        ))}
      </div>

      {hasMore ? (
        <div className="mt-2">
          <Button
            type="button"
            variant="link"
            className="px-0 text-sm"
            onClick={() => setShowAll(true)}
          >
            Mostrar más ({remaining})
          </Button>
        </div>
      ) : null}
    </div>
  );
}

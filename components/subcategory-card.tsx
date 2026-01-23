"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";

const INITIAL_GROUPS_COUNT = 5;

type SubCategoryGroupPreview = {
  id: number;
  name: string;
  humanId: string;
};

type SubCategoryCardProps = {
  categoryHumanId: string;
  subCategory: {
    id: number;
    name: string;
    humanId: string;
    imageUrl: string | null;
    isExplorable: boolean;
    groups: SubCategoryGroupPreview[];
  };
};

export function SubCategoryCard({
  categoryHumanId,
  subCategory,
}: SubCategoryCardProps) {
  const [showAll, setShowAll] = useState(false);

  const allGroups = subCategory.groups;
  const visibleGroups = showAll
    ? allGroups
    : allGroups.slice(0, INITIAL_GROUPS_COUNT);
  const remaining = allGroups.length - INITIAL_GROUPS_COUNT;
  const hasMore = remaining > 0 && !showAll;

  const subCategoryHref = `/explorar/${categoryHumanId}/${subCategory.humanId}`;

  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <Link href={subCategoryHref} className="block" prefetch={false}>
        <AspectRatio ratio={4 / 3} className="overflow-hidden rounded-lg">
          {subCategory.imageUrl ? (
            <Image
              src={subCategory.imageUrl}
              alt={subCategory.name}
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
        <div className="mt-3 text-base font-semibold">{subCategory.name}</div>
      </Link>

      <div className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
        {visibleGroups.map((group) => (
          <Link
            key={group.id}
            href={`/groups/${group.humanId}`}
            prefetch={false}
            className="hover:text-primary hover:underline underline-offset-4"
          >
            {group.name}
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

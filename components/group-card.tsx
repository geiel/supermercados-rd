"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product-image";

const INITIAL_CHILD_GROUPS_COUNT = 5;

type GroupCardProps = {
  group: {
    id: number;
    name: string;
    humanId: string;
    image: string | null;
    childGroups: Array<{ id: number; name: string; humanId: string }>;
  };
};

export function GroupCard({ group }: GroupCardProps) {
  const [showAll, setShowAll] = useState(false);

  const allChildGroups = group.childGroups;
  const visibleChildGroups = showAll
    ? allChildGroups
    : allChildGroups.slice(0, INITIAL_CHILD_GROUPS_COUNT);
  const remaining = allChildGroups.length - INITIAL_CHILD_GROUPS_COUNT;
  const hasMore = remaining > 0 && !showAll;

  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <Link href={`/groups/${group.humanId}`} prefetch={false} className="block">
        <AspectRatio ratio={4 / 3} className="overflow-hidden rounded-lg">
          {group.image ? (
            <ProductImage
              src={group.image}
              alt={group.name}
              fill
              sizes="280px"
              style={{ objectFit: "contain" }}
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
        <div className="mt-3 text-base font-semibold">{group.name}</div>
      </Link>

      {allChildGroups.length > 0 ? (
        <div className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
          {visibleChildGroups.map((child) => (
            <Link
              key={child.id}
              href={`/groups/${child.humanId}`}
              prefetch={false}
              className="hover:text-primary hover:underline underline-offset-4"
            >
              {child.name}
            </Link>
          ))}
        </div>
      ) : null}

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

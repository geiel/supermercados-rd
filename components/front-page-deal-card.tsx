"use client";

import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui/badge";
import { Unit } from "@/components/unit";
import { AddToListButton } from "@/components/add-to-list-button";
import { formatDropPercentage, toSlug } from "@/lib/utils";

const SUPERMARKET_BRAND_NAMES = ["Bravo", "Jumbo Market", "Sirena", "Plaza Lama"];

type FrontPageDealCardProps = {
  deal: {
    productId: number;
    name: string;
    unit: string;
    image: string | null;
    dropPercentage: string;
    priceToday: string;
    brandName: string;
    possibleBrandName: string | null;
  };
};

export function FrontPageDealCard({ deal }: FrontPageDealCardProps) {
  return (
    <div className="relative flex flex-col gap-2">
      <div className="absolute top-0 left-0 z-10">
        <Badge variant="destructive">
          -{formatDropPercentage(deal.dropPercentage)}%
        </Badge>
      </div>
      <div className="absolute top-0 right-0 z-10">
        <AddToListButton productId={deal.productId} variant="icon" />
      </div>
      <Link
        href={`/product/${toSlug(deal.name)}/${deal.productId}`}
        className="flex flex-col gap-2"
      >
        <div className="relative w-full max-w-[180px] aspect-square mx-auto">
          {deal.image ? (
            <ProductImage
              src={deal.image}
              fill
              alt={deal.name + deal.unit}
              sizes="(min-width: 1024px) 180px, 32vw"
              style={{
                objectFit: "contain",
              }}
              placeholder="blur"
              blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
              className="max-w-none"
            />
          ) : null}
        </div>
        <div className="px-2">
          <Unit unit={deal.unit} />
          <div>
            <BrandName name={deal.brandName} possibleName={deal.possibleBrandName} />
            {deal.name}
          </div>
          <div className="font-bold text-lg">RD${deal.priceToday}</div>
        </div>
      </Link>
    </div>
  );
}

function BrandName({ name, possibleName }: { name: string; possibleName: string | null }) {
  if (!possibleName) {
    return <div className="font-bold">{name}</div>;
  }

  if (SUPERMARKET_BRAND_NAMES.includes(name)) {
    return <div className="font-bold">{possibleName}</div>;
  }

  return <div className="font-bold">{name}</div>;
}

"use client";

import { useEffect } from "react";
import { saveRecentlyVisitedProduct } from "@/lib/recently-visited-products";

type RecentlyVisitedProductTrackerProps = {
  product: {
    id: number;
    name: string;
    unit: string;
    image: string | null;
    price: number | null;
    categoryId: number | null;
  };
};

export function RecentlyVisitedProductTracker({
  product,
}: RecentlyVisitedProductTrackerProps) {
  useEffect(() => {
    saveRecentlyVisitedProduct(product);
  }, [product.categoryId, product.id, product.image, product.name, product.price, product.unit]);

  return null;
}

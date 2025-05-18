"use client";

import { TypographyH3 } from "@/components/typography-h3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteProductById } from "@/lib/scrappers/admin-functions";
import { useState } from "react";

export default function Page() {
  const [productId, setProductId] = useState("");

  async function deleteProduct() {
    if (!productId) {
      return;
    }

    await deleteProductById(Number(productId));

    setProductId("");
  }

  return (
    <div className="container mx-auto pt-2">
      <div className="flex flex-col gap-4">
        <TypographyH3>Delete Product</TypographyH3>

        <Input
          placeholder="Product ID"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        />

        <Button onClick={deleteProduct}>Delete</Button>
      </div>
    </div>
  );
}

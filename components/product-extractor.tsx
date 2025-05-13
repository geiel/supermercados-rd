"use client";

import { Combobox } from "@/components/combobox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { productsCategoriesSelect, shopsSelect } from "@/db/schema";
import { getProductListSirena } from "@/lib/scrappers/sirena-extractor";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { TypographyH3 } from "./typography-h3";
import { getProductListJumbo } from "@/lib/scrappers/jumbo-extractor";
import { getProductListNacional } from "@/lib/scrappers/nacional-extractor";
import { getProductListPlazaLama } from "@/lib/scrappers/plaza-lama-extractor";
import { getProductListPricesmart } from "@/lib/scrappers/pricesmart-extractor";
import { getProductListBravo } from "@/lib/scrappers/bravo-extractor";

export function ProductExtractor({
  shops,
  categories,
}: {
  shops: shopsSelect[];
  categories: productsCategoriesSelect[];
}) {
  const [shopId, setShopId] = useState<string>("");
  const [cateogoryId, setCategoryId] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function processSupermarket() {
    if (!shopId || !cateogoryId || !url) return;

    setLoading(true);

    try {
      switch (shopId) {
        case "1":
          await getProductListSirena(Number(cateogoryId), url);
          break;
        case "2":
          await getProductListNacional(Number(cateogoryId), url);
          break;
        case "3":
          await getProductListJumbo(Number(cateogoryId), url);
          break;
        case "4":
          await getProductListPlazaLama(Number(cateogoryId));
          break;
        case "5":
          await getProductListPricesmart(Number(cateogoryId));
          break;
        case "6":
          await getProductListBravo(Number(cateogoryId), url);
          break;
      }
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TypographyH3>Products Extractor</TypographyH3>
      <Select onValueChange={setShopId}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Supermercado" />
        </SelectTrigger>
        <SelectContent>
          {shops.map((shop) => (
            <SelectItem key={shop.id} value={shop.id.toString()}>
              {shop.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Combobox
        options={categories.map((c) => ({
          value: c.id.toString(),
          label: c.name,
        }))}
        emptyMessage="Categoría no encontrada"
        placeholder="Categoría"
        onValueChange={(option) => setCategoryId(option.value)}
      />

      <Textarea
        placeholder="URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <div>
        <Button onClick={processSupermarket} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : null}
          Procesar
        </Button>
      </div>
    </div>
  );
}

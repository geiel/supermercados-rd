"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ReportIssueDrawer } from "@/components/report-issue-drawer";
import { AlertTriangle } from "lucide-react";

type Shop = {
  id: number;
  name: string;
  logo: string;
};

type ShopPriceRowActionsProps = {
  shopId: number;
  productId: number;
  url: string;
  api?: string | null;
  shops: Shop[];
};

export function ShopPriceRowActions({
  shopId,
  productId,
  url,
  api,
  shops,
}: ShopPriceRowActionsProps) {
  const [showReportLink, setShowReportLink] = useState(false);

  const getHref = () => {
    if (shopId === 6 && api) {
      const bravoProductId = api.replace(
        "https://bravova-api.superbravo.com.do/public/articulo/get?idArticulo=",
        ""
      );
      return `${url}/articulos/${bravoProductId}`;
    }
    return url;
  };

  const handleBuscarClick = () => {
    setShowReportLink(true);
  };

  return (
    <>
      <div className="place-self-end self-center">
        <Button size="xs" asChild>
          <a
            href={getHref()}
            target="_blank"
            className="text-xs"
            onClick={handleBuscarClick}
          >
            Buscar
          </a>
        </Button>
      </div>

      {showReportLink && (
        <div className="col-span-4 mt-2">
          <div className="bg-red-50 dark:bg-red-950/30 rounded-lg px-4 py-3 flex items-center justify-center gap-2">
            <AlertTriangle className="size-4 text-red-500" />
            <span className="text-sm">¿Algo mal?</span>
            <ReportIssueDrawer
              productId={productId}
              shopId={shopId}
              shops={shops}
            >
              <button className="text-sm text-primary underline cursor-pointer">
                Reportar error
              </button>
            </ReportIssueDrawer>
          </div>
        </div>
      )}
    </>
  );
}

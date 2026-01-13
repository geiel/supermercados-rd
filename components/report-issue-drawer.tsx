"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { submitIssueReport, type ProductIssue } from "@/lib/feedback";
import { toast } from "sonner";

type Shop = {
  id: number;
  name: string;
  logo: string;
};

const ISSUE_LABELS: Record<ProductIssue, string> = {
  incorrect_brand: "Marca incorrecta",
  incorrect_price: "Precio incorrecto",
  incorrect_image: "Imagen incorrecta",
  incorrect_category: "Categoría incorrecta",
  link_broken: "Enlace roto",
  link_incorrect: "Enlace incorrecto",
};

type ReportIssueDrawerProps = {
  productId: number;
  shopId?: number;
  shops: Shop[];
  children: React.ReactNode;
};

export function ReportIssueDrawer({
  productId,
  shopId: prefilledShopId,
  shops,
  children,
}: ReportIssueDrawerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<ProductIssue | "">("");
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const issuesRequiringShop: ProductIssue[] = ["incorrect_price", "link_broken", "link_incorrect"];
  const showShopSelector = issuesRequiringShop.includes(selectedIssue as ProductIssue) && !prefilledShopId;

  const handleSubmit = async () => {
    if (!selectedIssue) {
      toast.error("Por favor, selecciona un tipo de problema");
      return;
    }

    if (showShopSelector && !selectedShopId) {
      toast.error("Por favor, selecciona el supermercado");
      return;
    }

    setIsSubmitting(true);

    const shopIdToUse = prefilledShopId || (selectedShopId ? Number(selectedShopId) : undefined);

    const result = await submitIssueReport({
      issue: selectedIssue,
      productId,
      shopId: shopIdToUse,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success("Gracias por reportar el problema");
      setSelectedIssue("");
      setSelectedShopId("");
      setOpen(false);
    } else {
      toast.error(result.error || "Error al reportar el problema");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedIssue("");
      setSelectedShopId("");
    }
  };

  const issueEntries = Object.entries(ISSUE_LABELS) as [ProductIssue, string][];

  const formContent = (
    <div className="flex flex-col gap-4">
      <RadioGroup
        value={selectedIssue}
        onValueChange={(value) => setSelectedIssue(value as ProductIssue)}
        className="gap-0"
      >
        {issueEntries.map(([issue, label], index) => (
          <div key={issue}>
            <div className="flex items-center space-x-3 py-4">
              <RadioGroupItem value={issue} id={issue} className="size-5" />
              <Label htmlFor={issue} className="cursor-pointer text-base">
                {label}
              </Label>
            </div>
            {index < issueEntries.length - 1 && <Separator />}
          </div>
        ))}
      </RadioGroup>

      {showShopSelector && (
        <div className="flex flex-col gap-2">
          <Label>¿En qué supermercado ocurre el problema?</Label>
          <Select value={selectedShopId} onValueChange={setSelectedShopId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un supermercado" />
            </SelectTrigger>
            <SelectContent>
              {shops.map((shop) => (
                <SelectItem key={shop.id} value={String(shop.id)}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const footerContent = (
    <>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !selectedIssue || (showShopSelector && !selectedShopId)}
      >
        {isSubmitting ? "Enviando..." : "Reportar problema"}
      </Button>
      {isMobile ? (
        <DrawerClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DrawerClose>
      ) : (
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange} repositionInputs={false}>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Reportar un problema</DrawerTitle>
            <DrawerDescription>
              Selecciona el tipo de problema que has encontrado con este producto.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">{formContent}</div>
          <DrawerFooter>{footerContent}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reportar un problema</DialogTitle>
          <DialogDescription>
            Selecciona el tipo de problema que has encontrado con este producto.
          </DialogDescription>
        </DialogHeader>
        {formContent}
        <DialogFooter>{footerContent}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

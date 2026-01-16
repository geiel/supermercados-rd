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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUser } from "@/hooks/use-user";
import {
  submitCategorySuggestion,
  type CategorySuggestionType,
} from "@/lib/feedback";
import { toast } from "sonner";

type SuggestCategoryDrawerProps = {
  productId?: number;
  children: React.ReactNode;
};

const SUGGESTION_TYPE_LABELS: Record<CategorySuggestionType, string> = {
  new_category: "Sugerir una nueva categoría",
  add_product_to_category: "Agregar producto a una categoría existente",
};

export function SuggestCategoryDrawer({
  productId,
  children,
}: SuggestCategoryDrawerProps) {
  const { user } = useUser();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  
  // If no productId, default to "new_category" since "add to category" doesn't make sense
  const hasProduct = typeof productId === "number";
  const [suggestionType, setSuggestionType] = useState<CategorySuggestionType | "">(
    hasProduct ? "" : "new_category"
  );
  const [categoryName, setCategoryName] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!suggestionType) {
      toast.error("Por favor, selecciona un tipo de sugerencia");
      return;
    }

    if (!categoryName.trim()) {
      toast.error("Por favor, escribe el nombre de la categoría");
      return;
    }

    setIsSubmitting(true);

    const result = await submitCategorySuggestion({
      type: suggestionType,
      suggestedName: categoryName.trim(),
      productId,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success("¡Gracias por tu sugerencia!");
      resetForm();
      setOpen(false);
    } else {
      toast.error(result.error || "Error al enviar la sugerencia");
    }
  };

  const resetForm = () => {
    setSuggestionType(hasProduct ? "" : "new_category");
    setCategoryName("");
    setNotes("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setEmail(user?.email || "");
    }
    if (!newOpen) {
      resetForm();
    }
  };

  const getCategoryInputLabel = () => {
    if (suggestionType === "new_category") {
      return "Nombre de la nueva categoría";
    }
    return "Nombre de la categoría";
  };

  const getCategoryInputPlaceholder = () => {
    if (suggestionType === "new_category") {
      return "Ej: Productos sin gluten, Alimentos orgánicos...";
    }
    return "Ej: Leches, Cereales, Limpieza...";
  };

  const formContent = (
    <div className="flex flex-col gap-4">
      {hasProduct && (
        <RadioGroup
          value={suggestionType}
          onValueChange={(value) => setSuggestionType(value as CategorySuggestionType)}
          className="gap-3"
        >
          {(Object.entries(SUGGESTION_TYPE_LABELS) as [CategorySuggestionType, string][]).map(
            ([type, label]) => (
              <div key={type} className="flex items-center space-x-3">
                <RadioGroupItem value={type} id={type} className="size-5" />
                <Label htmlFor={type} className="cursor-pointer text-base">
                  {label}
                </Label>
              </div>
            )
          )}
        </RadioGroup>
      )}

      {suggestionType && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-name">{getCategoryInputLabel()}</Label>
            <Input
              id="category-name"
              placeholder={getCategoryInputPlaceholder()}
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notas adicionales (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="¿Algún comentario adicional sobre tu sugerencia?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Correo electrónico (opcional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Si deseas que te contactemos sobre tu sugerencia.
            </p>
          </div>
        </>
      )}
    </div>
  );

  const footerContent = (
    <>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !suggestionType || !categoryName.trim()}
      >
        {isSubmitting ? "Enviando..." : "Enviar sugerencia"}
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
            <DrawerTitle>Sugerir categoría</DrawerTitle>
            <DrawerDescription>
              Ayúdanos a mejorar nuestras categorías con tu sugerencia.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 max-h-[60vh] overflow-y-auto">{formContent}</div>
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
          <DialogTitle>Sugerir categoría</DialogTitle>
          <DialogDescription>
            Ayúdanos a mejorar nuestras categorías con tu sugerencia.
          </DialogDescription>
        </DialogHeader>
        {formContent}
        <DialogFooter>{footerContent}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

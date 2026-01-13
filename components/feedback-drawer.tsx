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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-user";
import { useIsMobile } from "@/hooks/use-mobile";
import { submitFeedback } from "@/lib/feedback";
import { toast } from "sonner";

const MAX_CHARACTERS = 2499;

type FeedbackDrawerProps = {
  productId?: number;
  children: React.ReactNode;
};

export function FeedbackDrawer({ productId, children }: FeedbackDrawerProps) {
  const { user } = useUser();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const characterCount = feedbackText.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      toast.error("Por favor, escribe tu comentario");
      return;
    }

    if (isOverLimit) {
      toast.error(`El comentario no puede exceder ${MAX_CHARACTERS} caracteres`);
      return;
    }

    setIsSubmitting(true);

    const result = await submitFeedback({
      feedback: feedbackText.trim(),
      email: email.trim() || undefined,
      productId,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success("Gracias por tu comentario");
      setFeedbackText("");
      setOpen(false);
    } else {
      toast.error(result.error || "Error al enviar el comentario");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setEmail(user?.email || "");
    }
  };

  const formContent = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="feedback">Comentario</Label>
        <Textarea
          id="feedback"
          placeholder="Escribe tu comentario aquí..."
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          className="min-h-[120px]"
        />
        <div
          className={`text-xs text-right ${
            isOverLimit ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {characterCount}/{MAX_CHARACTERS}
        </div>
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
          Si deseas que te contactemos, proporciona tu correo.
        </p>
      </div>
    </div>
  );

  const footerContent = (
    <>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !feedbackText.trim() || isOverLimit}
      >
        {isSubmitting ? "Enviando..." : "Enviar comentario"}
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
            <DrawerTitle>Enviar comentario</DrawerTitle>
            <DrawerDescription>
              Comparte tus sugerencias o comentarios sobre este producto.
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
          <DialogTitle>Enviar comentario</DialogTitle>
          <DialogDescription>
            Comparte tus sugerencias o comentarios sobre este producto.
          </DialogDescription>
        </DialogHeader>
        {formContent}
        <DialogFooter>{footerContent}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

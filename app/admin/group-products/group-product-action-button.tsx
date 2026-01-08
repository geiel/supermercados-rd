"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type GroupProductActionButtonProps = {
  label: string;
  variant: "outline" | "destructive";
  disabled?: boolean;
};

export function GroupProductActionButton({
  label,
  variant,
  disabled,
}: GroupProductActionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button variant={variant} size="xs" disabled={disabled || pending}>
      {label}
    </Button>
  );
}

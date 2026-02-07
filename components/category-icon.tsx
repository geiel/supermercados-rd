import type { ComponentType } from "react";
import Image from "next/image";
import * as LucideIcons from "lucide-react";

import { cn } from "@/lib/utils";

const FALLBACK_ICON = LucideIcons.Folder;

type CategoryIconProps = {
  icon: string | null | undefined;
  className?: string;
};

function toPascalCase(value: string) {
  return value
    .trim()
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function isImageLike(value: string) {
  return (
    value.startsWith("http") ||
    value.startsWith("/") ||
    /\.(svg|png|jpg|jpeg|webp|gif)$/i.test(value)
  );
}

export function CategoryIcon({ icon, className }: CategoryIconProps) {
  if (!icon) {
    const Icon = FALLBACK_ICON;
    return <Icon className={cn("size-5", className)} />;
  }

  const iconName = toPascalCase(icon);
  const Icon =
    (LucideIcons as Record<string, ComponentType<{ className?: string }>>)[
      iconName
    ] ?? null;

  if (Icon) {
    return <Icon className={cn("size-5", className)} />;
  }

  if (isImageLike(icon)) {
    return (
      <Image
        src={icon}
        alt=""
        width={20}
        height={20}
        className={cn("size-5 object-contain", className)}
        unoptimized
      />
    );
  }

  if (icon.length <= 2 && /[^a-zA-Z0-9]/.test(icon)) {
    return <span className={cn("text-base", className)}>{icon}</span>;
  }

  const FallbackIcon = FALLBACK_ICON;
  return <FallbackIcon className={cn("size-5", className)} />;
}

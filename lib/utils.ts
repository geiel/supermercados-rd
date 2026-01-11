import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeForTsQuery(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-zA-Z0-9\s]/g, " ") // strip punctuation/parentheses
    .trim()
    .toLowerCase();
}

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // Remove accents
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // Remove invalid chars
    .trim()
    .replace(/\s+/g, "-"); // Replace spaces with hyphens
}

export function formatDropPercentage(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "0";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  if (numeric > 0 && numeric < 1) {
    return "<1";
  }

  return String(Math.round(numeric));
}

export function isToday(d: Date): boolean {
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function isNumeric(value: string): boolean {
  const n = Number(value);
  return value.trim() !== "" && !isNaN(n) && isFinite(n);
}

export function getShopsIds(shops: string | undefined | null) {
  if (!shops) {
    return [];
  }

  return shops.split(",").map(shop => shop.replace(/\D/g, "")).map(Number);
} 

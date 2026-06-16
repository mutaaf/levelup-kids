import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combine class strings with tailwind-merge precedence. Used by shadcn primitives. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
/**
 * Utility function for building className strings.
 *
 * - Uses `clsx` to conditionally join class values together (strings, arrays, objects).
 * - Passes the result through `tailwind-merge` to automatically
 *   remove duplicate or conflicting Tailwind classes (e.g. "p-2 p-4" → "p-4").
 *
 * Example:
 *   cn("p-2", isActive && "bg-blue-500", "p-4")
 *   // => "bg-blue-500 p-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Truncates a bigint ID to 8 digits for display purposes
 * @param id - The bigint ID to truncate
 * @returns A string representation of the last 8 digits of the ID
 */
export function truncateId(id: bigint): string {
  const idStr = id.toString();
  if (idStr.length <= 8) {
    return idStr;
  }
  return idStr.slice(-8);
}

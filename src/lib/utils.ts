import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Calculate duration in days between check-in and check-out (or today if open-ended). Rounds up partial days. */
export function calculateDuration(checkInDate: string, checkOutDate: string | null): number {
  const start = new Date(checkInDate + 'T00:00:00');
  const end = checkOutDate ? new Date(checkOutDate + 'T00:00:00') : new Date();
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / 86400000));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

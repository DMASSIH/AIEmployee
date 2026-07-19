import clsx, { type ClassValue } from 'clsx';

/** Class-name combiner used by every component in the design system. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

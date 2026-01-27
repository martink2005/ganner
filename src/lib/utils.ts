import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility pre spájanie Tailwind tried s clsx
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function getAnimationDelay(index: number, baseDelay = 150) {
  return { animationDelay: `${index * baseDelay}ms` };
}


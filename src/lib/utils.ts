import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeDate(value: string | undefined | null, fallback?: Date): Date {
  if (!value) return fallback ?? new Date()
  const d = new Date(value)
  return isNaN(d.getTime()) ? (fallback ?? new Date()) : d
}

export function safeDateISO(value: string | undefined | null): string {
  return safeDate(value).toISOString()
}

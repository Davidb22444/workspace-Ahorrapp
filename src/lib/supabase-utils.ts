/**
 * Utility functions for converting between camelCase (API/JS convention)
 * and snake_case (Supabase/Postgres convention).
 */

// snake_case → camelCase
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

// camelCase → snake_case
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

// Convert all keys in an object (shallow) from snake_case to camelCase
export function keysToCamel<T = Record<string, unknown>>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = value
  }
  return result as T
}

// Convert all keys in an object (shallow) from camelCase to snake_case
export function keysToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value
  }
  return result
}

// Convert an array of objects' keys from snake_case to camelCase
export function rowsToCamel<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map(keysToCamel<T>)
}

// Sum a numeric field across rows (handles null)
export function sumField(rows: Record<string, unknown>[], field: string): number {
  return rows.reduce((sum, r) => sum + (Number(r[field]) || 0), 0)
}
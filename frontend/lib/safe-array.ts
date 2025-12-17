/**
 * Safe Array Utilities
 * Provides utilities to safely handle array operations when data might be undefined or error objects
 */

/**
 * Ensures the value is an array, returns empty array if not
 * @param value - Value to check
 * @returns The value if it's an array, empty array otherwise
 */
export function ensureArray<T>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Safely maps over an array-like value
 * @param value - Value to map over (may be undefined, null, or not an array)
 * @param callback - Map callback function
 * @returns Mapped array or empty array if value is not an array
 */
export function safeMap<T, R>(
  value: any,
  callback: (item: T, index: number, array: T[]) => R
): R[] {
  return ensureArray<T>(value).map(callback);
}

/**
 * Safely filters an array-like value
 * @param value - Value to filter (may be undefined, null, or not an array)
 * @param callback - Filter callback function
 * @returns Filtered array or empty array if value is not an array
 */
export function safeFilter<T>(
  value: any,
  callback: (item: T, index: number, array: T[]) => boolean
): T[] {
  return ensureArray<T>(value).filter(callback);
}

/**
 * Safely gets the length of an array-like value
 * @param value - Value to check (may be undefined, null, or not an array)
 * @returns Length of array or 0 if not an array
 */
export function safeLength(value: any): number {
  return ensureArray(value).length;
}

/**
 * Safely finds an item in an array-like value
 * @param value - Value to search (may be undefined, null, or not an array)
 * @param callback - Find callback function
 * @returns Found item or undefined
 */
export function safeFind<T>(
  value: any,
  callback: (item: T, index: number, array: T[]) => boolean
): T | undefined {
  return ensureArray<T>(value).find(callback);
}

/**
 * Safely reduces an array-like value
 * @param value - Value to reduce (may be undefined, null, or not an array)
 * @param callback - Reduce callback function
 * @param initialValue - Initial value for reduction
 * @returns Reduced value
 */
export function safeReduce<T, R>(
  value: any,
  callback: (accumulator: R, item: T, index: number, array: T[]) => R,
  initialValue: R
): R {
  return ensureArray<T>(value).reduce(callback, initialValue);
}

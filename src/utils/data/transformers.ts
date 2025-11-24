/**
 * Data transformation utilities
 */

/**
 * Helper function to get array value (first element if array, otherwise the value itself)
 */
export function getValue(field: unknown): string | string[] {
  if (Array.isArray(field)) {
    return field.length > 0 ? field.map(String) : [];
  }
  return field ? String(field) : '';
}


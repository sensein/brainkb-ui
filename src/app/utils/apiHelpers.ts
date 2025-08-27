import { Activity } from "../../types/types";

/**
 * Type guard to check if a value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if a value is a valid API response with data property
 */
export function hasDataProperty(value: unknown): value is { data: unknown } {
  return typeof value === 'object' && value !== null && 'data' in value;
}

/**
 * Safely extracts data from API response
 * Handles both { data: [...] } and direct array responses
 */
export function extractApiData<T>(response: unknown): T[] {
  if (isArray(response)) {
    return response as T[];
  }
  
  if (hasDataProperty(response)) {
    const data = response.data;
    if (isArray(data)) {
      return data as T[];
    }
  }
  
  console.warn("Unexpected API response format:", response);
  return [];
}

/**
 * Type guard for user activity data
 */
export function isValidActivityData(data: unknown): data is Activity[] {
  return isArray(data) && data.every(item => 
    typeof item === 'object' && 
    item !== null &&
    'id' in item &&
    'activity_type' in item &&
    'description' in item &&
    'created_at' in item
  );
}

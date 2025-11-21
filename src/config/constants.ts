/**
 * Application-wide constants
 */

export const CACHE_DURATIONS = {
  SHORT: 60 * 60, // 1 hour
  MEDIUM: 4 * 60 * 60, // 4 hours
  LONG: 24 * 60 * 60, // 24 hours
} as const;

export const DEFAULT_PAGINATION = {
  LIMIT: '50',
  SKIP: '0',
  SEARCH_LIMIT: 100,
  MAX_SEARCH_PAGES: 50,
} as const;

export const TOKEN_CACHE_DURATION = 60 * 60; // 1 hour


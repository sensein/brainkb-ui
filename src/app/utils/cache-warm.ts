/**
 * Utility to check for and use pre-warmed cache data from build time
 */

import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.next', 'cache', 'brainkb-warm');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function getWarmedCache<T>(cacheKey: string): T | null {
  try {
    // Check if cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      console.log(`[Cache] Directory does not exist: ${CACHE_DIR}`);
      return null;
    }
    
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
    
    if (!fs.existsSync(cacheFile)) {
      // Don't log - missing cache files are expected for queries not pre-warmed
      return null;
    }
    
    const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const now = Date.now();
    
    // Check if cache is still valid (within 24 hours)
    if (cacheData.timestamp && (now - cacheData.timestamp < CACHE_DURATION)) {
      // Only log in development to reduce noise
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Cache] Using pre-warmed cache for: ${cacheKey}`);
      }
      // For KB cache files, they have {data, headers, pageTitle, ...} structure
      // Return the whole object (not just cacheData.data) so all fields are available
      // The API route will extract what it needs
      return cacheData;
    }
    
    // Cache expired - don't log, just return null
    return null;
  } catch (error) {
    // Log error for debugging
    console.error(`[Cache] Error reading cache for ${cacheKey}:`, error);
    return null;
  }
}


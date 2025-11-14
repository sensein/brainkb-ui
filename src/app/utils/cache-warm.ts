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
      return null;
    }
    
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
    
    if (!fs.existsSync(cacheFile)) {
      return null;
    }
    
    const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const now = Date.now();
    
    // Check if cache is still valid (within 24 hours)
    if (cacheData.timestamp && (now - cacheData.timestamp < CACHE_DURATION)) {
      // Return data if it's wrapped, otherwise return the whole object
      return cacheData.data !== undefined ? cacheData.data : cacheData;
    }
    
    // Cache expired
    return null;
  } catch (error) {
    // Silently fail - cache warming is optional
    return null;
  }
}


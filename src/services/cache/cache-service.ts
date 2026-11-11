/**
 * Centralized cache management service
 */
import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import { CACHE_DURATIONS } from '@/src/config/constants';

export class CacheService {
  /**
   * Create a cached function with standardized configuration
   */
  static createCache<T>(
    fn: () => Promise<T>,
    key: string,
    tags: string[],
    duration: number = CACHE_DURATIONS.MEDIUM
  ) {
    return unstable_cache(fn, [key], {
      revalidate: duration,
      tags,
    });
  }

  /**
   * Invalidate cache by tags. `{ expire: 0 }` expires them at once, as
   * revalidateTag did before Next 16 made the profile argument required.
   */
  static async invalidateTags(tags: string[]): Promise<void> {
    try {
      tags.forEach((tag) => {
        revalidateTag(tag, { expire: 0 });
      });
    } catch (error) {
      console.error('[CacheService] Error invalidating cache tags:', error);
      // Don't throw - cache invalidation failures shouldn't break the app
    }
  }

  /**
   * Invalidate a single cache tag
   */
  static async invalidateTag(tag: string): Promise<void> {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (error) {
      console.error('[CacheService] Error invalidating cache tag:', error);
    }
  }
}


import { Injectable, Logger } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";

@Injectable()
export class UserStatusCacheService {
  private readonly logger = new Logger(UserStatusCacheService.name);
  private readonly CACHE_TTL = 240; // 4 minutes (fresh)
  private readonly CACHE_GRACE_PERIOD = 60; // 1 minute (stale)
  private readonly LOCK_TTL = 2; // 2 seconds lock timeout

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Generate cache key for following users status
   */
  private getCacheKey(userId: string, page: number): string {
    return `user-status:following:${userId}:page:${page}`;
  }

  /**
   * Generate lock key
   */
  private getLockKey(userId: string, page: number): string {
    return `${this.getCacheKey(userId, page)}:lock`;
  }

  /**
   * Get cached following users status
   */
  async getCachedFollowingStatus<T = Record<string, unknown>>(
    userId: string,
    page: number,
  ): Promise<{
    data: T;
    isStale: boolean;
  } | null> {
    try {
      const cacheKey = this.getCacheKey(userId, page);
      const cached = await this.redis.get(cacheKey);

      if (!cached) {
        this.logger.log(`❌ Cache MISS: ${cacheKey}`);
        return null;
      }

      const data = JSON.parse(cached);
      const ttl = await this.redis.ttl(cacheKey);

      const isFresh = ttl > this.CACHE_GRACE_PERIOD;
      const isStale = ttl <= this.CACHE_GRACE_PERIOD && ttl > 0;

      if (isFresh) {
        this.logger.log(`✅ Cache HIT (fresh): ${cacheKey}, TTL: ${ttl}s`);
        return { data, isStale: false };
      } else if (isStale) {
        this.logger.log(`⚠️ Cache HIT (stale): ${cacheKey}, TTL: ${ttl}s`);
        return { data, isStale: true };
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Set cached following users status
   */
  async setCachedFollowingStatus(
    userId: string,
    page: number,
    data: unknown,
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(userId, page);
      const totalTTL = this.CACHE_TTL + this.CACHE_GRACE_PERIOD;

      await this.redis.setex(cacheKey, totalTTL, JSON.stringify(data));

      this.logger.log(
        `💾 Cache SET: ${cacheKey}, TTL: ${this.CACHE_TTL}s + ${this.CACHE_GRACE_PERIOD}s grace`,
      );
    } catch (error) {
      this.logger.error(`Error setting cache: ${error.message}`);
    }
  }

  /**
   * Acquire lock for cache update
   */
  async acquireLock(userId: string, page: number): Promise<boolean> {
    try {
      const lockKey = this.getLockKey(userId, page);
      const acquired = await this.redis.set(
        lockKey,
        "1",
        "EX",
        this.LOCK_TTL,
        "NX",
      );

      if (acquired) {
        this.logger.log(`🔒 Lock ACQUIRED: ${lockKey}`);
        return true;
      }

      this.logger.log(`❌ Lock FAILED: ${lockKey} (already held)`);
      return false;
    } catch (error) {
      this.logger.error(`Error acquiring lock: ${error.message}`);
      return false;
    }
  }

  /**
   * Release lock
   */
  async releaseLock(userId: string, page: number): Promise<void> {
    try {
      const lockKey = this.getLockKey(userId, page);
      await this.redis.del(lockKey);
      this.logger.log(`🔓 Lock RELEASED: ${lockKey}`);
    } catch (error) {
      this.logger.error(`Error releasing lock: ${error.message}`);
    }
  }

  /**
   * Wait for cache to be available (with timeout)
   */
  async waitForCache<T = Record<string, unknown>>(
    userId: string,
    page: number,
  ): Promise<{
    data: T;
    isStale: boolean;
  } | null> {
    const cacheKey = this.getCacheKey(userId, page);
    const maxWait = 3000; // 3 seconds max wait
    const checkInterval = 100; // Check every 100ms
    let waited = 0;

    this.logger.log(`⏳ Waiting for cache: ${cacheKey}`);

    while (waited < maxWait) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.log(`✅ Cache available after ${waited}ms: ${cacheKey}`);
        const data = JSON.parse(cached);
        const ttl = await this.redis.ttl(cacheKey);
        const isStale = ttl <= this.CACHE_GRACE_PERIOD && ttl > 0;
        return { data, isStale };
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    this.logger.warn(`⏱️ Cache wait timeout: ${cacheKey}`);
    return null;
  }

  /**
   * Invalidate cache for a specific user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const pattern = `user-status:following:${userId}:page:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(
          `🗑️ Invalidated ${keys.length} cache keys for user ${userId}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error invalidating cache: ${error.message}`);
    }
  }

  /**
   * Invalidate specific page cache
   */
  async invalidatePageCache(userId: string, page: number): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(userId, page);
      await this.redis.del(cacheKey);
      this.logger.log(`🗑️ Invalidated cache: ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Error invalidating page cache: ${error.message}`);
    }
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";

export interface CachedMessagesData {
  items: unknown[];
  metadata: {
    page: number;
    limit: number;
    total: number;
    is_last_page: boolean;
  };
  cachedAt: number;
}

@Injectable()
export class DirectMessagingCacheService {
  private readonly logger = new Logger(DirectMessagingCacheService.name);

  // Cache configuration
  private readonly MESSAGE_CACHE_TTL = 3600; // 1 hour (fresh data)
  private readonly STALE_GRACE_PERIOD = 60; // 1 minute (serve stale data during this time)
  private readonly MAX_LOCK_WAIT_TIME = 5000; // 5 seconds max wait for lock
  private readonly LOCK_TTL = 10; // 10 seconds lock expiry

  // Metrics
  private cacheHits = 0;
  private cacheMisses = 0;
  private staleHits = 0;

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Generate cache key for conversation messages
   */
  private getConversationMessagesKey(
    conversationId: string,
    page: number,
  ): string {
    return `dm:conversation:${conversationId}:messages:page:${page}`;
  }

  /**
   * Generate lock key for preventing cache stampede
   */
  private getLockKey(conversationId: string, page: number): string {
    return `dm:conversation:${conversationId}:messages:page:${page}:lock`;
  }

  /**
   * Get cached messages with stale-while-revalidate strategy
   *
   * Flow:
   * 1. Check if cache exists
   * 2. If fresh → return immediately
   * 3. If stale (expired but within grace period) → return stale + refresh in background
   * 4. If missing → return null (caller will fetch from DB)
   */
  async getCachedMessages(
    conversationId: string,
    page: number,
  ): Promise<{ data: CachedMessagesData; isStale: boolean } | null> {
    try {
      const key = this.getConversationMessagesKey(conversationId, page);
      const cached = await this.redis.get(key);

      if (!cached) {
        this.cacheMisses++;
        this.logger.log(
          `❌ Cache MISS: ${key} (Hit rate: ${this.getHitRate()}%)`,
        );
        return null;
      }

      const parsedData: CachedMessagesData = JSON.parse(cached);
      const age = Date.now() - parsedData.cachedAt;
      const ttlMs = this.MESSAGE_CACHE_TTL * 1000;

      // Fresh cache - return immediately
      if (age <= ttlMs) {
        this.cacheHits++;
        this.logger.log(
          `✅ Cache HIT (fresh): ${key}, age: ${Math.round(age / 1000)}s (Hit rate: ${this.getHitRate()}%)`,
        );
        return { data: parsedData, isStale: false };
      }

      // Stale cache (within grace period) - return stale data
      const graceMs = this.STALE_GRACE_PERIOD * 1000;
      if (age <= ttlMs + graceMs) {
        this.staleHits++;
        this.logger.warn(
          `⚠️  Cache HIT (stale): ${key}, age: ${Math.round(age / 1000)}s, will refresh in background`,
        );
        return { data: parsedData, isStale: true };
      }

      // Too old - treat as miss
      this.cacheMisses++;
      this.logger.log(
        `❌ Cache EXPIRED: ${key}, age: ${Math.round(age / 1000)}s (Hit rate: ${this.getHitRate()}%)`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `❌ Error getting cache for conversation ${conversationId} page ${page}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Set messages cache with TTL
   */
  async setCachedMessages(
    conversationId: string,
    page: number,
    data: Omit<CachedMessagesData, "cachedAt">,
  ): Promise<void> {
    try {
      const key = this.getConversationMessagesKey(conversationId, page);
      const cacheData: CachedMessagesData = {
        ...data,
        cachedAt: Date.now(),
      };

      // Use SETEX to set value with TTL in one atomic operation
      await this.redis.setex(
        key,
        this.MESSAGE_CACHE_TTL + this.STALE_GRACE_PERIOD, // TTL includes grace period
        JSON.stringify(cacheData),
      );

      this.logger.log(
        `💾 Cache SET: ${key}, TTL: ${this.MESSAGE_CACHE_TTL}s + ${this.STALE_GRACE_PERIOD}s grace`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error setting cache for conversation ${conversationId} page ${page}: ${error.message}`,
      );
    }
  }

  /**
   * Invalidate specific page cache
   * Used when: new message sent, message deleted, message edited
   */
  async invalidateConversationPageCache(
    conversationId: string,
    page: number,
  ): Promise<void> {
    try {
      const key = this.getConversationMessagesKey(conversationId, page);
      await this.redis.del(key);
      this.logger.log(`🗑️  Cache INVALIDATED: ${key}`);
    } catch (error) {
      this.logger.error(
        `❌ Error invalidating page cache for conversation ${conversationId} page ${page}: ${error.message}`,
      );
    }
  }

  /**
   * Invalidate all pages cache for a conversation
   * Used when: major changes (bulk delete, conversation settings changed)
   */
  async invalidateConversationCache(conversationId: string): Promise<void> {
    try {
      const pattern = `dm:conversation:${conversationId}:messages:page:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(
          `🗑️  Cache INVALIDATED: ${keys.length} keys for conversation ${conversationId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Error invalidating conversation cache for ${conversationId}: ${error.message}`,
      );
    }
  }

  /**
   * Acquire distributed lock to prevent cache stampede
   * Uses Redis SETNX (SET if Not eXists) for atomic lock acquisition
   *
   * Returns: true if lock acquired, false otherwise
   */
  async acquireLock(conversationId: string, page: number): Promise<boolean> {
    try {
      const lockKey = this.getLockKey(conversationId, page);

      // SETNX returns 'OK' if key was set (lock acquired)
      // Returns null if key already exists (lock held by another process)
      const result = await this.redis.set(
        lockKey,
        Date.now().toString(),
        "EX", // Expiry
        this.LOCK_TTL, // TTL in seconds
        "NX", // Only set if Not eXists
      );

      if (result === "OK") {
        this.logger.log(`🔒 Lock ACQUIRED: ${lockKey}`);
        return true;
      }

      this.logger.log(`⏳ Lock BUSY: ${lockKey}`);
      return false;
    } catch (error) {
      this.logger.error(
        `❌ Error acquiring lock for conversation ${conversationId} page ${page}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Release distributed lock
   */
  async releaseLock(conversationId: string, page: number): Promise<void> {
    try {
      const lockKey = this.getLockKey(conversationId, page);
      await this.redis.del(lockKey);
      this.logger.log(`🔓 Lock RELEASED: ${lockKey}`);
    } catch (error) {
      this.logger.error(
        `❌ Error releasing lock for conversation ${conversationId} page ${page}: ${error.message}`,
      );
    }
  }

  /**
   * Wait for cache to be populated by another request
   * Used when lock is held by another process
   *
   * Flow:
   * 1. Wait 100ms
   * 2. Check if cache is now available
   * 3. Repeat up to maxWaitTime
   * 4. Return cache if found, null if timeout
   */
  async waitForCache(
    conversationId: string,
    page: number,
    maxWaitTime: number = this.MAX_LOCK_WAIT_TIME,
  ): Promise<CachedMessagesData | null> {
    const startTime = Date.now();
    const checkInterval = 100; // Check every 100ms

    while (Date.now() - startTime < maxWaitTime) {
      await this.sleep(checkInterval);

      const cached = await this.getCachedMessages(conversationId, page);
      if (cached && !cached.isStale) {
        this.logger.log(
          `✅ Got cache after waiting ${Date.now() - startTime}ms: conversation ${conversationId} page ${page}`,
        );
        return cached.data;
      }
    }

    this.logger.warn(
      `⚠️  Wait timeout (${maxWaitTime}ms) for conversation ${conversationId} page ${page}`,
    );
    return null;
  }

  /**
   * Get cache hit rate for monitoring
   */
  getHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? Math.round((this.cacheHits / total) * 100) : 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      staleHits: this.staleHits,
      total,
      hitRate: this.getHitRate(),
      staleRate: total > 0 ? Math.round((this.staleHits / total) * 100) : 0,
    };
  }

  /**
   * Reset cache statistics (for testing or periodic reset)
   */
  resetStats() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.staleHits = 0;
    this.logger.log("📊 Cache stats reset");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

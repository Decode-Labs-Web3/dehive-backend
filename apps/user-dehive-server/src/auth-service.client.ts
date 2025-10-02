import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

export interface UserProfile {
  _id: string;
  username: string;
  display_name?: string;
  email: string;
  avatar?: string;
  bio?: string;
  created_at?: Date;
}

/**
 * Client to fetch user profiles from Auth Service with Redis caching
 *
 * Cache Strategy:
 * - Individual profiles: 15 minutes TTL
 * - Batch operations optimized with pipeline
 *
 * Usage:
 * - getUserProfile(userId): Get single profile
 * - batchGetProfiles(userIds): Get multiple profiles efficiently
 * - invalidateUserProfile(userId): Clear cache when needed
 */
@Injectable()
export class AuthServiceClient {
  private readonly logger = new Logger(AuthServiceClient.name);
  private readonly authServiceUrl: string;
  private readonly PROFILE_CACHE_TTL = 900; // 15 minutes
  private readonly PROFILE_CACHE_PREFIX = 'user_profile:';

  constructor(
    private readonly httpService: HttpService,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl =
      this.configService.get<string>('AUTH_SERVICE_URL') ||
      'http://localhost:4006';
  }

  /**
   * Get user profile with Redis caching
   * @param userId - User ID to fetch
   * @returns User profile data
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const cacheKey = `${this.PROFILE_CACHE_PREFIX}${userId}`;

    try {
      // 1. Check Redis cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for user profile: ${userId}`);
        return JSON.parse(cached);
      }

      // 2. Fetch from auth service
      this.logger.debug(
        `Cache miss for user profile: ${userId}, fetching from auth service`,
      );
      const response = await firstValueFrom(
        this.httpService.get<{
          success: boolean;
          data: UserProfile;
          message?: string;
        }>(`${this.authServiceUrl}/auth/profile/${userId}`, {
          timeout: 5000,
        }),
      );

      if (!response.data.success || !response.data.data) {
        this.logger.warn(`User profile not found in auth service: ${userId}`);
        return null;
      }

      const profile = response.data.data;

      // 3. Cache the result
      await this.redis.setex(
        cacheKey,
        this.PROFILE_CACHE_TTL,
        JSON.stringify(profile),
      );

      this.logger.debug(`Cached user profile: ${userId}`);
      return profile;
    } catch (error) {
      this.logger.error(
        `Failed to fetch user profile: ${userId}`,
        error instanceof Error ? error.stack : error,
      );
      return null;
    }
  }

  /**
   * Batch get user profiles with optimized caching
   * @param userIds - Array of user IDs
   * @returns Map of userId to profile
   */
  async batchGetProfiles(
    userIds: string[],
  ): Promise<Record<string, UserProfile>> {
    if (!userIds || userIds.length === 0) {
      return {};
    }

    const uniqueIds = [...new Set(userIds)];
    this.logger.debug(`Batch fetching ${uniqueIds.length} user profiles`);

    // 1. Check Redis cache for all IDs using pipeline
    const pipeline = this.redis.pipeline();
    uniqueIds.forEach((id) => {
      pipeline.get(`${this.PROFILE_CACHE_PREFIX}${id}`);
    });

    const cachedResults = await pipeline.exec();
    const profiles: Record<string, UserProfile> = {};
    const missingIds: string[] = [];

    // 2. Separate cached vs missing
    uniqueIds.forEach((id, idx) => {
      if (cachedResults && cachedResults[idx]) {
        const [err, data] = cachedResults[idx];
        if (!err && data) {
          try {
            profiles[id] = JSON.parse(data as string);
          } catch (parseError) {
            this.logger.error(`Failed to parse cached profile for ${id}`);
            missingIds.push(id);
          }
        } else {
          missingIds.push(id);
        }
      } else {
        missingIds.push(id);
      }
    });

    this.logger.debug(
      `Cache hits: ${Object.keys(profiles).length}, Cache misses: ${missingIds.length}`,
    );

    // 3. Fetch missing profiles
    if (missingIds.length > 0) {
      const fetchPromises = missingIds.map((id) =>
        this.getUserProfile(id).then((profile) => ({ id, profile })),
      );

      const results = await Promise.all(fetchPromises);

      results.forEach(({ id, profile }) => {
        if (profile) {
          profiles[id] = profile;
        }
      });
    }

    return profiles;
  }

  /**
   * Invalidate cached user profile
   * @param userId - User ID to invalidate
   */
  async invalidateUserProfile(userId: string): Promise<void> {
    const cacheKey = `${this.PROFILE_CACHE_PREFIX}${userId}`;
    await this.redis.del(cacheKey);
    this.logger.debug(`Invalidated cache for user profile: ${userId}`);
  }

  /**
   * Invalidate multiple user profiles
   * @param userIds - Array of user IDs
   */
  async invalidateUserProfiles(userIds: string[]): Promise<void> {
    if (!userIds || userIds.length === 0) {
      return;
    }

    const keys = userIds.map((id) => `${this.PROFILE_CACHE_PREFIX}${id}`);
    await this.redis.del(...keys);
    this.logger.debug(`Invalidated cache for ${userIds.length} user profiles`);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    keys: string[];
  }> {
    const keys = await this.redis.keys(`${this.PROFILE_CACHE_PREFIX}*`);
    return {
      totalKeys: keys.length,
      keys,
    };
  }
}

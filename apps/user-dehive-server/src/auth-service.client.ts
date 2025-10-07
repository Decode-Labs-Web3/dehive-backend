import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

export interface UserProfile {
  _id: string;
  username: string;
  display_name: string;
  avatar: string;
  bio?: string;
  status?: string;
  banner_color?: string;
  server_count?: number;
  last_login?: Date;
  primary_wallet?: string;
  following_number?: number;
  followers_number?: number;
  is_following?: boolean;
  is_follower?: boolean;
  is_blocked?: boolean;
  is_blocked_by?: boolean;
  mutual_followers_number?: number;
  mutual_followers_list?: string[];
  is_active?: boolean;
  last_account_deactivation?: Date;
  dehive_role?: string;
  role_subscription?: string;
}

@Injectable()
export class AuthServiceClient {
  private readonly logger = new Logger(AuthServiceClient.name);
  private readonly authServiceUrl: string;
  private readonly PROFILE_CACHE_PREFIX = 'user_profile:';
  private readonly PROFILE_CACHE_TTL = 300; // 5 minutes

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
   * Get user profile by user_dehive_id using auth service
   * @param userDehiveId - User Dehive ID to fetch
   * @param sessionId - Session ID for authentication
   * @param fingerprintHashed - Fingerprint for authentication
   * @returns User profile data
   */
  async getUserProfile(
    userDehiveId: string,
    sessionId: string,
    fingerprintHashed: string,
  ): Promise<UserProfile | null> {
    const cacheKey = `${this.PROFILE_CACHE_PREFIX}${userDehiveId}`;

    try {
      // 1. Check Redis cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for user profile: ${userDehiveId}`);
        return JSON.parse(cached);
      }

      // 2. Fetch from auth service
      this.logger.debug(
        `Cache miss for user profile: ${userDehiveId}, fetching from auth service`,
      );
      console.log('🔍 [AUTH CLIENT] Fetching profile for userDehiveId:', userDehiveId);
      console.log('🔍 [AUTH CLIENT] Auth service URL:', this.authServiceUrl);
      console.log('🔍 [AUTH CLIENT] Full URL:', `${this.authServiceUrl}/auth/profile/${userDehiveId}`);

      const response = await firstValueFrom(
        this.httpService.get<{
          success: boolean;
          data: UserProfile;
          message?: string;
        }>(`${this.authServiceUrl}/auth/profile/${userDehiveId}`, {
          headers: {
            'x-session-id': sessionId,
            'x-fingerprint-hashed': fingerprintHashed,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }),
      );

      console.log('🔍 [AUTH CLIENT] Response:', response.data);

      if (!response.data.success || !response.data.data) {
        this.logger.warn(`User profile not found in auth service: ${userDehiveId}`);
        return null;
      }

      const profile = response.data.data;

      // 3. Cache the result
      await this.redis.setex(
        cacheKey,
        this.PROFILE_CACHE_TTL,
        JSON.stringify(profile),
      );

      this.logger.debug(`Cached user profile: ${userDehiveId}`);
      return profile;
    } catch (error) {
      this.logger.error(
        `Failed to fetch user profile: ${userDehiveId}`,
        error instanceof Error ? error.stack : error,
      );
      return null;
    }
  }

  /**
   * Get current user profile using auth service
   * @param sessionId - Session ID for authentication
   * @param fingerprintHashed - Fingerprint for authentication
   * @returns Current user profile data
   */
  async getMyProfile(
    sessionId: string,
    fingerprintHashed: string,
  ): Promise<UserProfile | null> {
    const cacheKey = `${this.PROFILE_CACHE_PREFIX}me:${sessionId}`;

    try {
      // 1. Check Redis cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for my profile: ${sessionId}`);
        return JSON.parse(cached);
      }

      // 2. Fetch from auth service
      this.logger.debug(
        `Cache miss for my profile: ${sessionId}, fetching from auth service`,
      );
      console.log('🔍 [AUTH CLIENT] Fetching my profile for sessionId:', sessionId);

      const response = await firstValueFrom(
        this.httpService.get<{
          success: boolean;
          data: UserProfile;
          message?: string;
        }>(`${this.authServiceUrl}/auth/profile`, {
          headers: {
            'x-session-id': sessionId,
            'x-fingerprint-hashed': fingerprintHashed,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }),
      );

      console.log('🔍 [AUTH CLIENT] My Profile Response:', response.data);

      if (!response.data.success || !response.data.data) {
        this.logger.warn(`My profile not found in auth service: ${sessionId}`);
        return null;
      }

      const profile = response.data.data;

      // 3. Cache the result
      await this.redis.setex(
        cacheKey,
        this.PROFILE_CACHE_TTL,
        JSON.stringify(profile),
      );

      this.logger.debug(`Cached my profile: ${sessionId}`);
      return profile;
    } catch (error) {
      this.logger.error(
        `Failed to fetch my profile: ${sessionId}`,
        error instanceof Error ? error.stack : error,
      );
      return null;
    }
  }

  /**
   * Batch get user profiles with optimized caching
   * @param userIds - Array of user IDs
   * @param sessionId - Session ID for authentication
   * @param fingerprintHashed - Fingerprint for authentication
   * @returns Map of userId to profile
   */
  async getBatchUserProfiles(
    userIds: string[],
    sessionId: string,
    fingerprintHashed: string,
  ): Promise<Map<string, UserProfile>> {
    const result = new Map<string, UserProfile>();
    const uncachedIds: string[] = [];

    // 1. Check cache for all users
    for (const userId of userIds) {
      const cacheKey = `${this.PROFILE_CACHE_PREFIX}${userId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        result.set(userId, JSON.parse(cached));
      } else {
        uncachedIds.push(userId);
      }
    }

    // 2. Fetch uncached users from auth service
    if (uncachedIds.length > 0) {
      this.logger.debug(
        `Fetching ${uncachedIds.length} uncached profiles from auth service`,
      );

      // For now, fetch one by one. In the future, we could implement batch endpoint
      for (const userId of uncachedIds) {
        try {
          const profile = await this.getUserProfile(userId, sessionId, fingerprintHashed);
          if (profile) {
            result.set(userId, profile);
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch profile for user ${userId}:`, error);
        }
      }
    }

    return result;
  }

  /**
   * Clear cache for a specific user
   * @param userDehiveId - User Dehive ID to clear cache for
   */
  async clearUserCache(userDehiveId: string): Promise<void> {
    const cacheKey = `${this.PROFILE_CACHE_PREFIX}${userDehiveId}`;
    await this.redis.del(cacheKey);
    this.logger.debug(`Cleared cache for user: ${userDehiveId}`);
  }

  /**
   * Clear all profile caches
   */
  async clearAllProfileCaches(): Promise<void> {
    const keys = await this.redis.keys(`${this.PROFILE_CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.debug(`Cleared ${keys.length} profile caches`);
    }
  }
}

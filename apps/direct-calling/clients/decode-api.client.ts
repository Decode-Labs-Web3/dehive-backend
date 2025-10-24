import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { UserProfile } from "../interfaces/user-profile.interface";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";

@Injectable()
export class DecodeApiClient {
  private readonly logger = new Logger(DecodeApiClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    const host = this.configService.get<string>("DECODE_API_GATEWAY_HOST");
    const port = this.configService.get<number>("DECODE_API_GATEWAY_PORT");
    if (!host || !port) {
      throw new Error(
        "DECODE_API_GATEWAY_HOST and DECODE_API_GATEWAY_PORT must be set in .env file!",
      );
    }
    this.baseUrl = `http://${host}:${port}`;
  }

  async getUserProfile(
    sessionId: string,
    fingerprintHash: string,
    userDehiveId: string,
  ): Promise<UserProfile | null> {
    try {
      // Get access token from session
      const accessToken = await this.getAccessTokenFromSession(sessionId);
      if (!accessToken) {
        this.logger.warn(`Access token not found for session: ${sessionId}`);
        return null;
      }

      this.logger.log(
        `Calling Decode API: GET ${this.baseUrl}/users/profile/${userDehiveId}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<{ data: UserProfile }>(
          `${this.baseUrl}/users/profile/${userDehiveId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-fingerprint-hashed": fingerprintHash,
            },
          },
        ),
      );

      this.logger.log(
        `Decode API response: ${JSON.stringify(response.data, null, 2)}`,
      );
      this.logger.log(`Successfully retrieved user profile from Decode API.`);

      return response.data.data;
    } catch (error) {
      this.logger.error(`Error Response Status: ${error.response?.status}`);
      this.logger.error(
        `Error Response Data: ${JSON.stringify(error.response?.data)}`,
      );
      return null;
    }
  }

  /**
   * Get cached user profile from Redis
   * Returns minimal user data needed for call events (only 4 fields)
   * Returns null if not cached - no fallback data
   */
  async getCachedUserProfile(userDehiveId: string): Promise<{
    _id: string;
    username: string;
    display_name: string;
    avatar_ipfs_hash: string;
  } | null> {
    try {
      const cacheKey = `user_profile:${userDehiveId}`;
      const cachedData = await this.redis.get(cacheKey);

      if (!cachedData) {
        this.logger.warn(
          `[DIRECT-CALLING] No cached profile found for ${userDehiveId}`,
        );
        return null;
      }

      const profile = JSON.parse(cachedData);

      // Validate that we have all required fields
      if (!profile.username || !profile.display_name) {
        this.logger.warn(
          `[DIRECT-CALLING] Cached profile incomplete for ${userDehiveId}`,
        );
        return null;
      }

      this.logger.log(
        `[DIRECT-CALLING] Retrieved cached profile for ${userDehiveId}`,
      );

      return {
        _id: profile.user_dehive_id || userDehiveId,
        username: profile.username,
        display_name: profile.display_name,
        avatar_ipfs_hash: profile.avatar_ipfs_hash || profile.avatar || "",
      };
    } catch (error) {
      this.logger.error(
        `[DIRECT-CALLING] Error getting cached profile for ${userDehiveId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Cache user profile to Redis (called by HTTP API)
   * TTL: 1 hour
   */
  async cacheUserProfile(
    userDehiveId: string,
    sessionId: string,
    fingerprintHash: string,
  ): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(
        sessionId,
        fingerprintHash,
        userDehiveId,
      );

      if (!profile) {
        this.logger.warn(
          `[DIRECT-CALLING] Cannot cache - profile not found for ${userDehiveId}`,
        );
        return false;
      }

      const cacheKey = `user_profile:${userDehiveId}`;
      const cacheData = {
        user_dehive_id: userDehiveId,
        username: profile.username,
        display_name: profile.display_name,
        avatar_ipfs_hash: profile.avatar_ipfs_hash || "",
      };

      await this.redis.set(
        cacheKey,
        JSON.stringify(cacheData),
        "EX",
        3600, // 1 hour
      );

      this.logger.log(
        `[DIRECT-CALLING] Cached profile for ${userDehiveId} (1 hour TTL)`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `[DIRECT-CALLING] Error caching profile for ${userDehiveId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Cache caller's own profile from /users/profile/me
   * TTL: 1 hour
   */
  async cacheCallerProfile(
    sessionId: string,
    fingerprintHash: string,
  ): Promise<boolean> {
    try {
      // Get access token from session
      const accessToken = await this.getAccessTokenFromSession(sessionId);
      if (!accessToken) {
        this.logger.warn(
          `[DIRECT-CALLING] Access token not found for session: ${sessionId}`,
        );
        return false;
      }

      this.logger.log(
        `Calling Decode API: GET ${this.baseUrl}/users/profile/me`,
      );

      const response = await firstValueFrom(
        this.httpService.get<{ data: UserProfile }>(
          `${this.baseUrl}/users/profile/me`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-fingerprint-hashed": fingerprintHash,
            },
          },
        ),
      );

      const profile = response.data.data;
      if (!profile) {
        this.logger.warn(
          `[DIRECT-CALLING] Cannot cache - profile/me returned null`,
        );
        return false;
      }

      const cacheKey = `user_profile:${profile._id}`;
      const cacheData = {
        user_dehive_id: profile._id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_ipfs_hash: profile.avatar_ipfs_hash || "",
      };

      await this.redis.set(
        cacheKey,
        JSON.stringify(cacheData),
        "EX",
        3600, // 1 hour
      );

      this.logger.log(
        `[DIRECT-CALLING] Cached caller profile for ${profile._id} (1 hour TTL)`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `[DIRECT-CALLING] Error caching caller profile:`,
        error,
      );
      return false;
    }
  }

  private async getAccessTokenFromSession(
    sessionId: string,
  ): Promise<string | null> {
    try {
      const sessionKey = `session:${sessionId}`;
      const sessionRaw = await this.redis.get(sessionKey);
      if (!sessionRaw) return null;

      const sessionData = JSON.parse(sessionRaw);
      return sessionData?.access_token || null;
    } catch (error) {
      this.logger.error(
        `Failed to parse session data for key session:${sessionId}`,
        error,
      );
      return null;
    }
  }
}

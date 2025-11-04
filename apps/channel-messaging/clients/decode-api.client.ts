import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { UserProfile } from "../interfaces/user-profile.interface";
import { Wallet } from "../interfaces/wallet.interface";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";

@Injectable()
export class DecodeApiClient {
  private readonly logger = new Logger(DecodeApiClient.name);
  private readonly decodeApiUrl: string;

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
    this.decodeApiUrl = `http://${host}:${port}`;
  }

  async getUserProfile(
    sessionId: string,
    fingerprintHash: string,
    userDehiveId: string,
  ): Promise<Partial<UserProfile> | null> {
    try {
      // Get access token from session
      const accessToken = await this.getAccessTokenFromSession(sessionId);
      if (!accessToken) {
        this.logger.warn(`Access token not found for session: ${sessionId}`);
        return null;
      }

      this.logger.log(
        `Calling Decode API: GET ${this.decodeApiUrl}/users/profile/${userDehiveId}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<{ data: UserProfile }>(
          `${this.decodeApiUrl}/users/profile/${userDehiveId}`,
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

      const profileData = response.data.data;

      // Extract wallets array from Decode API response
      const walletsArray: Wallet[] =
        (profileData as { wallets?: Wallet[] }).wallets || [];

      return {
        ...profileData,
        wallets: walletsArray,
      };
    } catch (error) {
      this.logger.error(`Error Response Status: ${error.response?.status}`);
      this.logger.error(
        `Error Response Data: ${JSON.stringify(error.response?.data)}`,
      );
      return null;
    }
  }

  async batchGetProfiles(
    userDehiveIds: string[],
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<Record<string, Partial<UserProfile>>> {
    const profiles: Record<string, Partial<UserProfile>> = {};

    if (!sessionId || !fingerprintHash) {
      this.logger.warn(
        "Session ID or fingerprint hash not provided for batch profile fetch",
      );
      return profiles;
    }

    try {
      const accessToken = await this.getAccessTokenFromSession(sessionId);
      if (!accessToken) {
        this.logger.warn(`Access token not found for session: ${sessionId}`);
        return profiles;
      }

      // Batch fetch profiles from Decode API
      const profilePromises = userDehiveIds.map(async (userDehiveId) => {
        try {
          const profile = await this.getUserProfile(
            sessionId,
            fingerprintHash,
            userDehiveId,
          );
          if (profile) {
            profiles[userDehiveId] = profile;
            // Cache the profile for WebSocket usage (1 hour TTL)
            await this.cacheUserProfile(userDehiveId, profile);
          }
        } catch (error) {
          this.logger.error(
            `Failed to fetch profile for user ${userDehiveId}:`,
            error,
          );
        }
      });

      await Promise.all(profilePromises);

      this.logger.log(
        `Successfully fetched ${Object.keys(profiles).length} profiles out of ${userDehiveIds.length} requested`,
      );
      return profiles;
    } catch (error) {
      this.logger.error("Error in batch profile fetch:", error);
      return profiles;
    }
  }

  /**
   * Cache user profile in Redis for WebSocket usage
   * This ensures WebSocket can retrieve user data without needing session
   */
  private async cacheUserProfile(
    userDehiveId: string,
    profile: Partial<UserProfile>,
  ): Promise<void> {
    try {
      const cacheKey = `user_profile:${userDehiveId}`;
      const cacheData = {
        user_id: profile.user_id || userDehiveId,
        user_dehive_id: profile.user_dehive_id || userDehiveId,
        username: profile.username || `User_${userDehiveId}`,
        display_name: profile.display_name || `User_${userDehiveId}`,
        avatar: profile.avatar || null,
        avatar_ipfs_hash: profile.avatar_ipfs_hash || null,
        bio: profile.bio || null,
        wallets: profile.wallets || [],
      };

      // Cache for 1 hour (3600 seconds)
      await this.redis.setex(cacheKey, 3600, JSON.stringify(cacheData));
      this.logger.log(`Cached user profile for ${userDehiveId}`);
    } catch (error) {
      this.logger.error(
        `Error caching user profile for ${userDehiveId}:`,
        error,
      );
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

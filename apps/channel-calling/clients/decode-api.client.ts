import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { UserProfile } from "../interfaces/user-profile.interface";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";

@Injectable()
export class DecodeApiClient {
  private readonly logger = new Logger(DecodeApiClient.name);
  private readonly authBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    const authHost = this.configService.get<string>("DECODE_API_GATEWAY_HOST");
    const authPort = this.configService.get<number>("DECODE_API_GATEWAY_PORT");

    if (!authHost || !authPort) {
      throw new Error(
        "DECODE_API_GATEWAY_HOST and DECODE_API_GATEWAY_PORT must be set in .env file!",
      );
    }

    // Set auth URL only
    this.authBaseUrl = `http://${authHost}:${authPort}`;
  }

  async getUserProfile(
    sessionId: string,
    fingerprintHash: string,
    userDehiveId: string,
  ): Promise<UserProfile | null> {
    try {
      this.logger.log(
        `Getting user profile for ${userDehiveId} from decode API`,
      );

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.authBaseUrl}/api/user/profile/${userDehiveId}`,
          {
            headers: {
              "x-session-id": sessionId,
              "x-fingerprint-hashed": fingerprintHash,
            },
          },
        ),
      );

      if (response.data && response.data.success) {
        const profileData = response.data.data;

        // Map the response to UserProfile interface
        const profile: UserProfile = {
          _id: profileData._id || userDehiveId,
          username: profileData.username || "",
          display_name: profileData.display_name || "",
          avatar_ipfs_hash: profileData.avatar_ipfs_hash || "",
          bio: profileData.bio,
          status: profileData.status,
          banner_color: profileData.banner_color,
          server_count: profileData.server_count,
          last_login: profileData.last_login,
          primary_wallet: profileData.primary_wallet,
          following_number: profileData.following_number,
          followers_number: profileData.followers_number,
          is_following: profileData.is_following,
          is_follower: profileData.is_follower,
          is_blocked: profileData.is_blocked,
          is_blocked_by: profileData.is_blocked_by,
          mutual_followers_number: profileData.mutual_followers_number,
          mutual_followers_list: profileData.mutual_followers_list,
          is_active: profileData.is_active,
          last_account_deactivation: profileData.last_account_deactivation,
          dehive_role: profileData.dehive_role,
          role_subscription: profileData.role_subscription,
        };

        this.logger.log(
          `Successfully retrieved user profile for ${userDehiveId} from decode API`,
        );
        return profile;
      }

      this.logger.warn(
        `Failed to get user profile for ${userDehiveId} from decode API: ${response.data?.message || "Unknown error"}`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Error getting user profile for ${userDehiveId} from decode API:`,
        error,
      );
      return null;
    }
  }

  async getUsersByIds(
    userIds: string[],
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<AuthenticatedUser[]> {
    try {
      this.logger.log(`Getting users by IDs: ${userIds.join(", ")}`);

      if (!sessionId || !fingerprintHash) {
        this.logger.warn("Session ID or fingerprint hash not provided");
        return [];
      }

      // Get access token from session
      const accessToken = await this.getAccessTokenFromSession(sessionId);
      if (!accessToken) {
        this.logger.warn("Access token not available");
        return [];
      }

      // Call each user individually in parallel
      const userPromises = userIds.map(async (userId) => {
        try {
          const response = await firstValueFrom(
            this.httpService.get(
              `${this.authBaseUrl}/users/profile/${userId}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "x-fingerprint-hashed": fingerprintHash,
                },
              },
            ),
          );

          if (response.data && response.data.success) {
            const userData = response.data.data;
            return {
              _id: userData._id || userId,
              username: userData.username || "",
              display_name: userData.display_name || "",
              avatar_ipfs_hash: userData.avatar_ipfs_hash || "",
              bio: userData.bio || "",
              status: userData.status || "online",
              is_active: userData.is_active || false,
              session_id: "",
              fingerprint_hash: "",
            };
          }
          return null;
        } catch (error) {
          this.logger.error(`Error fetching user ${userId}:`, error);
          return null;
        }
      });

      const users = await Promise.all(userPromises);
      const validUsers = users.filter(
        (user) => user !== null,
      ) as AuthenticatedUser[];

      this.logger.log(
        `Successfully retrieved ${validUsers.length} users from decode API`,
      );

      return validUsers;
    } catch (error) {
      this.logger.error(`Error getting users from decode API:`, error);
      return [];
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
          `[CHANNEL-CALLING] No cached profile found for ${userDehiveId}`,
        );
        return null;
      }

      const profile = JSON.parse(cachedData);

      // Validate that we have all required fields
      if (!profile.username || !profile.display_name) {
        this.logger.warn(
          `[CHANNEL-CALLING] Cached profile incomplete for ${userDehiveId}`,
        );
        return null;
      }

      this.logger.log(
        `[CHANNEL-CALLING] Retrieved cached profile for ${userDehiveId}`,
      );

      return {
        _id:
          (profile as { user_dehive_id?: string }).user_dehive_id ||
          userDehiveId,
        username: profile.username,
        display_name: profile.display_name,
        avatar_ipfs_hash:
          profile.avatar_ipfs_hash ||
          (profile as { avatar?: string }).avatar ||
          "",
      };
    } catch (error) {
      this.logger.error(
        `[CHANNEL-CALLING] Error getting cached profile for ${userDehiveId}:`,
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
      // Fetch from Decode API
      const profile = await this.getUserProfile(
        sessionId,
        fingerprintHash,
        userDehiveId,
      );

      if (!profile) {
        this.logger.warn(
          `[CHANNEL-CALLING] Cannot cache - profile not found for ${userDehiveId}`,
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
        `[CHANNEL-CALLING] Cached profile for ${userDehiveId} (1 hour TTL)`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `[CHANNEL-CALLING] Error caching profile for ${userDehiveId}:`,
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

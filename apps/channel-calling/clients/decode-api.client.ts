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

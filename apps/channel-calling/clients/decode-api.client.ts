import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { UserProfile } from "../interfaces/user-profile.interface";
import { UserDehiveLean } from "../interfaces/user-dehive-lean.interface";

@Injectable()
export class DecodeApiClient {
  private readonly logger = new Logger(DecodeApiClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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
      this.logger.log(
        `Getting user profile for ${userDehiveId} from decode API`,
      );

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/user/profile/${userDehiveId}`,
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

  async getUsersByIds(userIds: string[]): Promise<UserDehiveLean[]> {
    try {
      this.logger.log(`Getting users by IDs: ${userIds.join(", ")}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/user/batch`, {
          user_ids: userIds,
        }),
      );

      if (response.data && response.data.success) {
        const users = response.data.data || [];

        this.logger.log(
          `Successfully retrieved ${users.length} users from decode API`,
        );

        return users.map((user: any) => ({
          _id: user._id,
          username: user.username || "",
          display_name: user.display_name || "",
          avatar_url: user.avatar_url || "",
        }));
      }

      this.logger.warn(
        `Failed to get users from decode API: ${response.data?.message || "Unknown error"}`,
      );
      return [];
    } catch (error) {
      this.logger.error(`Error getting users from decode API:`, error);
      return [];
    }
  }
}

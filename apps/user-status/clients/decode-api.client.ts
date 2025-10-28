import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { UserProfile } from "../interfaces/user-profile.interface";

@Injectable()
export class DecodeApiClient {
  private readonly logger = new Logger(DecodeApiClient.name);
  private readonly decodeApiUrl: string;
  private readonly directMessageUrl: string;
  private readonly userDehiveServerUrl: string;

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
    this.decodeApiUrl = `http://${host}:${port}`;

    // Direct message service for following list
    const dmHost = this.configService.get<string>("CLOUD_HOST") || "localhost";
    const dmPort =
      this.configService.get<number>("DIRECT_MESSAGE_PORT") || 4004;
    this.directMessageUrl = `http://${dmHost}:${dmPort}`;
    this.logger.log(
      `Direct-messaging service URL configured: ${this.directMessageUrl}`,
    );

    // User-dehive-server service for server members
    const serverHost =
      this.configService.get<string>("CLOUD_HOST") || "localhost";
    const serverPort =
      this.configService.get<number>("USER_DEHIVE_SERVER_PORT") || 4001;
    this.userDehiveServerUrl = `http://${serverHost}:${serverPort}`;
  }

  async getUserProfilePublic(
    userDehiveId: string,
  ): Promise<UserProfile | null> {
    try {
      this.logger.log(
        `Calling Decode API (public): GET ${this.decodeApiUrl}/users/profile/${userDehiveId}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<{ success: boolean; data: UserProfile }>(
          `${this.decodeApiUrl}/users/profile/${userDehiveId}`,
        ),
      );

      if (!response.data.success || !response.data.data) {
        this.logger.warn(`Profile not found for ${userDehiveId}`);
        return null;
      }

      const profile = response.data.data;

      return {
        _id: profile._id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_ipfs_hash: profile.avatar_ipfs_hash || "",
      };
    } catch (error) {
      this.logger.error(
        `Error fetching public profile for ${userDehiveId}:`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  async getBulkUserProfiles(
    userIds: string[],
  ): Promise<Map<string, UserProfile>> {
    const profileMap = new Map<string, UserProfile>();

    await Promise.all(
      userIds.map(async (userId) => {
        const profile = await this.getUserProfilePublic(userId);
        if (profile) {
          profileMap.set(userId, profile);
        }
      }),
    );

    return profileMap;
  }

  /**
   * Get following users for a specific user
   * Calls direct-messaging service
   * Returns empty array if cannot fetch (e.g., no auth credentials)
   */
  async getUserFollowing(
    userId: string,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<string[]> {
    // If no auth credentials, cannot fetch following list
    if (!sessionId || !fingerprintHash) {
      this.logger.warn(
        `No auth credentials provided for getUserFollowing(${userId}). Cannot fetch following list without authentication.`,
      );
      return [];
    }

    try {
      this.logger.log(
        `Fetching following list for user ${userId} from direct-messaging service`,
      );

      const url = `${this.directMessageUrl}/api/dm/following`;
      this.logger.log(`Calling: GET ${url}`);
      this.logger.log(
        `Headers: x-session-id=${sessionId}, x-fingerprint-hashed=${fingerprintHash}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<{
          success: boolean;
          data: {
            items: Array<{ user_id: string }>;
          };
        }>(url, {
          headers: {
            "x-session-id": sessionId,
            "x-fingerprint-hashed": fingerprintHash,
          },
          params: {
            page: 0,
            limit: 100,
          },
        }),
      );

      if (!response.data?.success || !response.data?.data?.items) {
        this.logger.warn(
          `Failed to fetch following list for user ${userId}: Invalid response structure`,
        );
        return [];
      }

      const followingIds = response.data.data.items.map((user) => user.user_id);
      this.logger.log(
        `Successfully fetched ${followingIds.length} following users for ${userId}`,
      );
      return followingIds;
    } catch (error) {
      // Check if it's a token expiry error
      if (error.response?.status === 401) {
        this.logger.warn(
          `Authentication failed for user ${userId}: Token expired or invalid. User needs to re-login. Skipping broadcast.`,
        );
      } else {
        this.logger.error(
          `Error fetching following list for user ${userId}:`,
          error.message,
        );
      }
      return [];
    }
  }

  /**
   * Get all members in a server from user-dehive-server service
   */
  async getServerMembers(
    serverId: string,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<string[]> {
    try {
      this.logger.log(
        `Getting members list for server ${serverId} from user-dehive-server service`,
      );

      const headers: Record<string, string> = {};
      if (sessionId) {
        headers["x-session-id"] = sessionId;
      }
      if (fingerprintHash) {
        headers["x-fingerprint-hashed"] = fingerprintHash;
      }

      const response = await firstValueFrom(
        this.httpService.get<{
          success: boolean;
          data: Array<{ _id: string }>;
        }>(
          `${this.userDehiveServerUrl}/api/memberships/server/${serverId}/members`,
          {
            headers,
          },
        ),
      );

      this.logger.log(
        `Raw response from user-dehive-server:`,
        JSON.stringify(response.data, null, 2),
      );

      if (!response.data.success || !response.data.data) {
        this.logger.warn(`Members list not found for server ${serverId}`);
        return [];
      }

      const memberIds = response.data.data.map((member) => member._id);

      this.logger.log(`Extracted memberIds: [${memberIds.join(", ")}]`);
      this.logger.log(
        `Found ${memberIds.length} members in server ${serverId}`,
      );

      return memberIds;
    } catch (error) {
      this.logger.error(
        `Error fetching members for server ${serverId}:`,
        error instanceof Error ? error.message : error,
      );
      return [];
    }
  }
}

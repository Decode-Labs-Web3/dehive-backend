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

  async getUserFollowing(
    userId: string,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<
    Array<{
      user_id: string;
      conversationid?: string;
      isCall?: boolean;
      lastMessageAt?: Date;
    }>
  > {
    if (!sessionId || !fingerprintHash) {
      this.logger.warn(
        `No auth credentials provided for getUserFollowing(${userId}). Cannot fetch following list without authentication.`,
      );
      return [];
    }

    try {
      const url = `${this.directMessageUrl}/api/dm/following-messages`;

      const response = await firstValueFrom(
        this.httpService.get<{
          success: boolean;
          data: {
            items: Array<{
              id: string;
              conversationid: string;
              displayname: string;
              username: string;
              avatar_ipfs_hash?: string;
              status: "online" | "offline";
              isCall: boolean;
              lastMessageAt?: string;
            }>;
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
          `Failed to fetch following messages for user ${userId}: Invalid response structure`,
        );
        return [];
      }

      const followingData = response.data.data.items.map((item) => ({
        user_id: item.id,
        conversationid: item.conversationid,
        isCall: item.isCall,
        lastMessageAt: item.lastMessageAt
          ? new Date(item.lastMessageAt)
          : undefined,
      }));

      this.logger.log(
        `Successfully fetched ${followingData.length} following messages for ${userId}`,
      );
      return followingData;
    } catch (error) {
      // Check if it's a token expiry error
      if (error.response?.status === 401) {
        this.logger.warn(
          `Authentication failed for user ${userId}: Token expired or invalid. User needs to re-login. Skipping broadcast.`,
        );
      } else {
        this.logger.error(
          `Error fetching following messages for user ${userId}:`,
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

      if (!response.data.success || !response.data.data) {
        this.logger.warn(`Members list not found for server ${serverId}`);
        return [];
      }

      const memberIds = response.data.data.map((member) => member._id);

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

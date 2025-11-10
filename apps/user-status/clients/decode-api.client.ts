import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import PQueue from "p-queue";
import { UserProfile } from "../interfaces/user-profile.interface";
import { Wallet } from "../interfaces/wallet.interface";

@Injectable()
export class DecodeApiClient {
  private readonly logger = new Logger(DecodeApiClient.name);
  private readonly decodeApiUrl: string;
  private readonly directMessageUrl: string;
  private readonly channelMessageUrl: string;
  private readonly serverUrl: string;
  private readonly userDehiveServerUrl: string;

  // Queue to control concurrent API requests
  private readonly queue = new PQueue({
    concurrency: 5, // Max 5 concurrent API calls
    interval: 1000,
    intervalCap: 15, // Max 15 calls per second
  });

  private profileCache = new Map<
    string,
    {
      data: UserProfile;
      timestamp: number;
    }
  >();
  private readonly PROFILE_CACHE_TTL = 60000; // 60 seconds

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

    const dmHost = this.configService.get<string>("CLOUD_HOST") || "localhost";
    const dmPort =
      this.configService.get<number>("DIRECT_MESSAGE_PORT") || 4004;
    this.directMessageUrl = `http://${dmHost}:${dmPort}`;
    this.logger.log(
      `Direct-messaging service URL configured: ${this.directMessageUrl}`,
    );

    const cmHost = this.configService.get<string>("CLOUD_HOST") || "localhost";
    const cmPort =
      this.configService.get<number>("CHANNEL_MESSAGING_PORT") || 4003;
    this.channelMessageUrl = `http://${cmHost}:${cmPort}`;
    this.logger.log(
      `Channel-messaging service URL configured: ${this.channelMessageUrl}`,
    );

    const srvHost = this.configService.get<string>("CLOUD_HOST") || "localhost";
    const srvPort = this.configService.get<number>("SERVER_PORT") || 4002;
    this.serverUrl = `http://${srvHost}:${srvPort}`;
    this.logger.log(`Server service URL configured: ${this.serverUrl}`);

    const serverHost =
      this.configService.get<string>("CLOUD_HOST") || "localhost";
    const serverPort =
      this.configService.get<number>("USER_DEHIVE_SERVER_PORT") || 4001;
    this.userDehiveServerUrl = `http://${serverHost}:${serverPort}`;
  }

  async getUserProfilePublic(
    userDehiveId: string,
  ): Promise<UserProfile | null> {
    const cached = this.getCachedProfile(userDehiveId);
    if (cached) {
      this.logger.debug(`💨 Memory cache HIT for profile ${userDehiveId}`);
      return cached;
    }

    const result = await this.queue.add(() =>
      this.fetchProfileWithRetry(userDehiveId),
    );
    return result ?? null;
  }

  private async fetchProfileWithRetry(
    userDehiveId: string,
    maxRetries = 3,
  ): Promise<UserProfile | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.get<{ success: boolean; data: UserProfile }>(
            `${this.decodeApiUrl}/users/profile/${userDehiveId}`,
            {
              timeout: 15000, // 15s timeout
            },
          ),
        );

        if (!response.data.success || !response.data.data) {
          this.logger.warn(`Profile not found for ${userDehiveId}`);
          return null;
        }

        const profile = response.data.data;

        // Extract wallets array from Decode API response
        const walletsArray: Wallet[] =
          (profile as { wallets?: Wallet[] }).wallets || [];

        const userProfile: UserProfile = {
          _id: profile._id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_ipfs_hash: profile.avatar_ipfs_hash || "",
          wallets: walletsArray,
        };

        // Cache to memory
        this.setCachedProfile(userDehiveId, userProfile);

        if (attempt > 1) {
          this.logger.log(
            `✅ Retry SUCCESS for ${userDehiveId} on attempt ${attempt}`,
          );
        }

        return userProfile;
      } catch (error) {
        const isTimeout =
          error.code === "ECONNABORTED" || error.message?.includes("timeout");

        if (attempt < maxRetries) {
          // Exponential backoff: 500ms, 1000ms, 2000ms
          const delayMs = 500 * Math.pow(2, attempt - 1);

          this.logger.warn(
            `⚠️ Attempt ${attempt}/${maxRetries} failed for ${userDehiveId} (${isTimeout ? "timeout" : error.message}), retrying in ${delayMs}ms...`,
          );

          await this.delay(delayMs);
        } else {
          this.logger.error(
            `❌ All ${maxRetries} attempts failed for ${userDehiveId}: ${error.message}`,
          );
        }
      }
    }

    // Graceful degradation: return null after all retries failed
    return null;
  }

  async getBulkUserProfiles(
    userIds: string[],
  ): Promise<Map<string, UserProfile>> {
    const profileMap = new Map<string, UserProfile>();

    this.logger.log(
      `🔄 Fetching ${userIds.length} profiles (queue size: ${this.queue.size}, pending: ${this.queue.pending})`,
    );

    const promises = userIds.map(async (userId) => {
      const profile = await this.getUserProfilePublic(userId);
      if (profile) {
        profileMap.set(userId, profile);
      }
    });

    await Promise.allSettled(promises);

    this.logger.log(
      `✅ Fetched ${profileMap.size}/${userIds.length} profiles successfully`,
    );

    return profileMap;
  }

  // Cache helper methods
  private getCachedProfile(userDehiveId: string): UserProfile | null {
    const cached = this.profileCache.get(userDehiveId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.PROFILE_CACHE_TTL) {
      this.profileCache.delete(userDehiveId);
      return null;
    }

    return cached.data;
  }

  private setCachedProfile(userDehiveId: string, data: UserProfile): void {
    this.profileCache.set(userDehiveId, {
      data,
      timestamp: Date.now(),
    });

    // Auto cleanup old cache entries if too many
    if (this.profileCache.size > 1000) {
      const oldestKey = this.profileCache.keys().next().value;
      this.profileCache.delete(oldestKey);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
   * Prewarm channel message cache by fetching messages from user's servers/channels
   * Similar to how direct-messaging prewarmes 50 conversations × 10 messages
   * This prewarmes up to 10 servers × 20 channels × 10 messages
   */
  async prewarmUserChannels(
    userId: string,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<void> {
    if (!sessionId || !fingerprintHash) {
      this.logger.warn(
        `No auth credentials provided for prewarmUserChannels(${userId}). Cannot prewarm without authentication.`,
      );
      return;
    }

    try {
      const headers = {
        "x-session-id": sessionId,
        "x-fingerprint-hashed": fingerprintHash,
      };

      // Step 1: Get user's servers from server service
      this.logger.log(`[Prewarm] Fetching servers for user ${userId}...`);
      const serversResponse = await firstValueFrom(
        this.httpService.get<{
          success: boolean;
          data: Array<{ _id: string; name: string }>;
        }>(`${this.serverUrl}/api/servers`, {
          headers,
          timeout: 5000,
        }),
      );

      if (!serversResponse.data?.success || !serversResponse.data?.data) {
        this.logger.warn(
          `[Prewarm] No servers found or failed to fetch for user ${userId}`,
        );
        return;
      }

      const servers = serversResponse.data.data.slice(0, 10); // Limit to 10 servers
      this.logger.log(
        `[Prewarm] Found ${serversResponse.data.data.length} servers, prewarming first ${servers.length} for user ${userId}`,
      );

      // Step 2: For each server, get channels and prewarm first page of messages
      for (const server of servers) {
        try {
          // Get channels for this server
          const channelsResponse = await firstValueFrom(
            this.httpService.get<{
              success: boolean;
              data: Array<{ _id: string; name: string; type: string }>;
            }>(`${this.serverUrl}/api/servers/${server._id}/channels`, {
              headers,
              timeout: 5000,
            }),
          );

          if (!channelsResponse.data?.success || !channelsResponse.data?.data) {
            this.logger.warn(
              `[Prewarm] No channels found for server ${server._id}`,
            );
            continue;
          }

          const channels = channelsResponse.data.data.slice(0, 20); // Limit to 20 channels per server
          this.logger.log(
            `[Prewarm] Server ${server.name}: Found ${channelsResponse.data.data.length} channels, prewarming first ${channels.length}`,
          );

          // Step 3: For each channel, fetch first page of messages (triggers cache population)
          for (const channel of channels) {
            try {
              await firstValueFrom(
                this.httpService.get(
                  `${this.channelMessageUrl}/api/messages/channel/${channel._id}`,
                  {
                    headers,
                    params: {
                      page: 0,
                      limit: 10,
                    },
                    timeout: 5000,
                  },
                ),
              );
              this.logger.debug(
                `[Prewarm] ✓ Prewarmed channel ${channel.name} (${channel._id})`,
              );
            } catch (channelError) {
              this.logger.debug(
                `[Prewarm] Failed to prewarm channel ${channel._id}:`,
                channelError instanceof Error
                  ? channelError.message
                  : channelError,
              );
              // Continue with other channels even if one fails
            }
          }
        } catch (serverError) {
          this.logger.warn(
            `[Prewarm] Failed to process server ${server._id}:`,
            serverError instanceof Error ? serverError.message : serverError,
          );
          // Continue with other servers even if one fails
        }
      }

      this.logger.log(`[Prewarm] Completed channel prewarm for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `[Prewarm] Error during channel prewarm for user ${userId}:`,
        error instanceof Error ? error.message : error,
      );
      // Don't throw - prewarm is fire and forget
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

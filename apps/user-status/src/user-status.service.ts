import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  UserStatusSchema,
  UserStatusDocument,
} from "../schemas/user-status.schema";
import { UserStatus } from "../enum/enum";
import { DecodeApiClient } from "../clients/decode-api.client";
import {
  BulkStatusResponse,
  OnlineUsersResponse,
} from "../interfaces/user-status.interface";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";

@Injectable()
export class UserStatusService {
  private readonly logger = new Logger(UserStatusService.name);
  private gateway: { getConnectedUserIds: () => Set<string> } | null = null;

  constructor(
    @InjectModel(UserStatusSchema.name)
    private readonly userStatusModel: Model<UserStatusDocument>,
    private readonly decodeApiClient: DecodeApiClient,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Set gateway reference (called from gateway after initialization)
   */
  setGateway(gateway: { getConnectedUserIds: () => Set<string> }): void {
    this.gateway = gateway;
  }

  /**
   * Set user online
   */
  async setUserOnline(
    userId: string,
    socketId: string,
  ): Promise<{ success: boolean; status: string }> {
    this.logger.log(`Setting user ${userId} online with socket ${socketId}`);

    try {
      await this.userStatusModel.findOneAndUpdate(
        { user_id: new Types.ObjectId(userId) },
        {
          status: UserStatus.ONLINE,
          last_seen: new Date(),
          socket_id: socketId,
          updated_at: new Date(),
        },
        { upsert: true, new: true },
      );

      // Cache status in Redis for fast access from other services
      const statusKey = `user:status:${userId}`;
      await this.redis.set(
        statusKey,
        JSON.stringify({
          status: UserStatus.ONLINE,
          last_seen: new Date().toISOString(),
          socket_id: socketId,
        }),
        "EX",
        3600, // Expire after 1 hour
      );

      return { success: true, status: UserStatus.ONLINE };
    } catch (error) {
      this.logger.error(`Error setting user ${userId} online:`, error);
      throw error;
    }
  }

  /**
   * Set user offline
   */
  async setUserOffline(userId: string): Promise<{ success: boolean }> {
    this.logger.log(`Setting user ${userId} offline`);

    try {
      await this.userStatusModel.findOneAndUpdate(
        { user_id: new Types.ObjectId(userId) },
        {
          status: UserStatus.OFFLINE,
          last_seen: new Date(),
          socket_id: null,
          updated_at: new Date(),
        },
        { upsert: true },
      );

      // Update status in Redis
      const statusKey = `user:status:${userId}`;
      await this.redis.set(
        statusKey,
        JSON.stringify({
          status: UserStatus.OFFLINE,
          last_seen: new Date().toISOString(),
          socket_id: null,
        }),
        "EX",
        3600, // Expire after 1 hour
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Error setting user ${userId} offline:`, error);
      throw error;
    }
  }

  /**
   * Get status of all users that the current user is following
   * Uses pagination (lazy loading)
   */
  async getFollowingUsersStatus(
    currentUserId: string,
    sessionId?: string,
    fingerprintHash?: string,
    page: number = 0,
    limit: number = 20,
  ): Promise<BulkStatusResponse> {
    try {
      // Get following list from direct-message service
      const followingData = await this.decodeApiClient.getUserFollowing(
        currentUserId,
        sessionId,
        fingerprintHash,
      );

      if (followingData.length === 0) {
        return {
          users: [],
          metadata: {
            page,
            limit,
            total: 0,
            is_last_page: true,
          },
        };
      }

      const skip = page * limit;
      const paginatedData = followingData.slice(skip, skip + limit);

      const is_last_page = skip + paginatedData.length >= followingData.length;

      const userIds = paginatedData.map((item) => item.user_id);

      const result = await this.getBulkUserStatus(userIds, true);

      const usersWithConversation = result.users.map((user) => {
        const followingItem = paginatedData.find(
          (item) => item.user_id === user.user_id,
        );
        return {
          ...user,
          conversationid: followingItem?.conversationid || "",
          isCall: followingItem?.isCall || false,
          lastMessageAt: followingItem?.lastMessageAt,
        };
      });

      return {
        users: usersWithConversation,
        metadata: {
          page,
          limit,
          total: paginatedData.length, // Total in current page, not total of all
          is_last_page,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting following users status for ${currentUserId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all online users from current user's following list only
   */
  async getOnlineFollowingUsers(
    currentUserId: string,
    sessionId?: string,
    fingerprintHash?: string,
    page: number = 0,
    limit: number = 20,
  ): Promise<OnlineUsersResponse> {
    try {
      // Get following list from direct-message service
      const followingData = await this.decodeApiClient.getUserFollowing(
        currentUserId,
        sessionId,
        fingerprintHash,
      );

      if (followingData.length === 0) {
        return {
          users: [],
          metadata: {
            page,
            limit,
            total: 0,
            is_last_page: true,
          },
        };
      }

      // Convert to ObjectIds
      const followingObjectIds = followingData.map(
        (item) => new Types.ObjectId(item.user_id),
      );

      // Get online users from following list only
      const onlineUsers = await this.userStatusModel
        .find({
          user_id: { $in: followingObjectIds },
          status: UserStatus.ONLINE,
        })
        .select("user_id status last_seen")
        .exec();

      const onlineUserIds = onlineUsers.map((u) => u.user_id.toString());

      if (onlineUserIds.length === 0) {
        return {
          users: [],
          metadata: {
            page,
            limit,
            total: 0,
            is_last_page: true,
          },
        };
      }

      // Apply pagination (0-based: page 0, 1, 2...)
      const skip = page * limit;
      const paginatedOnlineIds = onlineUserIds.slice(skip, skip + limit);

      // Check if this is the last page
      const is_last_page =
        skip + paginatedOnlineIds.length >= onlineUserIds.length;

      // Get profiles and status for online users
      const profileMap =
        await this.decodeApiClient.getBulkUserProfiles(paginatedOnlineIds);

      // Get status data for these users
      const statusMap = new Map(
        onlineUsers.map((u) => [u.user_id.toString(), u]),
      );

      const users = paginatedOnlineIds
        .map((userId) => {
          const profile = profileMap.get(userId);
          if (!profile) return null;

          const status = statusMap.get(userId);

          // Find conversation data for this user
          const followingItem = followingData.find(
            (item) => item.user_id === userId,
          );

          return {
            user_id: userId,
            status: (status?.status || UserStatus.ONLINE) as
              | "online"
              | "offline",
            conversationid: followingItem?.conversationid || "",
            displayname: profile.display_name,
            username: profile.username,
            avatar_ipfs_hash: profile.avatar_ipfs_hash,
            isCall: followingItem?.isCall || false,
            last_seen: status?.last_seen || new Date(),
            lastMessageAt: followingItem?.lastMessageAt,
          };
        })
        .filter((user) => user !== null) as OnlineUsersResponse["users"];

      return {
        users,
        metadata: {
          page,
          limit,
          total: users.length, // Total in current page
          is_last_page,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting online following users for ${currentUserId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get multiple users status (bulk)
   * Used by WebSocket checkStatus event
   */
  async getBulkUserStatus(
    userIds: string[],
    includeProfile = false,
  ): Promise<BulkStatusResponse> {
    try {
      const objectIds = userIds.map((id) => new Types.ObjectId(id));

      const statuses = await this.userStatusModel
        .find({ user_id: { $in: objectIds } })
        .exec();

      const statusMap = new Map(statuses.map((s) => [s.user_id.toString(), s]));

      let profileMap = new Map<
        string,
        {
          username: string;
          display_name: string;
          avatar_ipfs_hash: string;
        }
      >();
      if (includeProfile) {
        profileMap = await this.decodeApiClient.getBulkUserProfiles(userIds);
      }

      const users = userIds.map((userId) => {
        const status = statusMap.get(userId);
        const profile = profileMap.get(userId);

        return {
          user_id: userId,
          status: (status?.status || UserStatus.OFFLINE) as
            | "online"
            | "offline",
          conversationid: undefined, // Will be set by caller if needed
          displayname: profile?.display_name || `User_${userId}`,
          username: profile?.username || `user_${userId}`,
          avatar_ipfs_hash: profile?.avatar_ipfs_hash || "",
          isCall: false, // Will be set by caller if needed
          last_seen: status?.last_seen || new Date(),
          lastMessageAt: undefined, // Will be set by caller if needed
        };
      });

      return { users };
    } catch (error) {
      this.logger.error("Error getting bulk user status:", error);
      throw error;
    }
  }

  /**
   * Get online members in a specific server
   */
  async getOnlineServerMembers(
    serverId: string,
    sessionId?: string,
    fingerprintHash?: string,
    page: number = 0,
    limit: number = 20,
  ): Promise<OnlineUsersResponse> {
    try {
      // Get all members in the server from user-dehive-server service
      const memberIds = await this.decodeApiClient.getServerMembers(
        serverId,
        sessionId,
        fingerprintHash,
      );

      this.logger.log(
        `Server ${serverId} has ${memberIds.length} members: [${memberIds.join(", ")}]`,
      );

      if (memberIds.length === 0) {
        return {
          users: [],
          metadata: {
            page,
            limit,
            total: 0,
            is_last_page: true,
          },
        };
      }

      this.logger.log(
        `Checking online status for ${memberIds.length} members via gateway`,
      );

      // Get actually connected users from WebSocket gateway
      const connectedUserIds =
        this.gateway?.getConnectedUserIds() || new Set<string>();
      this.logger.log(
        `Currently connected users: ${connectedUserIds.size} - [${Array.from(connectedUserIds).join(", ")}]`,
      );

      // Filter only members who are actually connected
      const onlineMemberIds = memberIds.filter((userId) =>
        connectedUserIds.has(userId),
      );

      this.logger.log(
        `Found ${onlineMemberIds.length} online members (actually connected):`,
        onlineMemberIds,
      );

      if (onlineMemberIds.length === 0) {
        return {
          users: [],
          metadata: {
            page,
            limit,
            total: 0,
            is_last_page: true,
          },
        };
      }

      // Apply pagination (0-based: page 0, 1, 2...)
      const skip = page * limit;
      const paginatedMemberIds = onlineMemberIds.slice(skip, skip + limit);

      // Check if this is the last page
      const is_last_page =
        skip + paginatedMemberIds.length >= onlineMemberIds.length;

      // Get profiles for online members
      const profileMap =
        await this.decodeApiClient.getBulkUserProfiles(paginatedMemberIds);

      // Build user list - all are online since we filtered by connectedUserIds
      const users = paginatedMemberIds
        .map((userId) => {
          const profile = profileMap.get(userId);
          if (!profile) return null;

          return {
            user_id: userId,
            status: "online" as "online" | "offline",
            conversationid: "", // Server members don't have conversationid
            displayname: profile.display_name,
            username: profile.username,
            avatar_ipfs_hash: profile.avatar_ipfs_hash,
            isCall: false, // Server members are not in call
            last_seen: new Date(), // They are online now
            lastMessageAt: undefined, // Server members don't have lastMessageAt
          };
        })
        .filter((user) => user !== null) as OnlineUsersResponse["users"];

      return {
        users,
        metadata: {
          page,
          limit,
          total: users.length, // Total in current page
          is_last_page,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting online members for server ${serverId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all members in a specific server (both online and offline)
   */
  async getAllServerMembers(
    serverId: string,
    sessionId?: string,
    fingerprintHash?: string,
    page: number = 0,
    limit: number = 20,
  ): Promise<OnlineUsersResponse> {
    try {
      // Get all members in the server from user-dehive-server service
      const memberIds = await this.decodeApiClient.getServerMembers(
        serverId,
        sessionId,
        fingerprintHash,
      );

      this.logger.log(
        `Server ${serverId} has ${memberIds.length} total members: [${memberIds.join(", ")}]`,
      );

      if (memberIds.length === 0) {
        return {
          users: [],
          metadata: {
            page,
            limit,
            total: 0,
            is_last_page: true,
          },
        };
      }

      // Apply pagination first (to limit the number of profiles we fetch)
      const skip = page * limit;
      const paginatedMemberIds = memberIds.slice(skip, skip + limit);

      // Check if this is the last page
      const is_last_page = skip + paginatedMemberIds.length >= memberIds.length;

      // Convert to ObjectIds for database query
      const paginatedMemberObjectIds = paginatedMemberIds.map(
        (id) => new Types.ObjectId(id),
      );

      // Get status data for these users (if they have status records)
      const statusRecords = await this.userStatusModel
        .find({
          user_id: { $in: paginatedMemberObjectIds },
        })
        .select("user_id status last_seen")
        .exec();

      this.logger.log(
        `Found ${statusRecords.length} status records out of ${paginatedMemberIds.length} members:`,
        statusRecords.map((s) => ({
          user_id: s.user_id.toString(),
          status: s.status,
        })),
      );

      // Create a map of user_id to status
      const statusMap = new Map(
        statusRecords.map((s) => [s.user_id.toString(), s]),
      );

      // Get profiles for all paginated members
      const profileMap =
        await this.decodeApiClient.getBulkUserProfiles(paginatedMemberIds);

      // Get currently connected users from gateway
      const connectedUserIds =
        this.gateway?.getConnectedUserIds() || new Set<string>();
      this.logger.log(
        `Currently connected users: ${connectedUserIds.size} - [${Array.from(connectedUserIds).join(", ")}]`,
      );

      const users = paginatedMemberIds
        .map((userId) => {
          const profile = profileMap.get(userId);
          if (!profile) return null;

          const statusRecord = statusMap.get(userId);

          // Determine user status based on actual socket connection
          // Priority: connected to WebSocket > database status
          let userStatus: "online" | "offline" = "offline";

          if (connectedUserIds.has(userId)) {
            // User is actually connected via WebSocket
            userStatus = "online";
          } else if (
            statusRecord &&
            statusRecord.status === UserStatus.ONLINE
          ) {
            // Database says online but not connected = stale data, treat as offline
            userStatus = "offline";
            this.logger.warn(
              `User ${userId} has online status in DB but not connected - treating as offline`,
            );
          }

          return {
            user_id: userId,
            status: userStatus,
            conversationid: "", // Server members don't have conversationid
            displayname: profile.display_name,
            username: profile.username,
            avatar_ipfs_hash: profile.avatar_ipfs_hash,
            isCall: false, // Server members are not in call
            last_seen: statusRecord?.last_seen || new Date(),
            lastMessageAt: undefined, // Server members don't have lastMessageAt
          };
        })
        .filter((user) => user !== null) as OnlineUsersResponse["users"];

      return {
        users,
        metadata: {
          page,
          limit,
          total: users.length, // Total in current page
          is_last_page,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting all members for server ${serverId}:`,
        error,
      );
      throw error;
    }
  }
}

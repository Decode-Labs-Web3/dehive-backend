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

@Injectable()
export class UserStatusService {
  private readonly logger = new Logger(UserStatusService.name);

  constructor(
    @InjectModel(UserStatusSchema.name)
    private readonly userStatusModel: Model<UserStatusDocument>,
    private readonly decodeApiClient: DecodeApiClient,
  ) {}

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
      const followingIds = await this.decodeApiClient.getUserFollowing(
        currentUserId,
        sessionId,
        fingerprintHash,
      );

      if (followingIds.length === 0) {
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
      const paginatedIds = followingIds.slice(skip, skip + limit);

      // Check if this is the last page
      const is_last_page = skip + paginatedIds.length >= followingIds.length;

      // Get status + profile of paginated following users
      const result = await this.getBulkUserStatus(paginatedIds, true);

      return {
        ...result,
        metadata: {
          page,
          limit,
          total: paginatedIds.length, // Total in current page, not total of all
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
      const followingIds = await this.decodeApiClient.getUserFollowing(
        currentUserId,
        sessionId,
        fingerprintHash,
      );

      if (followingIds.length === 0) {
        return {
          online_users: [],
          metadata: {
            page,
            limit,
            total: 0,
            is_last_page: true,
          },
        };
      }

      // Convert to ObjectIds
      const followingObjectIds = followingIds.map(
        (id) => new Types.ObjectId(id),
      );

      // Get online users from following list only
      const onlineUsers = await this.userStatusModel
        .find({
          user_id: { $in: followingObjectIds },
          status: UserStatus.ONLINE,
        })
        .select("user_id")
        .exec();

      const onlineUserIds = onlineUsers.map((u) => u.user_id.toString());

      if (onlineUserIds.length === 0) {
        return {
          online_users: [],
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

      // Get profiles for online users
      const profileMap =
        await this.decodeApiClient.getBulkUserProfiles(paginatedOnlineIds);

      const online_users = paginatedOnlineIds
        .map((userId) => {
          const profile = profileMap.get(userId);
          if (!profile) return null;

          return {
            user_id: userId,
            user_profile: {
              username: profile.username,
              display_name: profile.display_name,
              avatar_ipfs_hash: profile.avatar_ipfs_hash,
            },
          };
        })
        .filter((user) => user !== null) as OnlineUsersResponse["online_users"];

      return {
        online_users,
        metadata: {
          page,
          limit,
          total: online_users.length, // Total in current page
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
        const userStatus: BulkStatusResponse["users"][number] = {
          user_id: userId,
          status: (status?.status || UserStatus.OFFLINE) as
            | "online"
            | "offline"
            | "away",
          last_seen: status?.last_seen || new Date(),
        };

        if (includeProfile) {
          const profile = profileMap.get(userId);
          if (profile) {
            userStatus.user_profile = {
              username: profile.username,
              display_name: profile.display_name,
              avatar_ipfs_hash: profile.avatar_ipfs_hash,
            };
          }
        }

        return userStatus;
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

      if (memberIds.length === 0) {
        return {
          online_users: [],
          metadata: {
            page,
            limit,
            total: 0,
            is_last_page: true,
          },
        };
      }

      // Convert to ObjectIds
      const memberObjectIds = memberIds.map((id) => new Types.ObjectId(id));

      // Get online members only
      const onlineMembers = await this.userStatusModel
        .find({
          user_id: { $in: memberObjectIds },
          status: UserStatus.ONLINE,
        })
        .select("user_id")
        .exec();

      const onlineMemberIds = onlineMembers.map((u) => u.user_id.toString());

      if (onlineMemberIds.length === 0) {
        return {
          online_users: [],
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

      const online_users = paginatedMemberIds
        .map((userId) => {
          const profile = profileMap.get(userId);
          if (!profile) return null;

          return {
            user_id: userId,
            user_profile: {
              username: profile.username,
              display_name: profile.display_name,
              avatar_ipfs_hash: profile.avatar_ipfs_hash,
            },
          };
        })
        .filter((user) => user !== null) as OnlineUsersResponse["online_users"];

      return {
        online_users,
        metadata: {
          page,
          limit,
          total: online_users.length, // Total in current page
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
}

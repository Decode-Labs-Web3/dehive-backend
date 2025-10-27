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
  UserStatusResponse,
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
   * Set user away (idle)
   */
  async setUserAway(userId: string): Promise<{ success: boolean }> {
    this.logger.log(`Setting user ${userId} away`);

    try {
      await this.userStatusModel.findOneAndUpdate(
        { user_id: new Types.ObjectId(userId) },
        {
          status: UserStatus.AWAY,
          updated_at: new Date(),
        },
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Error setting user ${userId} away:`, error);
      throw error;
    }
  }

  /**
   * Get user status with profile
   */
  async getUserStatus(
    userId: string,
    includeProfile = false,
  ): Promise<UserStatusResponse | null> {
    try {
      const userStatus = await this.userStatusModel
        .findOne({ user_id: new Types.ObjectId(userId) })
        .exec();

      const status = userStatus?.status || UserStatus.OFFLINE;
      const lastSeen = userStatus?.last_seen || new Date();

      const response: UserStatusResponse = {
        user_id: userId,
        status: status as "online" | "offline" | "away",
        last_seen: lastSeen,
      };

      if (includeProfile) {
        const profile = await this.decodeApiClient.getUserProfilePublic(userId);
        if (profile) {
          response.user_profile = {
            username: profile.username,
            display_name: profile.display_name,
            avatar_ipfs_hash: profile.avatar_ipfs_hash,
          };
        }
      }

      return response;
    } catch (error) {
      this.logger.error(`Error getting status for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get multiple users status (bulk)
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
   * Get all online users with profiles
   */
  async getOnlineUsers(): Promise<OnlineUsersResponse> {
    try {
      const onlineUsers = await this.userStatusModel
        .find({ status: UserStatus.ONLINE })
        .select("user_id")
        .exec();

      const userIds = onlineUsers.map((u) => u.user_id.toString());
      const profileMap =
        await this.decodeApiClient.getBulkUserProfiles(userIds);

      const online_users = userIds
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

      return { online_users };
    } catch (error) {
      this.logger.error("Error getting online users:", error);
      throw error;
    }
  }
}

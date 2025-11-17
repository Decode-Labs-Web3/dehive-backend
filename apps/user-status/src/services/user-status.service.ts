import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  UserStatusSchema,
  UserStatusDocument,
} from "../../schemas/user-status.schema";
import { UserStatus } from "../../enum/enum";
import { DecodeApiClient } from "../../clients/decode-api.client";
import {
  BulkStatusResponse,
  OnlineUsersResponse,
} from "../../interfaces/user-status.interface";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";
import { UserStatusCacheService } from "./user-status-cache.service";

@Injectable()
export class UserStatusService {
  private readonly logger = new Logger(UserStatusService.name);
  private gateway: { getConnectedUserIds: () => Set<string> } | null = null;

  // Track prewarm requests in progress to prevent duplicates
  private prewarmInProgress = new Map<string, Promise<BulkStatusResponse>>();

  // In-memory cache for prewarm results (TTL: 30s)
  private prewarmCache = new Map<
    string,
    {
      data: BulkStatusResponse;
      timestamp: number;
    }
  >();
  private readonly PREWARM_CACHE_TTL = 30000; // 30 seconds

  constructor(
    @InjectModel(UserStatusSchema.name)
    private readonly userStatusModel: Model<UserStatusDocument>,
    private readonly decodeApiClient: DecodeApiClient,
    @InjectRedis() private readonly redis: Redis,
    private readonly cacheService: UserStatusCacheService,
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
      // Check cache first
      const cached =
        await this.cacheService.getCachedFollowingStatus<BulkStatusResponse>(
          currentUserId,
          page,
        );

      if (cached) {
        if (!cached.isStale) {
          // Fresh cache - return immediately
          this.logger.log(
            `✅ Cache HIT (fresh) for user ${currentUserId} page ${page}`,
          );
          return cached.data;
        } else {
          // Stale cache - return it but refresh in background
          this.logger.log(
            `⚠️ Cache HIT (stale) for user ${currentUserId} page ${page} - refreshing in background`,
          );

          // Refresh in background
          this.fetchAndCacheFollowingStatus(
            currentUserId,
            sessionId,
            fingerprintHash,
            page,
            limit,
          ).catch((err) => {
            this.logger.error(
              `Background refresh failed for user ${currentUserId} page ${page}:`,
              err,
            );
          });

          return cached.data;
        }
      }

      // Cache MISS - try to acquire lock
      this.logger.log(
        `❌ Cache MISS for user ${currentUserId} page ${page} - fetching from API`,
      );

      const lockAcquired = await this.cacheService.acquireLock(
        currentUserId,
        page,
      );

      if (!lockAcquired) {
        // Another request is already fetching - wait for cache
        this.logger.log(
          `🔒 Lock held by another request for user ${currentUserId} page ${page} - waiting for cache`,
        );
        const waitResult =
          await this.cacheService.waitForCache<BulkStatusResponse>(
            currentUserId,
            page,
          );

        if (waitResult) {
          this.logger.log(
            `✅ Cache available after waiting for user ${currentUserId} page ${page}`,
          );
          return waitResult.data;
        }

        // Timeout waiting - fetch anyway
        this.logger.warn(
          `⏱️ Timeout waiting for cache for user ${currentUserId} page ${page} - fetching anyway`,
        );
      }

      // Fetch and cache
      return await this.fetchAndCacheFollowingStatus(
        currentUserId,
        sessionId,
        fingerprintHash,
        page,
        limit,
      );
    } catch (error) {
      this.logger.error(
        `Error getting following users status for ${currentUserId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Fetch following status from API and cache it
   * Private helper method - with deduplication
   */
  private async fetchAndCacheFollowingStatus(
    currentUserId: string,
    sessionId?: string,
    fingerprintHash?: string,
    page: number = 0,
    limit: number = 20,
  ): Promise<BulkStatusResponse> {
    const progressKey = `${currentUserId}:${page}`;

    // 1. CHECK: In-memory cache (30s TTL)
    const memCached = this.getFromMemoryCache(progressKey);
    if (memCached) {
      this.logger.log(`💨 Memory cache HIT for ${currentUserId} page ${page}`);
      return memCached;
    }

    // 2. CHECK: Redis cache (handled by cacheService)
    const redisCached =
      await this.cacheService.getCachedFollowingStatus<BulkStatusResponse>(
        currentUserId,
        page,
      );

    if (redisCached && !redisCached.isStale) {
      this.logger.log(`✅ Redis cache HIT for ${currentUserId} page ${page}`);
      // Cache to memory too
      this.setToMemoryCache(progressKey, redisCached.data);
      return redisCached.data;
    }

    // 3. CHECK: Is there a fetch already in progress for this user+page?
    if (this.prewarmInProgress.has(progressKey)) {
      this.logger.log(
        `♻️ REUSING in-progress fetch for ${currentUserId} page ${page}`,
      );
      const inProgress = this.prewarmInProgress.get(progressKey);
      if (inProgress) {
        return inProgress;
      }
    }

    // 4. START NEW FETCH
    this.logger.log(
      `🚀 Starting NEW fetch for user ${currentUserId} page ${page}`,
    );

    const fetchPromise = this.doFetchAndCache(
      currentUserId,
      sessionId,
      fingerprintHash,
      page,
      limit,
    ).finally(() => {
      // Cleanup after done
      this.prewarmInProgress.delete(progressKey);
    });

    this.prewarmInProgress.set(progressKey, fetchPromise);

    return fetchPromise;
  }

  /**
   * Internal fetch and cache logic
   */
  private async doFetchAndCache(
    currentUserId: string,
    sessionId?: string,
    fingerprintHash?: string,
    page: number = 0,
    limit: number = 20,
  ): Promise<BulkStatusResponse> {
    try {
      const startTime = Date.now();

      // Get following list from direct-message service
      const followingData = await this.decodeApiClient.getUserFollowing(
        currentUserId,
        sessionId,
        fingerprintHash,
      );

      if (followingData.length === 0) {
        const result = {
          users: [],
          metadata: {
            page,
            limit,
            total: 0,
            is_last_page: true,
          },
        };

        // Cache empty result
        await this.cacheService.setCachedFollowingStatus(
          currentUserId,
          page,
          result,
        );

        return result;
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

      const finalResult = {
        users: usersWithConversation,
        metadata: {
          page,
          limit,
          total: paginatedData.length,
          is_last_page,
        },
      };

      // Cache the result
      await this.cacheService.setCachedFollowingStatus(
        currentUserId,
        page,
        finalResult,
      );

      // HOT-CACHE: synchronize per-user status keys in Redis so other services
      // can read per-user status quickly without DB hit. Use pipeline for efficiency.
      try {
        const pipeline = this.redis.multi();

        // If there was a previous cached page, remove status keys for users
        // that are no longer present to avoid stale hot-cache entries.
        try {
          const prevCache = await this.cacheService
            .getCachedFollowingStatus<BulkStatusResponse>(currentUserId, page)
            .catch(() => null);

          if (
            prevCache &&
            prevCache.data &&
            Array.isArray(prevCache.data.users)
          ) {
            const prevIds = new Set(prevCache.data.users.map((u) => u.user_id));
            const newIds = new Set(usersWithConversation.map((u) => u.user_id));

            // Compute removed IDs = prevIds - newIds
            const removed: string[] = [];
            for (const id of prevIds) {
              if (!newIds.has(id)) removed.push(id as string);
            }

            if (removed.length > 0) {
              for (const rid of removed) {
                pipeline.del(`user:status:${rid}`);
              }
            }
          }
        } catch (innerErr) {
          // Non-fatal: log and continue to set current hot-cache
          this.logger.warn(
            `Warning while computing removed following IDs for hot-cache sync: ${String(
              innerErr,
            )}`,
          );
        }

        // Now set/update status keys for current page users
        for (const u of usersWithConversation) {
          const statusKey = `user:status:${u.user_id}`;
          const lastSeen =
            u.last_seen instanceof Date
              ? u.last_seen.toISOString()
              : String(u.last_seen || new Date().toISOString());
          const payload = JSON.stringify({
            status: u.status,
            last_seen: lastSeen,
            // socket_id may not be present in this context
            socket_id: (u as { socket_id?: string }).socket_id || null,
          });
          // Set with 1 hour TTL
          pipeline.setex(statusKey, 3600, payload);
        }

        await pipeline.exec();
        this.logger.log(
          `🔥 Synchronized hot-cache: wrote ${usersWithConversation.length} user status entries for user ${currentUserId}`,
        );
      } catch (err) {
        this.logger.error(
          `Error hot-caching individual user statuses: ${String(err)}`,
        );
        // don't fail the main flow on hot-cache failure
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `📦 Fetched and cached following status for user ${currentUserId} page ${page} in ${duration}ms`,
      );

      return finalResult;
    } catch (error) {
      this.logger.error(
        `Error fetching and caching following status for ${currentUserId}:`,
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
          wallets?: Array<{
            _id: string;
            address: string;
            user_id: string;
            name_service: string | null;
            is_primary: boolean;
            createdAt: string;
            updatedAt: string;
            __v: number;
          }>;
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
          wallets: profile?.wallets || [],
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
            wallets: profile.wallets || [],
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
            wallets: profile.wallets || [],
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

  // Memory cache helper methods
  private getFromMemoryCache(key: string): BulkStatusResponse | null {
    const cached = this.prewarmCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.PREWARM_CACHE_TTL) {
      this.prewarmCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setToMemoryCache(key: string, data: BulkStatusResponse): void {
    this.prewarmCache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Auto cleanup old cache entries if too many
    if (this.prewarmCache.size > 1000) {
      const oldestKey = this.prewarmCache.keys().next().value;
      this.prewarmCache.delete(oldestKey);
    }
  }

  /**
   * Pre-warm following cache (page 0) for a single user.
   * This is fire-and-forget and will not block the caller. It reuses
   * the existing fetchAndCacheFollowingStatus logic which also performs
   * the hot-cache (per-user Redis keys) after fetching.
   */
  async prewarmFollowingCache(
    currentUserId: string,
    sessionId?: string,
    fingerprintHash?: string,
    limit: number = 20,
  ): Promise<void> {
    const page = 0;
    const progressKey = `${currentUserId}:${page}`;

    // If memory cache already has a recent result, skip prewarm
    if (this.getFromMemoryCache(progressKey)) return;

    // If a fetch is already in progress, do not start another
    if (this.prewarmInProgress.has(progressKey)) return;

    this.logger.log(`🔥 Pre-warming following cache for user ${currentUserId}`);

    // Fire-and-forget call to fetch & cache (this will also hot-cache per-user keys)
    this.fetchAndCacheFollowingStatus(
      currentUserId,
      sessionId,
      fingerprintHash,
      page,
      limit,
    )
      .then(() => {
        this.logger.log(
          `✅ Pre-warmed following cache for user ${currentUserId}`,
        );
      })
      .catch((err) => {
        this.logger.warn(
          `Pre-warm failed for user ${currentUserId}: ${String(err)}`,
        );
      });
  }

  /**
   * Pre-warm following cache for multiple users in parallel.
   * This is intended to be used when bootstrapping multiple sessions
   * (for example, background workers or batch operations).
   */
  async prewarmMultipleFollowings(
    userIds: string[],
    sessionId?: string,
    fingerprintHash?: string,
    limit: number = 20,
  ): Promise<void> {
    if (!Array.isArray(userIds) || userIds.length === 0) return;

    this.logger.log(
      `🔥 Pre-warming following cache for ${userIds.length} users`,
    );

    const promises = userIds.map((uid) =>
      this.prewarmFollowingCache(uid, sessionId, fingerprintHash, limit).catch(
        (err) => {
          this.logger.warn(`Pre-warm failed for ${uid}: ${String(err)}`);
        },
      ),
    );

    // Fire-and-forget: do not await all here, but ensure any unhandled
    // rejections are logged by attaching catch above.
    Promise.all(promises).catch((err) => {
      this.logger.error(
        `Error pre-warming multiple followings: ${String(err)}`,
      );
    });
  }

  /**
   * Public helper to be called when the user's following list changes
   * (follow or unfollow). This will invalidate any cached following pages
   * and trigger a background prewarm so the new following list is cached
   * and hot-cached immediately.
   *
   * Usage: call this from the service that performs follow/unfollow, or
   * from an event listener that receives follow-change notifications.
   */
  async handleFollowingChanged(
    currentUserId: string,
    sessionId?: string,
    fingerprintHash?: string,
    limit: number = 20,
  ): Promise<void> {
    try {
      // Invalidate all cached pages for this user's following list
      await this.cacheService.invalidateUserCache(currentUserId);

      // Trigger background prewarm (will also hot-cache per-user status keys)
      this.prewarmFollowingCache(
        currentUserId,
        sessionId,
        fingerprintHash,
        limit,
      );

      this.logger.log(
        `Handled following change for user ${currentUserId}: cache invalidated and prewarm started`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling following change for ${currentUserId}: ${String(error)}`,
      );
    }
  }
}

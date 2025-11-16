import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDehiveServerDocument } from "../schemas/user-dehive-server.schema";

@Injectable()
@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/server-events",
})
export class ServerEventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ServerEventsGateway.name);

  constructor(
    @InjectModel("UserDehiveServer")
    private userDehiveServerModel: Model<UserDehiveServerDocument>,
  ) {}

  // Debug Insomnia flag per client
  private debugInsomniaMap = new WeakMap<Socket, boolean>();

  async handleConnection(client: Socket) {
    // Detect debug mode from header or query param
    const debugInsomnia =
      client.handshake.headers["x-debug-insomnia"] === "true" ||
      client.handshake.query["debug-insomnia"] === "true";
    this.debugInsomniaMap.set(client, debugInsomnia);
    if (debugInsomnia) {
      this.logger.log(`[DEBUG] Insomnia client connected: ${client.id}`);
      this.send(client, "debug", { message: "Insomnia debug mode enabled" });
    }

    this.logger.log(
      `[WebSocket] Client connected: ${client.id}. Awaiting identity.`,
    );
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    this.logger.log(
      `[WebSocket] Client ${client.id} disconnected ${userId ? `(user: ${userId})` : ""}`,
    );
  }

  @SubscribeMessage("identity")
  async handleIdentity(
    @MessageBody() data: string | { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Parse data - support both string and object format (same as other gateways)
    let userId: string;

    if (typeof data === "string") {
      try {
        const parsedData = JSON.parse(data) as { userId: string };
        if (parsedData.userId) {
          userId = parsedData.userId;
        } else {
          userId = data;
        }
      } catch {
        userId = data;
      }
    } else if (typeof data === "object" && data?.userId) {
      userId = data.userId;
    } else {
      return this.send(client, "error", {
        message:
          "Invalid identity format. Send userId as string or {userId: string}",
        code: "INVALID_FORMAT",
      });
    }

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return this.send(client, "error", {
        message: "Invalid userId format.",
        code: "INVALID_USER_ID",
      });
    }

    this.logger.log(
      `[WebSocket] Client ${client.id} is identifying as userId: ${userId}`,
    );

    // Validate user exists in DB (UserDehive)
    try {
      const exists = await this.userDehiveServerModel.db
        .collection("user_dehive")
        .findOne({ _id: new Types.ObjectId(userId) });
      if (!exists) {
        return this.send(client, "error", {
          message: "User not found.",
          code: "USER_NOT_FOUND",
        });
      }
    } catch (err) {
      this.logger.error(`[WebSocket] Error checking user existence: ${err}`);
      return this.send(client, "error", {
        message: "Database error while checking user existence.",
        code: "DB_ERROR",
      });
    }

    // Store user info in socket data
    client.data.userId = userId;

    // Join user-specific room (Level 1: Server updates)
    await client.join(`user:${userId}`);
    this.logger.log(
      `[WebSocket] User ${userId} authenticated and joined personal room`,
    );

    // Emit success with user info (same pattern as other gateways)
    this.send(client, "identityConfirmed", {
      message: `You are now identified as ${userId}`,
      userId: userId,
    });
  }

  @SubscribeMessage("joinServer")
  async handleJoinServer(
    @MessageBody() data: string | { serverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    // Parse data - support both string and object format
    let serverId: string;

    if (typeof data === "string") {
      try {
        const parsedData = JSON.parse(data) as { serverId: string };
        serverId = parsedData.serverId;
      } catch {
        serverId = data;
      }
    } else if (typeof data === "object" && data?.serverId) {
      serverId = data.serverId;
    } else {
      return this.send(client, "error", {
        message: "serverId is required",
        code: "INVALID_REQUEST",
      });
    }

    if (!serverId || !Types.ObjectId.isValid(serverId)) {
      return this.send(client, "error", {
        message: "Invalid serverId format",
        code: "INVALID_SERVER_ID",
      });
    }

    this.logger.log(
      `[WebSocket] User ${userId} attempting to join server: ${serverId}`,
    );

    try {
      // Verify user is member of this server
      const membership = await this.userDehiveServerModel.exists({
        user_dehive_id: userId,
        server_id: new Types.ObjectId(serverId),
      });

      if (!membership) {
        return this.send(client, "error", {
          message: "Not a member of this server",
          code: "NOT_A_MEMBER",
        });
      }

      // Join server room for Level 2 events (Category/Channel CRUD)
      await client.join(`server:${serverId}`);

      this.logger.log(
        `[WebSocket] User ${userId} joined server room: ${serverId}`,
      );

      this.send(client, "serverJoined", {
        message: "Joined server room successfully",
        serverId: serverId,
        status: "success",
      });
    } catch (error) {
      this.logger.error(`[WebSocket] Error joining server: ${String(error)}`);
      return this.send(client, "error", {
        message: "Failed to join server room",
        code: "JOIN_ERROR",
      });
    }
  }

  // ========== LEVEL 1: USER-LEVEL EVENTS ==========

  /**
   * Notify user that a server they're in was deleted
   */
  notifyServerDeleted(userId: string, serverId: string, serverName: string) {
    this.broadcast(`user:${userId}`, "server:deleted", {
      serverId,
      serverName,
      timestamp: new Date(),
    });
    this.logger.log(
      `Notified user ${userId} about server deletion: ${serverId}`,
    );
  }

  /**
   * Notify user that server info (name/description) was updated
   */
  notifyServerInfoUpdated(
    userId: string,
    payload: {
      server_id: string;
      name: string;
      description: string;
    },
  ) {
    this.broadcast(`user:${userId}`, "server:info-updated", {
      ...payload,
      timestamp: new Date(),
    });
    this.logger.log(
      `Notified user ${userId} about server info update: ${payload.server_id}`,
    );
  }

  /**
   * Notify user that server avatar was updated
   */
  notifyServerAvatarUpdated(
    userId: string,
    payload: {
      server_id: string;
      avatar_hash: string;
    },
  ) {
    this.broadcast(`user:${userId}`, "server:avatar-updated", {
      ...payload,
      timestamp: new Date(),
    });
    this.logger.log(
      `Notified user ${userId} about server avatar update: ${payload.server_id}`,
    );
  }

  /**
   * Notify user that server tags were updated
   */
  notifyServerTagsUpdated(
    userId: string,
    payload: {
      server_id: string;
      tags: string[];
    },
  ) {
    this.broadcast(`user:${userId}`, "server:tags-updated", {
      ...payload,
      timestamp: new Date(),
    });
    this.logger.log(
      `Notified user ${userId} about server tags update: ${payload.server_id}`,
    );
  }

  /**
   * Notify user that server NFT gating was updated
   */
  notifyServerNFTUpdated(
    userId: string,
    payload: {
      server_id: string;
      server: unknown;
    },
  ) {
    this.broadcast(`user:${userId}`, "server:nft-updated", {
      ...payload,
      timestamp: new Date(),
    });
    this.logger.log(
      `Notified user ${userId} about server NFT update: ${payload.server_id}`,
    );
  }

  /**
   * Notify user they were kicked from server
   */
  notifyUserKicked(
    userId: string,
    serverId: string,
    _serverName: string,
    _reason?: string,
  ) {
    // Emit minimal payload to match UserKickedEvent: { serverId, userId }
    this.broadcast(`user:${userId}`, "server:kicked", {
      serverId,
      userId,
    });
    // Also notify all server members that this user has left so front-end can update member list
    // Reuse existing member:left event (member object may contain only userId when full profile isn't available)
    this.notifyMemberLeft(serverId, {
      userId,
      username: "",
      displayName: "",
    });
    this.logger.log(
      `Notified user ${userId} they were kicked from: ${serverId}`,
    );
  }

  /**
   * Notify user they were banned from server
   */
  notifyUserBanned(
    userId: string,
    serverId: string,
    _serverName: string,
    _reason?: string,
  ) {
    // Emit minimal payload to match UserBannedEvent: { serverId, userId }
    this.broadcast(`user:${userId}`, "server:banned", {
      serverId,
      userId,
    });
    // Also notify all server members that this user has left so front-end can update member list
    this.notifyMemberLeft(serverId, {
      userId,
      username: "",
      displayName: "",
    });
    this.logger.log(
      `Notified user ${userId} they were banned from: ${serverId}`,
    );
  }

  /**
   * Notify all members when someone joins the server
   */
  async notifyMemberJoined(
    serverId: string,
    memberInfo: {
      userId: string;
    },
  ) {
    const userId = memberInfo.userId;

    // Fetch full user profile to always return real data (no optionals)
    let userDoc: Record<string, unknown> | null = null;
    try {
      userDoc = await this.userDehiveServerModel.db
        .collection("user_dehive")
        .findOne({ _id: new Types.ObjectId(userId) });
    } catch (err) {
      this.logger.error(
        `[WebSocket] Error fetching user profile for notifyMemberJoined: ${String(err)}`,
      );
    }

    // Map DB fields to front-end MemberInfoJoined shape (guarantee values)
    const username =
      (userDoc && (userDoc["username"] as string)) || `User_${userId}`;

    const displayname =
      (userDoc &&
        ((userDoc["display_name"] as string) ||
          (userDoc["displayName"] as string))) ||
      "";

    const avatar_ipfs_hash =
      (userDoc &&
        ((userDoc["avatar_ipfs_hash"] as string) ||
          (userDoc["avatar"] as string))) ||
      "";

    const status = (userDoc && (userDoc["status"] as string)) || "online";

    const conversationid =
      (userDoc && (userDoc["conversationid"] as string)) || "";

    const wallets = (userDoc && (userDoc["wallets"] as unknown[])) || [];

    const last_seen =
      (userDoc &&
        ((userDoc["last_seen"] as string) ||
          (userDoc["last_login"]
            ? new Date(
                userDoc["last_login" as keyof typeof userDoc] as string,
              ).toISOString()
            : undefined))) ||
      new Date().toISOString();

    const memberPayload = {
      user_id: userId,
      status,
      conversationid,
      displayname,
      username,
      avatar_ipfs_hash,
      wallets,
      isCall: false,
      last_seen,
    };

    this.broadcast(`server:${serverId}`, "member:joined", {
      serverId,
      member: memberPayload,
      timestamp: new Date(),
    });

    this.logger.log(`Notified server ${serverId} about new member: ${userId}`);
  }

  /**
   * Notify all members when someone leaves the server
   */
  notifyMemberLeft(
    serverId: string,
    memberInfo: {
      userId: string;
      username: string;
      displayName: string;
    },
  ) {
    // Emit a minimal payload for member left so front-end can remove by id
    const memberPayload = {
      userId: memberInfo.userId,
    };

    this.broadcast(`server:${serverId}`, "member:left", {
      serverId,
      member: memberPayload,
      timestamp: new Date(),
    });

    this.logger.log(
      `Notified server ${serverId} about member leaving: ${memberInfo.userId}`,
    );
  }

  /** Notify all server members that server ownership was updated */
  notifyServerUpdatedOwnership(serverId: string, ownerId: string) {
    this.broadcast(`server:${serverId}`, "server:updated-ownership", {
      server_id: serverId,
      owner_id: ownerId,
      timestamp: new Date(),
    });
    this.logger.log(
      `Notified server ${serverId} about ownership update to owner: ${ownerId}`,
    );
  }

  // ========== LEVEL 2: SERVER-LEVEL EVENTS (Category/Channel) ==========

  /**
   * Notify all server members that a category was created
   */
  notifyCategoryCreated(
    serverId: string,
    category: {
      _id: string;
      name: string;
      server_id: string;
      createdAt: string;
      updatedAt: string;
      __v: number;
      channels?: unknown[];
    },
  ) {
    // Ensure channels is always present and is an array
    const payload = {
      _id: category._id,
      name: category.name,
      server_id: category.server_id,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      __v: category.__v,
      channels: Array.isArray(category.channels) ? category.channels : [],
    };
    this.broadcast(`server:${serverId}`, "category:created", payload);
    this.logger.log(
      `Notified server ${serverId} about new category: ${category.name}`,
    );
  }

  /**
   * Notify all server members that a category was updated
   */
  notifyCategoryUpdated(
    serverId: string,
    category: {
      categoryId: string;
      name: string;
    },
  ) {
    this.broadcast(`server:${serverId}`, "category:updated", {
      categoryId: category.categoryId,
      name: category.name,
    });
    this.logger.log(
      `Notified server ${serverId} about category update: ${category.categoryId}`,
    );
  }

  /**
   * Notify all server members that a category was deleted
   */
  notifyCategoryDeleted(
    serverId: string,
    categoryId: string,
    categoryName: string,
  ) {
    this.broadcast(`server:${serverId}`, "category:deleted", {
      categoryId,
    });
    this.logger.log(
      `Notified server ${serverId} about category deletion: ${categoryName}`,
    );
  }

  /**
   * Notify all server members that a channel was created
   */
  notifyChannelCreated(
    serverId: string,
    channel: {
      _id: string;
      name: string;
      type: string;
      category_id: string;
      createdAt: string;
      updatedAt: string;
      __v: number;
    },
  ) {
    this.broadcast(`server:${serverId}`, "channel:created", {
      ...channel,
    });
    this.logger.log(
      `Notified server ${serverId} about new channel: ${channel.name}`,
    );
  }

  /**
   * Notify all server members that a channel was updated (only name can be updated)
   */
  notifyChannelUpdated(
    serverId: string,
    channel: {
      _id: string;
      name: string;
    },
  ) {
    this.broadcast(`server:${serverId}`, "channel:updated", {
      _id: channel._id,
      name: channel.name,
    });
    this.logger.log(
      `Notified server ${serverId} about channel name update: ${channel._id}`,
    );
  }

  /**
   * Notify all server members that a channel was deleted
   */
  notifyChannelDeleted(
    serverId: string,
    channelId: string,
    channelName: string,
  ) {
    this.broadcast(`server:${serverId}`, "channel:deleted", {
      channelId,
    });
    this.logger.log(
      `Notified server ${serverId} about channel deletion: ${channelName}`,
    );
  }

  /**
   * Notify all server members that a channel was moved to different category
   */
  notifyChannelMoved(
    serverId: string,
    channel: {
      _id: string;
      name: string;
      oldCategoryId: string;
      newCategoryId: string;
    },
  ) {
    this.broadcast(`server:${serverId}`, "channel:moved", {
      serverId,
      channel,
      timestamp: new Date(),
    });
    this.logger.log(
      `Notified server ${serverId} about channel move: ${channel.name}`,
    );
  }

  // Helper: emit to one client (object for frontend, có thể mở debug Insomnia nếu cần)
  private send(client: Socket, event: string, data: unknown) {
    // Production: emit object (default for frontend)
    client.emit(event, data);

    // Debug (Insomnia): emit pretty JSON string
    // const serializedData = JSON.stringify(data, null, 2);
    // client.emit(event, serializedData);
  }

  // Helper: emit to room (object for frontend, có thể mở debug Insomnia nếu cần)
  private broadcast(room: string, event: string, data: unknown) {
    // Production: emit object (default for frontend)
    this.server.to(room).emit(event, data);

    // Debug (Insomnia): emit pretty JSON string
    // const serializedData = JSON.stringify(data, null, 2);
    // this.server.to(room).emit(event, serializedData);
  }
}

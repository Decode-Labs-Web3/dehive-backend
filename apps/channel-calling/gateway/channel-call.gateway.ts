import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Model, Types } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { ChannelCallService } from "../src/channel-call.service";
import {
  UserDehive,
  UserDehiveDocument,
} from "../../user-dehive-server/schemas/user-dehive.schema";
import {
  ChannelCall,
  ChannelCallDocument,
} from "../schemas/channel-call.schema";
import {
  ChannelParticipant,
  ChannelParticipantDocument,
} from "../schemas/channel-participant.schema";
import { DecodeApiClient } from "../clients/decode-api.client";

type SocketMeta = {
  userDehiveId?: string;
  serverId?: string;
  channelId?: string;
};

@WebSocketGateway({
  namespace: "/",
  cors: { origin: "*" },
})
export class ChannelCallGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private meta: Map<Socket, SocketMeta>;

  constructor(
    private readonly service: ChannelCallService,
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    @InjectModel(ChannelCall.name)
    private readonly channelCallModel: Model<ChannelCallDocument>,
    @InjectModel(ChannelParticipant.name)
    private readonly participantModel: Model<ChannelParticipantDocument>,
    private readonly decodeApiClient: DecodeApiClient,
  ) {
    // Initialize meta Map
    this.meta = new Map<Socket, SocketMeta>();

    // Debug logging
    console.log("[CHANNEL-RTC-WS] Gateway constructor called");
    console.log("[CHANNEL-RTC-WS] Service injected:", {
      hasService: !!this.service,
      serviceType: typeof this.service,
      serviceName: this.service?.constructor?.name,
    });
    console.log(
      "[CHANNEL-RTC-WS] userDehiveModel available:",
      !!this.userDehiveModel,
    );
    console.log(
      "[CHANNEL-RTC-WS] channelCallModel available:",
      !!this.channelCallModel,
    );
    console.log(
      "[CHANNEL-RTC-WS] participantModel available:",
      !!this.participantModel,
    );
    console.log(
      "[CHANNEL-RTC-WS] decodeApiClient available:",
      !!this.decodeApiClient,
    );
  }

  private send(client: Socket, event: string, data: unknown) {
    const serializedData = JSON.parse(JSON.stringify(data));
    client.emit(event, serializedData);
  }

  /**
   * Get user profile from public API (for WebSocket responses)
   * Fetches profile in real-time from public endpoint
   */
  private async getUserProfile(userDehiveId: string): Promise<{
    _id: string;
    username: string;
    display_name: string;
    avatar_ipfs_hash: string;
  } | null> {
    try {
      const profile =
        await this.decodeApiClient.getUserProfilePublic(userDehiveId);

      if (profile) {
        return {
          _id: userDehiveId,
          username: profile.username,
          display_name: profile.display_name,
          avatar_ipfs_hash: profile.avatar_ipfs_hash,
        };
      }

      return null;
    } catch (error) {
      console.error(`[CHANNEL-RTC-WS] Error getting user profile:`, error);
      return null;
    }
  }

  handleConnection(client: Socket) {
    console.log("[CHANNEL-RTC-WS] ========================================");
    console.log(
      "[CHANNEL-RTC-WS] Client connected to /channel-rtc namespace. Awaiting identity.",
    );
    console.log(`[CHANNEL-RTC-WS] Socket ID: ${client.id}`);
    console.log("[CHANNEL-RTC-WS] ========================================");

    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    this.meta.set(client, {});
  }

  handleDisconnect(client: Socket) {
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    if (meta?.userDehiveId) {
      console.log(
        `[CHANNEL-RTC-WS] User ${meta.userDehiveId} disconnected from /channel-rtc`,
      );
      try {
        this.service.handleUserDisconnect(meta.userDehiveId, meta.channelId);
      } catch (error) {
        console.error("[CHANNEL-RTC-WS] Error in handleUserDisconnect:", error);
      }
    }
    this.meta.delete(client);
  }

  @SubscribeMessage("identity")
  async handleIdentity(
    @MessageBody() data: string | { userDehiveId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    let userDehiveId: string;

    // Parse data - handle string (plain or JSON) or object format
    if (typeof data === "string") {
      try {
        const parsedData = JSON.parse(data) as { userDehiveId: string };
        if (parsedData.userDehiveId) {
          userDehiveId = parsedData.userDehiveId;
        } else {
          userDehiveId = data;
        }
      } catch {
        userDehiveId = data;
      }
    } else if (typeof data === "object" && data?.userDehiveId) {
      userDehiveId = data.userDehiveId;
    } else {
      return this.send(client, "error", {
        message:
          "Invalid identity format. Send userDehiveId as string or {userDehiveId: string}",
        code: "INVALID_FORMAT",
        timestamp: new Date().toISOString(),
      });
    }

    if (!userDehiveId || !Types.ObjectId.isValid(userDehiveId)) {
      return this.send(client, "error", {
        message: "Invalid userDehiveId",
        code: "INVALID_USER_ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate user exists in database
    const exists = await this.userDehiveModel.exists({
      _id: new Types.ObjectId(userDehiveId),
    });

    if (!exists) {
      return this.send(client, "error", {
        message: "User not found",
        code: "USER_NOT_FOUND",
        timestamp: new Date().toISOString(),
      });
    }

    const meta = this.meta.get(client);
    if (meta) {
      meta.userDehiveId = userDehiveId;
      void client.join(`user:${userDehiveId}`);

      this.send(client, "identityConfirmed", {
        userDehiveId,
        status: "success",
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log(
        `[CHANNEL-RTC-WS] No meta found for client, creating new one`,
      );
      this.meta.set(client, {
        userDehiveId,
        serverId: undefined,
        channelId: undefined,
      });
      void client.join(`user:${userDehiveId}`);
      console.log(`[CHANNEL-RTC-WS] User identified as ${userDehiveId}`);
      this.send(client, "identityConfirmed", {
        userDehiveId,
        status: "success",
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("joinServer")
  async handleJoinServer(
    @MessageBody()
    data:
      | {
          server_id: string;
        }
      | string,
    @ConnectedSocket() client: Socket,
  ) {
    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    // Parse data if it's a string
    let parsedData: {
      server_id: string;
    };

    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch {
        return this.send(client, "error", {
          message: "Invalid JSON format",
          code: "INVALID_FORMAT",
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      parsedData = data;
    }

    console.log("[CHANNEL-RTC-WS] ========================================");
    console.log("[CHANNEL-RTC-WS] joinServer event received");
    console.log("[CHANNEL-RTC-WS] Parsed data:", parsedData);
    console.log("[CHANNEL-RTC-WS] server_id:", parsedData?.server_id);
    console.log("[CHANNEL-RTC-WS] User ID:", userId);
    console.log("[CHANNEL-RTC-WS] ========================================");

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Store server info in meta
      meta.serverId = parsedData.server_id;
      this.meta.set(client, meta);

      // Join socket to server room
      await client.join(`server:${parsedData.server_id}`);

      console.log(
        `[CHANNEL-RTC-WS] User ${userId} joined server ${parsedData.server_id}`,
      );

      // Notify user
      this.send(client, "serverJoined", {
        server_id: parsedData.server_id,
        status: "success",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[CHANNEL-RTC-WS] Error joining server:", error);
      this.send(client, "error", {
        message: "Failed to join server",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("joinChannel")
  async handleJoinChannel(
    @MessageBody()
    data:
      | {
          channel_id: string;
        }
      | string,
    @ConnectedSocket() client: Socket,
  ) {
    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    console.log("[CHANNEL-RTC-WS] Meta debug:", {
      hasMeta: !!meta,
      userId: userId,
    });

    // Parse data if it's a string
    let parsedData: {
      channel_id: string;
    };

    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch {
        return this.send(client, "error", {
          message: "Invalid JSON format",
          code: "INVALID_FORMAT",
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      parsedData = data;
    }

    console.log("[CHANNEL-RTC-WS] ========================================");
    console.log("[CHANNEL-RTC-WS] joinChannel event received");
    console.log("[CHANNEL-RTC-WS] Parsed data:", parsedData);
    console.log("[CHANNEL-RTC-WS] channel_id:", parsedData?.channel_id);
    console.log("[CHANNEL-RTC-WS] User ID:", userId);
    console.log("[CHANNEL-RTC-WS] ========================================");

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user has joined a server first
    if (!meta.serverId) {
      return this.send(client, "error", {
        message: "Please join a server first before joining a channel",
        code: "SERVER_NOT_JOINED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      console.log("[CHANNEL-RTC-WS] Using service for join channel");

      // Join channel using service
      const result = await this.service.joinChannel(
        userId,
        parsedData.channel_id,
      );

      // Store channel info in meta (store logical channel id only)
      meta.channelId = parsedData.channel_id;
      this.meta.set(client, meta);

      // Join socket to channel room
      await client.join(`channel:${parsedData.channel_id}`);

      // Notify user
      this.send(client, "channelJoined", {
        channel_id: parsedData.channel_id,
        status: result.call.status,
        participants: result.otherParticipants,
        timestamp: new Date().toISOString(),
      });

      // Get user profile for userJoinedChannel event
      const userProfile = await this.getUserProfile(userId);

      // Only emit if profile was successfully fetched
      if (userProfile) {
        this.server
          .to(`channel:${parsedData.channel_id}`)
          .emit("userJoinedChannel", {
            channel_id: parsedData.channel_id,
            user_id: userId,
            user_info: {
              _id: userProfile._id,
              username: userProfile.username,
              display_name: userProfile.display_name,
              avatar_ipfs_hash: userProfile.avatar_ipfs_hash,
            },
            timestamp: new Date().toISOString(),
          });
      } else {
        console.warn(
          `[CHANNEL-RTC-WS] Could not fetch profile for ${userId}, skipping userJoinedChannel event`,
        );
      }
    } catch (error) {
      console.error("[CHANNEL-RTC-WS] Error joining channel:", error);
      this.send(client, "error", {
        message: "Failed to join channel",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("leaveChannel")
  async handleLeaveChannel(
    @MessageBody()
    data: { channel_id: string } | string,
    @ConnectedSocket() client: Socket,
  ) {
    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    // Parse data if it's a string
    let parsedData: { channel_id: string };

    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch {
        return this.send(client, "error", {
          message: "Invalid JSON format",
          code: "INVALID_FORMAT",
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      parsedData = data;
    }

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      console.log("[CHANNEL-RTC-WS] Using service for leave channel");

      // Leave channel using service
      const result = await this.service.leaveCall(
        userId,
        parsedData.channel_id,
      );

      // Clear meta info
      meta.channelId = undefined;
      this.meta.set(client, meta);

      // Leave socket from channel room
      await client.leave(`channel:${parsedData.channel_id}`);

      // Notify user
      this.send(client, "channelLeft", {
        channel_id: parsedData.channel_id,
        status: result.call.status,
        timestamp: new Date().toISOString(),
      });

      // Notify other participants in channel
      this.server
        .to(`channel:${parsedData.channel_id}`)
        .emit("userLeftChannel", {
          channel_id: parsedData.channel_id,
          user_id: userId,
          timestamp: new Date().toISOString(),
        });
    } catch (error) {
      console.error("[CHANNEL-RTC-WS] Error leaving channel:", error);
      this.send(client, "error", {
        message: "Failed to leave channel",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("leaveServer")
  async handleLeaveServer(
    @MessageBody()
    data:
      | {
          server_id: string;
        }
      | string,
    @ConnectedSocket() client: Socket,
  ) {
    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    // Parse data if it's a string
    let parsedData: {
      server_id: string;
    };

    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch {
        return this.send(client, "error", {
          message: "Invalid JSON format",
          code: "INVALID_FORMAT",
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      parsedData = data;
    }

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // If user is in a channel, they must leave channel first
      if (meta.channelId) {
        return this.send(client, "error", {
          message: "Please leave the voice channel before leaving the server",
          code: "CHANNEL_ACTIVE",
          timestamp: new Date().toISOString(),
        });
      }

      // Clear server info in meta
      meta.serverId = undefined;
      this.meta.set(client, meta);

      // Leave socket from server room
      await client.leave(`server:${parsedData.server_id}`);

      console.log(
        `[CHANNEL-RTC-WS] User ${userId} left server ${parsedData.server_id}`,
      );

      // Notify user
      this.send(client, "serverLeft", {
        server_id: parsedData.server_id,
        status: "success",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[CHANNEL-RTC-WS] Error leaving server:", error);
      this.send(client, "error", {
        message: "Failed to leave server",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    console.log(`[CHANNEL-RTC-WS] Ping received from ${client.id}`);
    this.send(client, "pong", {
      timestamp: new Date().toISOString(),
      message: "pong",
    });
  }
}

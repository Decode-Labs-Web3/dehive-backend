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

type SocketMeta = {
  userDehiveId?: string;
  channelId?: string;
};

@WebSocketGateway({
  namespace: "/channel-rtc",
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
  }

  private send(client: Socket, event: string, data: unknown) {
    const serializedData = JSON.parse(JSON.stringify(data));
    client.emit(event, serializedData);
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
    console.log(`[CHANNEL-RTC-WS] Identity request received:`, data);
    console.log(`[CHANNEL-RTC-WS] Data type:`, typeof data);
    console.log(`[CHANNEL-RTC-WS] Is object:`, typeof data === "object");

    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    let userDehiveId: string;

    console.log(`[CHANNEL-RTC-WS] Parsing data...`);

    if (typeof data === "string") {
      console.log(
        `[CHANNEL-RTC-WS] String format detected, trying to parse as JSON`,
      );
      try {
        const parsedData = JSON.parse(data);
        if (parsedData.userDehiveId) {
          console.log(`[CHANNEL-RTC-WS] Successfully parsed JSON string`);
          userDehiveId = parsedData.userDehiveId;
        } else {
          console.log(
            `[CHANNEL-RTC-WS] Parsed JSON but no userDehiveId found, treating as plain string`,
          );
          userDehiveId = data;
        }
      } catch {
        console.log(
          `[CHANNEL-RTC-WS] Failed to parse JSON, treating as plain string`,
        );
        userDehiveId = data;
      }
    } else if (typeof data === "object" && data?.userDehiveId) {
      console.log(`[CHANNEL-RTC-WS] Object format detected:`, data);
      userDehiveId = data.userDehiveId;
      console.log(`[CHANNEL-RTC-WS] Extracted userDehiveId:`, userDehiveId);
    } else {
      console.log(`[CHANNEL-RTC-WS] Invalid format, returning error`);
      return this.send(client, "error", {
        message:
          "Invalid identity format. Send userDehiveId as string or {userDehiveId: string}",
        code: "INVALID_FORMAT",
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[CHANNEL-RTC-WS] Validating userDehiveId:`, userDehiveId);
    if (!userDehiveId || !Types.ObjectId.isValid(userDehiveId)) {
      console.log(`[CHANNEL-RTC-WS] Invalid userDehiveId, returning error`);
      return this.send(client, "error", {
        message: "Invalid userDehiveId",
        code: "INVALID_USER_ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate user exists in database
    console.log(`[CHANNEL-RTC-WS] Checking if user exists: ${userDehiveId}`);
    const exists = await this.userDehiveModel.exists({
      _id: new Types.ObjectId(userDehiveId),
    });

    console.log(`[CHANNEL-RTC-WS] User exists result: ${exists}`);
    if (!exists) {
      console.log(
        `[CHANNEL-RTC-WS] User not found in database: ${userDehiveId}`,
      );
      return this.send(client, "error", {
        message: "User not found",
        code: "USER_NOT_FOUND",
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `[CHANNEL-RTC-WS] Accepting identity for user: ${userDehiveId}`,
    );

    console.log(`[CHANNEL-RTC-WS] Getting meta for client:`, client.id);
    const meta = this.meta.get(client);
    console.log(`[CHANNEL-RTC-WS] Meta found:`, !!meta);

    if (meta) {
      meta.userDehiveId = userDehiveId;
      void client.join(`user:${userDehiveId}`);
      console.log(`[CHANNEL-RTC-WS] User identified as ${userDehiveId}`);
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

      // Notify other participants in channel
      this.server
        .to(`channel:${parsedData.channel_id}`)
        .emit("userJoinedChannel", {
          channel_id: parsedData.channel_id,
          user_id: userId,
          user_info: {
            _id: userId,
            username: "user_" + userId.substring(0, 8),
            display_name: "User " + userId.substring(0, 8),
            avatar_ipfs_hash: "",
          },
          timestamp: new Date().toISOString(),
        });
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

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    console.log(`[CHANNEL-RTC-WS] Ping received from ${client.id}`);
    this.send(client, "pong", {
      timestamp: new Date().toISOString(),
      message: "pong",
    });
  }
}

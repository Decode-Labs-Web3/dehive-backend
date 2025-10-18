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
  sessionId?: string;
  callId?: string;
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

  private readonly meta = new WeakMap<Socket, SocketMeta>();

  constructor(
    private readonly service: ChannelCallService,
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    @InjectModel(ChannelCall.name)
    private readonly channelCallModel: Model<ChannelCallDocument>,
    @InjectModel(ChannelParticipant.name)
    private readonly participantModel: Model<ChannelParticipantDocument>,
  ) {}

  private send(client: Socket, event: string, data: unknown) {
    const serializedData = JSON.parse(JSON.stringify(data));
    client.emit(event, serializedData);
  }

  handleConnection(client: Socket) {
    console.log(
      "[CHANNEL-RTC-WS] Client connected to /channel-rtc namespace. Awaiting identity.",
    );
    this.meta.set(client, {});
  }

  handleDisconnect(client: Socket) {
    const meta = this.meta.get(client);
    if (meta?.userDehiveId) {
      console.log(
        `[CHANNEL-RTC-WS] User ${meta.userDehiveId} disconnected from /channel-rtc`,
      );
      this.service.handleUserDisconnect(meta.userDehiveId);
    }
    this.meta.delete(client);
  }

  @SubscribeMessage("identity")
  async handleIdentity(
    @MessageBody() userDehiveId: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log("[CHANNEL-RTC-WS] Identity request:", userDehiveId);

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(userDehiveId)) {
      return this.send(client, "error", {
        message: "Invalid user ID format",
        code: "INVALID_USER_ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Store user info in socket meta
    const meta = this.meta.get(client) || {};
    meta.userDehiveId = userDehiveId;
    this.meta.set(client, meta);

    // Join user to their personal room
    await client.join(`user:${userDehiveId}`);

    this.send(client, "identityConfirmed", {
      userDehiveId,
      status: "success",
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[CHANNEL-RTC-WS] User ${userDehiveId} identified and joined personal room`,
    );
  }

  @SubscribeMessage("joinChannel")
  async handleJoinChannel(
    @MessageBody()
    data:
      | {
          channel_id: string;
          with_video?: boolean;
          with_audio?: boolean;
        }
      | string,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    // Parse data if it's a string
    let parsedData: {
      channel_id: string;
      with_video?: boolean;
      with_audio?: boolean;
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
      // Join channel using service
      const result = await this.service.joinChannel(
        userId,
        parsedData.channel_id,
        parsedData.with_video ?? false,
        parsedData.with_audio ?? true,
      );

      // Join socket to channel room
      await client.join(`channel:${parsedData.channel_id}`);

      // Notify user
      this.send(client, "channelJoined", {
        call_id: result.call._id,
        channel_id: parsedData.channel_id,
        status: result.call.status,
        stream_info: result.streamInfo,
        participants: result.otherParticipants,
        timestamp: new Date().toISOString(),
      });

      // Notify other participants in channel
      this.server
        .to(`channel:${parsedData.channel_id}`)
        .emit("userJoinedChannel", {
          call_id: result.call._id,
          channel_id: parsedData.channel_id,
          user_id: userId,
          user_info: {
            _id: userId,
            username: "user_" + userId.substring(0, 8),
            display_name: "User " + userId.substring(0, 8),
            avatar_ipfs_hash: "",
            bio: "User profile",
            status: "ACTIVE",
            is_active: true,
          },
          with_video: parsedData.with_video ?? false,
          with_audio: parsedData.with_audio ?? true,
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
      // Leave channel using service
      const result = await this.service.leaveCall(
        userId,
        parsedData.channel_id,
      );

      // Leave socket from channel room
      await client.leave(`channel:${parsedData.channel_id}`);

      // Notify user
      this.send(client, "channelLeft", {
        call_id: result.call._id,
        channel_id: parsedData.channel_id,
        status: result.call.status,
        timestamp: new Date().toISOString(),
      });

      // Notify other participants in channel
      this.server
        .to(`channel:${parsedData.channel_id}`)
        .emit("userLeftChannel", {
          call_id: result.call._id,
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
    this.send(client, "pong", { timestamp: new Date().toISOString() });
  }
}

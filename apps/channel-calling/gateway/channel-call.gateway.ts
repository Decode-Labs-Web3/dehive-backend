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
    this.meta = new Map<Socket, SocketMeta>();
  }

  private send(client: Socket, event: string, data: unknown) {
    // Production: emit object (default for frontend)
    // client.emit(event, data);

    // Debug (Insomnia): emit pretty JSON string
    const serializedData = JSON.stringify(data, null, 2);
    client.emit(event, serializedData);
  }

  private broadcast(room: string, event: string, data: unknown) {
    // Production: emit object (default for frontend)
    // this.server.to(room).emit(event, data);

    // Debug (Insomnia): emit pretty JSON string
    const serializedData = JSON.stringify(data, null, 2);
    this.server.to(room).emit(event, serializedData);
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
    } catch {
      return null;
    }
  }

  handleConnection(client: Socket) {
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
      try {
        this.service.handleUserDisconnect(meta.userDehiveId, meta.channelId);
      } catch {
        // Silent fail
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
      this.meta.set(client, {
        userDehiveId,
        serverId: undefined,
        channelId: undefined,
      });
      void client.join(`user:${userDehiveId}`);
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

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      meta.serverId = parsedData.server_id;
      this.meta.set(client, meta);

      await client.join(`server:${parsedData.server_id}`);

      this.send(client, "serverJoined", {
        server_id: parsedData.server_id,
        status: "success",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
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

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    if (!meta.serverId) {
      return this.send(client, "error", {
        message: "Please join a server first before joining a channel",
        code: "SERVER_NOT_JOINED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const result = await this.service.joinChannel(
        userId,
        parsedData.channel_id,
      );

      meta.channelId = parsedData.channel_id;
      this.meta.set(client, meta);

      await client.join(`channel:${parsedData.channel_id}`);

      this.send(client, "channelJoined", {
        channel_id: parsedData.channel_id,
        status: result.call.status,
        participants: result.otherParticipants,
        timestamp: new Date().toISOString(),
      });

      const userProfile = await this.getUserProfile(userId);

      if (userProfile) {
        this.broadcast(
          `channel:${parsedData.channel_id}`,
          "userJoinedChannel",
          {
            channel_id: parsedData.channel_id,
            user_id: userId,
            user_info: {
              _id: userProfile._id,
              username: userProfile.username,
              display_name: userProfile.display_name,
              avatar_ipfs_hash: userProfile.avatar_ipfs_hash,
            },
            timestamp: new Date().toISOString(),
          },
        );
      }
    } catch (error) {
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
      const result = await this.service.leaveCall(
        userId,
        parsedData.channel_id,
      );

      meta.channelId = undefined;
      this.meta.set(client, meta);

      await client.leave(`channel:${parsedData.channel_id}`);

      this.send(client, "channelLeft", {
        channel_id: parsedData.channel_id,
        status: result.call.status,
        timestamp: new Date().toISOString(),
      });

      const userProfile = await this.getUserProfile(userId);

      if (userProfile) {
        this.broadcast(`channel:${parsedData.channel_id}`, "userLeftChannel", {
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
        this.broadcast(`channel:${parsedData.channel_id}`, "userLeftChannel", {
          channel_id: parsedData.channel_id,
          user_id: userId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.send(client, "error", {
        message: "Failed to leave channel",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }
}

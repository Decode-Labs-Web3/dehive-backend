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
    @InjectModel(ChannelParticipant.name)
    private readonly participantModel: Model<ChannelParticipantDocument>,
    private readonly decodeApiClient: DecodeApiClient,
  ) {
    this.meta = new Map<Socket, SocketMeta>();
  }

  private send(client: Socket, event: string, data: unknown) {
    // Production: emit object (default for frontend)
    client.emit(event, data);

    // Debug (Insomnia): emit pretty JSON string
    // const serializedData = JSON.stringify(data, null, 2);
    // client.emit(event, serializedData);
  }

  private broadcast(room: string, event: string, data: unknown) {
    // Production: emit object (default for frontend)
    this.server.to(room).emit(event, data);

    // Debug (Insomnia): emit pretty JSON string
    // const serializedData = JSON.stringify(data, null, 2);
    // this.server.to(room).emit(event, serializedData);
  }

  private async getUserProfile(
    userDehiveId: string,
    channelId: string,
  ): Promise<{
    _id: string;
    username: string;
    display_name: string;
    avatar_ipfs_hash: string;
    isCamera: boolean;
    isMic: boolean;
    isHeadphone: boolean;
    isLive: boolean;
  } | null> {
    try {
      const profile =
        await this.decodeApiClient.getUserProfilePublic(userDehiveId);

      if (!profile) {
        return null;
      }

      // Get participant status
      const participant = await this.participantModel
        .findOne({ channel_id: channelId, user_id: userDehiveId })
        .exec();

      return {
        _id: userDehiveId,
        username: profile.username,
        display_name: profile.display_name,
        avatar_ipfs_hash: profile.avatar_ipfs_hash,
        isCamera: participant?.isCamera || false,
        isMic: participant?.isMic || false,
        isHeadphone: participant?.isHeadphone || false,
        isLive: participant?.isLive || false,
      };
    } catch {
      return null;
    }
  }

  handleConnection(client: Socket) {
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }
    this.meta.set(client, {
      userDehiveId: undefined,
      serverId: undefined,
      channelId: undefined,
    });
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
      });
    }

    if (!userDehiveId || !Types.ObjectId.isValid(userDehiveId)) {
      return this.send(client, "error", {
        message: "Invalid userDehiveId",
        code: "INVALID_USER_ID",
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
      });
    }

    const meta = this.meta.get(client);
    if (meta) {
      meta.userDehiveId = userDehiveId;
      void client.join(`user:${userDehiveId}`);

      this.send(client, "identityConfirmed", {
        userDehiveId,
        status: "success",
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
      server_id?: string;
      serverId?: string;
    };

    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch {
        return this.send(client, "error", {
          message: "Invalid JSON format",
          code: "INVALID_FORMAT",
        });
      }
    } else {
      parsedData = data;
    }

    // Support both server_id and serverId
    const serverId = parsedData.server_id || parsedData.serverId;

    if (!serverId) {
      return this.send(client, "error", {
        message: "server_id is required",
        code: "INVALID_REQUEST",
      });
    }

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    try {
      if (meta) {
        meta.serverId = serverId;
        this.meta.set(client, meta);
      } else {
        this.meta.set(client, {
          userDehiveId: userId,
          serverId: serverId,
          channelId: undefined,
        });
      }

      await client.join(`server:${serverId}`);

      // Get all channels in server with their active participants
      const serverChannelsData =
        await this.service.getServerChannelsWithParticipants(serverId);

      this.send(client, "serverJoined", {
        server_id: serverId,
        status: "success",
        channels: serverChannelsData.channels,
      });
    } catch (error) {
      this.send(client, "error", {
        message: "Failed to join server",
        details: error instanceof Error ? error.message : String(error),
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
      channel_id?: string;
      channelId?: string;
    };

    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch {
        return this.send(client, "error", {
          message: "Invalid JSON format",
          code: "INVALID_FORMAT",
        });
      }
    } else {
      parsedData = data;
    }

    // Support both channel_id and channelId
    const channelId = parsedData.channel_id || parsedData.channelId;

    if (!channelId) {
      return this.send(client, "error", {
        message: "channel_id is required",
        code: "INVALID_REQUEST",
      });
    }

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    if (!meta || !meta.serverId) {
      return this.send(client, "error", {
        message: "Please join a server first before joining a channel",
        code: "SERVER_NOT_JOINED",
      });
    }

    try {
      const result = await this.service.joinChannel(userId, channelId);

      if (meta) {
        meta.channelId = channelId;
        this.meta.set(client, meta);
      } else {
        this.meta.set(client, {
          userDehiveId: userId,
          serverId: undefined,
          channelId: channelId,
        });
      }

      await client.join(`channel:${channelId}`);

      this.send(client, "channelJoined", {
        channel_id: channelId,
        status: result.call.status,
        participants: result.otherParticipants,
      });

      const userProfile = await this.getUserProfile(userId, channelId);

      if (userProfile) {
        this.broadcast(`channel:${channelId}`, "userJoinedChannel", {
          channel_id: channelId,
          user_id: userId,
          user_info: {
            _id: userProfile._id,
            username: userProfile.username,
            display_name: userProfile.display_name,
            avatar_ipfs_hash: userProfile.avatar_ipfs_hash,
            isCamera: userProfile.isCamera,
            isMic: userProfile.isMic,
            isHeadphone: userProfile.isHeadphone,
            isLive: userProfile.isLive,
          },
        });
      }
    } catch (error) {
      this.send(client, "error", {
        message: "Failed to join channel",
        details: error instanceof Error ? error.message : String(error),
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
    let parsedData: { channel_id?: string; channelId?: string };

    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch {
        return this.send(client, "error", {
          message: "Invalid JSON format",
          code: "INVALID_FORMAT",
        });
      }
    } else {
      parsedData = data;
    }

    // Support both channel_id and channelId
    const channelId = parsedData.channel_id || parsedData.channelId;

    if (!channelId) {
      return this.send(client, "error", {
        message: "channel_id is required",
        code: "INVALID_REQUEST",
      });
    }

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    try {
      // Get user profile with status BEFORE leaving
      const userProfile = await this.getUserProfile(userId, channelId);

      const result = await this.service.leaveChannel(userId, channelId);

      if (meta) {
        meta.channelId = undefined;
        this.meta.set(client, meta);
      }

      await client.leave(`channel:${channelId}`);

      if (userProfile) {
        this.send(client, "channelLeft", {
          channel_id: channelId,
          status: result.call.status,
          user_info: {
            _id: userProfile._id,
            username: userProfile.username,
            display_name: userProfile.display_name,
            avatar_ipfs_hash: userProfile.avatar_ipfs_hash,
            isCamera: userProfile.isCamera,
            isMic: userProfile.isMic,
            isHeadphone: userProfile.isHeadphone,
            isLive: userProfile.isLive,
          },
        });
      } else {
        this.send(client, "channelLeft", {
          channel_id: channelId,
          status: result.call.status,
        });
      }

      if (userProfile) {
        this.broadcast(`channel:${channelId}`, "userLeftChannel", {
          channel_id: channelId,
          user_id: userId,
          user_info: {
            _id: userProfile._id,
            username: userProfile.username,
            display_name: userProfile.display_name,
            avatar_ipfs_hash: userProfile.avatar_ipfs_hash,
            isCamera: userProfile.isCamera,
            isMic: userProfile.isMic,
            isHeadphone: userProfile.isHeadphone,
            isLive: userProfile.isLive,
          },
        });
      } else {
        this.broadcast(`channel:${channelId}`, "userLeftChannel", {
          channel_id: channelId,
          user_id: userId,
        });
      }
    } catch (error) {
      this.send(client, "error", {
        message: "Failed to leave channel",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("updateUserStatus")
  async handleUpdateUserStatus(
    @MessageBody()
    data:
      | {
          isCamera?: boolean;
          isMic?: boolean;
          isHeadphone?: boolean;
          isLive?: boolean;
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
    const channelId = meta?.channelId;

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    if (!channelId) {
      return this.send(client, "error", {
        message: "Please join a channel first",
        code: "CHANNEL_NOT_JOINED",
      });
    }

    // Parse data if it's a string
    let parsedData: {
      isCamera?: boolean;
      isMic?: boolean;
      isHeadphone?: boolean;
      isLive?: boolean;
    };

    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch {
        return this.send(client, "error", {
          message: "Invalid JSON format",
          code: "INVALID_FORMAT",
        });
      }
    } else {
      parsedData = data;
    }

    try {
      // Update user status
      const result = await this.service.updateUserStatus(userId, channelId, {
        isCamera: parsedData.isCamera,
        isMic: parsedData.isMic,
        isHeadphone: parsedData.isHeadphone,
        isLive: parsedData.isLive,
      });

      if (!result.success || !result.participant) {
        return this.send(client, "error", {
          message: "Failed to update user status",
          code: "UPDATE_FAILED",
        });
      }

      const statusData = {
        channel_id: channelId,
        user_info: {
          _id: result.participant._id,
          username: result.participant.username,
          display_name: result.participant.display_name,
          avatar_ipfs_hash: result.participant.avatar_ipfs_hash,
          isCamera: result.participant.isCamera,
          isMic: result.participant.isMic,
          isHeadphone: result.participant.isHeadphone,
          isLive: result.participant.isLive,
        },
      };

      // Broadcast to ALL users in the channel (including the sender)
      this.broadcast(`channel:${channelId}`, "userStatusChanged", statusData);
    } catch (error) {
      this.send(client, "error", {
        message: "Failed to update user status",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

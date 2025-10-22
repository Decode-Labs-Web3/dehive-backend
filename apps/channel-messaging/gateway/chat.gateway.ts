import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server as IOServer, Socket } from "socket.io";
import { CreateMessageDto } from "../dto/create-message.dto";
import { MessagingService } from "../src/channel-messaging.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  UserDehive,
  UserDehiveDocument,
} from "../../user-dehive-server/schemas/user-dehive.schema";
import { Server, ServerDocument } from "../../server/schemas/server.schema";
import {
  Category,
  CategoryDocument,
} from "../../server/schemas/category.schema";
import { Channel, ChannelDocument } from "../../server/schemas/channel.schema";
import {
  UserDehiveServer,
  UserDehiveServerDocument,
} from "../../user-dehive-server/schemas/user-dehive-server.schema";

type SocketMeta = {
  userDehiveId?: string;
  currentRooms?: Set<string>;
  isAuthenticated?: boolean;
};

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: IOServer;

  constructor(
    private readonly messagingService: MessagingService,
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    @InjectModel(Server.name)
    private readonly serverModel: Model<ServerDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(UserDehiveServer.name)
    private readonly userDehiveServerModel: Model<UserDehiveServerDocument>,
  ) {}

  private readonly meta = new WeakMap<Socket, SocketMeta>();

  private send(client: Socket, event: string, data: unknown) {
    client.emit(event, data);
  }

  // Helper to emit a pretty-printed JSON string for debugging (Insomnia)
  // Use this only when you need to inspect the payload in a socket.io client that
  // displays raw strings (e.g., Insomnia). Keep calls commented-out in normal flow.
  private sendDebug(client: Socket, event: string, data: unknown) {
    const jsonString = JSON.stringify(data, null, 2);
    client.emit(event, jsonString);
  }

  private async getUserProfile(userDehiveId: string): Promise<{
    username: string;
    display_name: string;
    avatar_ipfs_hash: string | null;
  }> {
    // Use service method to get user profile (same as direct-messaging)
    // Service will check cache first, then fallback
    const userProfile =
      await this.messagingService.getUserProfile(userDehiveId);

    return {
      username: userProfile.username || `User_${userDehiveId}`,
      display_name: userProfile.display_name || `User_${userDehiveId}`,
      avatar_ipfs_hash:
        userProfile.avatar_ipfs_hash || userProfile.avatar || null,
    };
  }

  /**
   * Helper function to format message data consistently for WebSocket responses
   * This ensures WebSocket responses match API response format and always include user profile
   */
  private async formatMessageData(message: {
    _id: unknown;
    channelId: unknown;
    senderId: unknown;
    content: unknown;
    attachments?: unknown[];
    isEdited?: boolean;
    isDeleted?: boolean;
    replyTo?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  }) {
    // Get user profile for sender - try cache first, then fallback
    const userProfile = await this.getUserProfile(String(message.senderId));

    return {
      _id: message._id,
      channelId: message.channelId,
      sender: {
        dehive_id: message.senderId,
        username: userProfile.username,
        display_name: userProfile.display_name,
        avatar_ipfs_hash: userProfile.avatar_ipfs_hash,
      },
      content: message.content,
      attachments: message.attachments || [],
      isEdited: message.isEdited || false,
      isDeleted: message.isDeleted || false,
      replyTo: message.replyTo || null,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  handleConnection(client: Socket) {
    console.log("[WebSocket] Client connected. Awaiting identity.");
    this.meta.set(client, {
      currentRooms: new Set<string>(),
      isAuthenticated: false,
    });
  }

  handleDisconnect(client: Socket) {
    console.log("[WebSocket] Client disconnected.");
    const meta = this.meta.get(client);
    if (meta) {
      // Leave all rooms before disconnecting
      if (meta.currentRooms) {
        meta.currentRooms.forEach((roomId) => {
          client.leave(roomId);
        });
      }
      this.meta.delete(client);
    }
  }

  @SubscribeMessage("identity")
  async handleIdentity(
    @MessageBody() data: string | { userDehiveId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Parse data - support both string and object format (same as direct-messaging)
    let userDehiveId: string;

    if (typeof data === "string") {
      userDehiveId = data;
    } else if (typeof data === "object" && data?.userDehiveId) {
      userDehiveId = data.userDehiveId;
    } else {
      return this.send(client, "error", {
        message:
          "Invalid identity format. Send userDehiveId as string or {userDehiveId: string}",
      });
    }

    if (!userDehiveId || typeof userDehiveId !== "string") {
      return this.send(client, "error", {
        message: "Invalid userDehiveId.",
      });
    }

    const meta = this.meta.get(client);
    if (!meta) {
      return this.send(client, "error", {
        message: "Internal server error: No client metadata found.",
      });
    }
    if (!Types.ObjectId.isValid(userDehiveId)) {
      return this.send(client, "error", {
        message: "Invalid userDehiveId format.",
      });
    }
    try {
      const exists = await this.userDehiveModel.exists({
        _id: new Types.ObjectId(userDehiveId),
      });
      if (!exists) {
        console.log(`[WebSocket] UserDehive not found: ${userDehiveId}`);
        return this.send(client, "error", {
          message: "UserDehive not found.",
        });
      }
    } catch {
      return this.send(client, "error", {
        message: "Database error while checking user existence.",
      });
    }
    console.log(
      `[WebSocket] Client is identifying as UserDehive ID: ${userDehiveId}`,
    );

    meta.userDehiveId = userDehiveId;
    meta.isAuthenticated = true;

    try {
      // Production: emit object (default behavior)
      // this.send(client, "identityConfirmed", {
      //   message: `You are now identified as ${userDehiveId}`,
      //   userDehiveId: userDehiveId,
      // });

      // Debug (Insomnia): uncomment below to emit pretty JSON string
      this.sendDebug(client, "identityConfirmed", {
        message: `You are now identified as ${userDehiveId}`,
        userDehiveId: userDehiveId,
      });

      console.log(`[WebSocket] identityConfirmed sent successfully`);
    } catch (error) {
      console.error(`[WebSocket] Error sending identityConfirmed:`, error);
    }
  }

  @SubscribeMessage("joinServer")
  async handleJoinServer(
    @MessageBody()
    data: string | { serverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    if (!meta?.userDehiveId || !meta?.isAuthenticated) {
      return this.send(client, "error", {
        message:
          'Please identify yourself first by sending an "identity" event.',
      });
    }

    // Parse JSON string if needed
    let parsedData: { serverId: string };
    try {
      if (typeof data === "string") {
        parsedData = JSON.parse(data);
      } else {
        parsedData = data;
      }
    } catch (error) {
      return this.send(client, "error", {
        message: "Invalid JSON payload.",
        details: {
          received: data,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    const { serverId } = parsedData;

    // Debug logging
    console.log("[WebSocket] joinServer raw data:", data);
    console.log(
      "[WebSocket] joinServer parsed data:",
      JSON.stringify(parsedData, null, 2),
    );
    console.log("[WebSocket] Extracted serverId:", serverId);

    if (!serverId || !Types.ObjectId.isValid(serverId)) {
      console.log("[WebSocket] Validation failed:", {
        serverId: { value: serverId, valid: Types.ObjectId.isValid(serverId) },
      });

      return this.send(client, "error", {
        message:
          "Invalid payload. serverId is required and must be a valid ObjectId.",
        details: {
          received: data,
          extracted: { serverId },
        },
      });
    }

    try {
      console.log("[WebSocket] Checking user membership...");
      console.log("[WebSocket] Query params:", {
        userDehiveId: meta.userDehiveId,
        serverId: serverId,
      });

      // Check if user is member of this server
      const isMember = await this.userDehiveServerModel.findOne({
        user_dehive_id: meta.userDehiveId,
        server_id: new Types.ObjectId(serverId),
      });

      if (!isMember) {
        console.log("[WebSocket] User is not a member of server:", serverId);
        return this.send(client, "error", {
          message: "Access denied. You are not a member of this server.",
          details: {
            serverId,
            userDehiveId: meta.userDehiveId,
          },
        });
      }

      console.log("[WebSocket] User membership confirmed:", isMember);

      // Verify server exists
      const server = await this.serverModel.findById(serverId);
      if (!server) {
        console.log("[WebSocket] Server not found:", serverId);
        return this.send(client, "error", {
          message: "Server not found.",
          details: { serverId },
        });
      }

      console.log("[WebSocket] Server validation passed");

      // Leave previous rooms if any
      if (meta.currentRooms) {
        meta.currentRooms.forEach((roomId) => {
          client.leave(roomId);
        });
        meta.currentRooms.clear();
      }

      // Join server room - user will receive all messages from all channels in this server
      await client.join(`server:${serverId}`);
      meta.currentRooms?.add(`server:${serverId}`);

      console.log(
        `[WebSocket] ✅ SUCCESS: User ${meta.userDehiveId} joined server ${serverId}`,
      );
      console.log(`[WebSocket] ✅ SERVER ID: ${serverId}`);
      console.log(`[WebSocket] ✅ ROOM JOINED: server:${serverId}`);

      // Production: emit object (default behavior)
      // this.send(client, "joinedServer", {
      //   serverId,
      //   message: "Joined server room successfully. You will receive all messages from all channels in this server.",
      // });

      // Debug (Insomnia): uncomment below to emit pretty JSON string
      this.sendDebug(client, "joinedServer", {
        serverId,
        message:
          "Joined server room successfully. You will receive all messages from all channels in this server.",
      });
    } catch (error) {
      console.error("[WebSocket] Error handling joinServer:", error);
      this.send(client, "error", {
        message: "Failed to join server.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("sendMessage")
  async handleMessage(
    @MessageBody() data: string | CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    if (!meta?.userDehiveId || !meta?.isAuthenticated) {
      return this.send(client, "error", {
        message: "Please identify yourself before sending a message.",
      });
    }

    try {
      // Parse JSON string if needed
      let parsedData: CreateMessageDto;
      if (typeof data === "string") {
        parsedData = JSON.parse(data);
      } else {
        parsedData = data;
      }

      if (!parsedData || typeof parsedData !== "object") {
        return this.send(client, "error", {
          message: "Invalid payload.",
        });
      }
      const channelId = parsedData.channelId;
      if (!channelId || !Types.ObjectId.isValid(channelId)) {
        return this.send(client, "error", {
          message: "Invalid channelId.",
        });
      }
      if (typeof parsedData.content !== "string") {
        return this.send(client, "error", {
          message: "Content must be a string (0-2000 chars).",
        });
      }
      if (String(parsedData.content ?? "").length > 2000) {
        return this.send(client, "error", {
          message: "Content must not exceed 2000 characters.",
        });
      }
      if (!Array.isArray(parsedData.uploadIds)) {
        return this.send(client, "error", {
          message: "uploadIds is required and must be an array",
        });
      }
      if (parsedData.uploadIds.length > 0) {
        const allValid = parsedData.uploadIds.every((id: unknown) => {
          return typeof id === "string" && Types.ObjectId.isValid(id);
        });
        if (!allValid) {
          return this.send(client, "error", {
            message: "One or more uploadIds are invalid",
          });
        }
      }

      // Validate replyTo if provided
      if (parsedData.replyTo !== undefined && parsedData.replyTo !== null) {
        if (
          typeof parsedData.replyTo !== "string" ||
          !Types.ObjectId.isValid(parsedData.replyTo)
        ) {
          return this.send(client, "error", {
            message: "replyTo must be a valid message ID",
          });
        }
      }

      console.log(
        `[WebSocket] 📨 SEND MESSAGE: User ${meta.userDehiveId} sending to channel ${channelId}`,
      );
      console.log(`[WebSocket] 📨 MESSAGE CONTENT: "${parsedData.content}"`);
      console.log(
        `[WebSocket] 📨 UPLOAD IDS: ${JSON.stringify(parsedData.uploadIds)}`,
      );

      const savedMessage = (await this.messagingService.createMessage(
        parsedData,
        meta.userDehiveId,
      )) as {
        _id: string;
        conversationId: string;
        senderId: string;
        content: string;
        attachments?: unknown[];
        isEdited?: boolean;
        isDeleted?: boolean;
        replyTo?: string;
        createdAt?: Date;
        updatedAt?: Date;
      };

      console.log(`[WebSocket] ✅ MESSAGE SAVED: ${savedMessage._id}`);

      // Get channel to find server_id
      const channel = await this.channelModel.findById(channelId);
      if (!channel) {
        return this.send(client, "error", {
          message: "Channel not found",
        });
      }

      // Get category to find server_id
      const category = await this.categoryModel.findById(channel.category_id);
      if (!category) {
        return this.send(client, "error", {
          message: "Category not found",
        });
      }

      const serverId = category.server_id.toString();

      // Format message with user profile (same as direct-messaging)
      const messageToBroadcast = await this.formatMessageData({
        _id: savedMessage._id,
        channelId: channelId,
        senderId: savedMessage.senderId,
        content: savedMessage.content,
        attachments: savedMessage.attachments,
        isEdited: savedMessage.isEdited,
        isDeleted: savedMessage.isDeleted,
        replyTo: savedMessage.replyTo,
        createdAt: savedMessage.createdAt,
        updatedAt: savedMessage.updatedAt,
      });

      console.log(
        `[WebSocket] 📢 MESSAGE BROADCASTED to server room: server:${serverId}`,
      );
      console.log(
        `[WebSocket] 📢 BROADCAST DATA:`,
        JSON.stringify(messageToBroadcast, null, 2),
      );

      // Production: emit object (default behavior)
      // Broadcast to all users in the server (not just the channel)
      // this.server
      //   .to(`server:${serverId}`)
      //   .emit("newMessage", messageToBroadcast);

      // Debug (Insomnia): uncomment below to emit pretty JSON string
      const jsonMessage = JSON.stringify(messageToBroadcast, null, 2);
      this.server.to(`server:${serverId}`).emit("newMessage", jsonMessage);
    } catch (error: unknown) {
      console.error("[WebSocket] Error handling message:", error);
      this.send(client, "error", {
        message: "Failed to send message.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("editMessage")
  async handleEditMessage(
    @MessageBody()
    data: string | { messageId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    if (!meta?.userDehiveId || !meta?.isAuthenticated) {
      return this.send(client, "error", {
        message: "Please identify yourself before editing.",
      });
    }
    try {
      // Parse JSON string if needed
      let parsedData: { messageId: string; content: string };
      if (typeof data === "string") {
        parsedData = JSON.parse(data);
      } else {
        parsedData = data;
      }

      const updated = await this.messagingService.editMessage(
        parsedData.messageId,
        meta.userDehiveId,
        parsedData.content,
      );

      // Get channel to find server_id
      const channel = await this.channelModel.findById(updated.channelId);
      if (!channel) {
        return this.send(client, "error", {
          message: "Channel not found",
        });
      }

      // Get category to find server_id
      const category = await this.categoryModel.findById(channel.category_id);
      if (!category) {
        return this.send(client, "error", {
          message: "Category not found",
        });
      }

      const serverId = category.server_id.toString();

      // Format message with user profile (same as direct-messaging)
      const payload = await this.formatMessageData({
        _id: updated._id,
        channelId: updated.channelId,
        senderId: updated.senderId,
        content: updated.content,
        attachments: updated.attachments,
        isEdited: true,
        isDeleted: updated.isDeleted,
        replyTo: updated.replyTo,
        createdAt: (updated as { createdAt?: Date }).createdAt,
        updatedAt: (updated as { updatedAt?: Date }).updatedAt,
      });

      // Production: emit object (default behavior)
      // Broadcast to all users in the server
      // this.server.to(`server:${serverId}`).emit("messageEdited", payload);

      // Debug (Insomnia): uncomment below to emit pretty JSON string
      const jsonPayload = JSON.stringify(payload, null, 2);
      this.server.to(`server:${serverId}`).emit("messageEdited", jsonPayload);
    } catch (error: unknown) {
      this.send(client, "error", {
        message: "Failed to edit message.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("deleteMessage")
  async handleDeleteMessage(
    @MessageBody()
    data: string | { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    if (!meta?.userDehiveId || !meta?.isAuthenticated) {
      return this.send(client, "error", {
        message: "Please identify yourself before deleting.",
      });
    }
    try {
      // Parse JSON string if needed
      let parsedData: { messageId: string };
      if (typeof data === "string") {
        parsedData = JSON.parse(data);
      } else {
        parsedData = data;
      }

      const updated = await this.messagingService.deleteMessage(
        parsedData.messageId,
        meta.userDehiveId,
      );

      // Get channel to find server_id
      const channel = await this.channelModel.findById(updated.channelId);
      if (!channel) {
        return this.send(client, "error", {
          message: "Channel not found",
        });
      }

      // Get category to find server_id
      const category = await this.categoryModel.findById(channel.category_id);
      if (!category) {
        return this.send(client, "error", {
          message: "Category not found",
        });
      }

      const serverId = category.server_id.toString();

      // Format message with user profile (same as direct-messaging)
      const payload = await this.formatMessageData({
        _id: updated._id,
        channelId: updated.channelId,
        senderId: updated.senderId,
        content: updated.content,
        attachments: updated.attachments,
        isEdited: updated.isEdited,
        isDeleted: true, // Override to true for delete events
        replyTo: updated.replyTo,
        createdAt: (updated as { createdAt?: Date }).createdAt,
        updatedAt: (updated as { updatedAt?: Date }).updatedAt,
      });

      // Production: emit object (default behavior)
      // Broadcast to all users in the server
      // this.server.to(`server:${serverId}`).emit("messageDeleted", payload);

      // Debug (Insomnia): uncomment below to emit pretty JSON string
      const jsonPayload = JSON.stringify(payload, null, 2);
      this.server.to(`server:${serverId}`).emit("messageDeleted", jsonPayload);
    } catch (error: unknown) {
      this.send(client, "error", {
        message: "Failed to delete message.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    this.send(client, "pong", {
      timestamp: new Date().toISOString(),
      message: "Pong!",
    });
  }
}

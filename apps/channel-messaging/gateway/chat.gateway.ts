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
import {
  ChannelConversation,
  ChannelConversationDocument,
} from "../schemas/channel-conversation.schema";

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
    @InjectModel(ChannelConversation.name)
    private readonly channelConversationModel: Model<ChannelConversationDocument>,
  ) {}

  private readonly meta = new WeakMap<Socket, SocketMeta>();

  private send(client: Socket, event: string, data: unknown) {
    client.emit(event, data);
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
    @MessageBody() userDehiveId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!userDehiveId || typeof userDehiveId !== "string") {
      return this.send(client, "error", {
        message: "Invalid identity payload. Please send a string userDehiveId.",
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
      this.send(client, "identityConfirmed", {
        message: `You are now identified as ${userDehiveId}`,
        userDehiveId: userDehiveId,
      });
      console.log(`[WebSocket] identityConfirmed sent successfully`);
    } catch (error) {
      console.error(`[WebSocket] Error sending identityConfirmed:`, error);
    }
  }

  @SubscribeMessage("joinChannel")
  async handleJoinChannel(
    @MessageBody()
    data: string | { serverId: string; categoryId: string; channelId: string },
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
    let parsedData: { serverId: string; categoryId: string; channelId: string };
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

    const { serverId, categoryId, channelId } = parsedData;

    // Debug logging
    console.log("[WebSocket] joinChannel raw data:", data);
    console.log(
      "[WebSocket] joinChannel parsed data:",
      JSON.stringify(parsedData, null, 2),
    );
    console.log("[WebSocket] Extracted values:", {
      serverId,
      categoryId,
      channelId,
    });

    if (
      !serverId ||
      !categoryId ||
      !channelId ||
      !Types.ObjectId.isValid(serverId) ||
      !Types.ObjectId.isValid(categoryId) ||
      !Types.ObjectId.isValid(channelId)
    ) {
      console.log("[WebSocket] Validation failed:", {
        serverId: { value: serverId, valid: Types.ObjectId.isValid(serverId) },
        categoryId: {
          value: categoryId,
          valid: Types.ObjectId.isValid(categoryId),
        },
        channelId: {
          value: channelId,
          valid: Types.ObjectId.isValid(channelId),
        },
      });

      return this.send(client, "error", {
        message:
          "Invalid payload. serverId, categoryId, and channelId are required and must be valid ObjectIds.",
        details: {
          received: data,
          extracted: { serverId, categoryId, channelId },
        },
      });
    }

    try {
      console.log("[WebSocket] Checking user membership...");
      console.log("[WebSocket] Query params:", {
        userDehiveId: meta.userDehiveId,
        serverId: serverId,
        userDehiveIdObjectId: new Types.ObjectId(meta.userDehiveId),
        serverIdObjectId: new Types.ObjectId(serverId),
      });

      // Try different query approaches
      const query1 = {
        user_dehive_id: new Types.ObjectId(meta.userDehiveId),
        server_id: new Types.ObjectId(serverId),
      };

      const query2 = {
        user_dehive_id: meta.userDehiveId,
        server_id: serverId,
      };

      const query3 = {
        user_dehive_id: meta.userDehiveId,
        server_id: new Types.ObjectId(serverId),
      };

      console.log("[WebSocket] Trying query 1 (both ObjectId):", query1);
      let isMember = await this.userDehiveServerModel.findOne(query1);

      if (!isMember) {
        console.log(
          "[WebSocket] Query 1 failed, trying query 2 (both string):",
          query2,
        );
        isMember = await this.userDehiveServerModel.findOne(query2);
      }

      if (!isMember) {
        console.log(
          "[WebSocket] Query 2 failed, trying query 3 (string + ObjectId):",
          query3,
        );
        isMember = await this.userDehiveServerModel.findOne(query3);
      }

      // Debug: Check all documents for this user
      const allUserMemberships = await this.userDehiveServerModel.find({
        user_dehive_id: meta.userDehiveId,
      });
      console.log("[WebSocket] All memberships for user:", allUserMemberships);

      // Debug: Check all documents for this server
      const allServerMembers = await this.userDehiveServerModel.find({
        server_id: new Types.ObjectId(serverId),
      });
      console.log("[WebSocket] All members of server:", allServerMembers);

      if (!isMember) {
        console.log("[WebSocket] User is not a member of server:", serverId);
        return this.send(client, "error", {
          message: "Access denied. You are not a member of this server.",
          details: {
            serverId,
            userDehiveId: meta.userDehiveId,
            allUserMemberships,
            allServerMembers,
          },
        });
      }

      console.log("[WebSocket] User membership confirmed:", isMember);

      console.log("[WebSocket] Checking channel...");
      const channel = await this.channelModel.findById(channelId);
      if (!channel) {
        console.log("[WebSocket] Channel not found:", channelId);
        return this.send(client, "error", {
          message: "Channel not found.",
          details: { channelId },
        });
      }

      if (channel.category_id.toString() !== categoryId) {
        console.log("[WebSocket] Channel does not belong to category:", {
          channelCategoryId: channel.category_id.toString(),
          expectedCategoryId: categoryId,
        });
        return this.send(client, "error", {
          message: "Channel does not belong to the specified category.",
          details: {
            channelId,
            channelCategoryId: channel.category_id.toString(),
            expectedCategoryId: categoryId,
          },
        });
      }

      console.log("[WebSocket] Channel validation passed");

      console.log("[WebSocket] Checking category...");
      const category = await this.categoryModel.findById(categoryId);
      if (!category) {
        console.log("[WebSocket] Category not found:", categoryId);
        return this.send(client, "error", {
          message: "Category not found.",
          details: { categoryId },
        });
      }

      if (category.server_id.toString() !== serverId) {
        console.log("[WebSocket] Category does not belong to server:", {
          categoryServerId: category.server_id.toString(),
          expectedServerId: serverId,
        });
        return this.send(client, "error", {
          message: "Category does not belong to the specified server.",
          details: {
            categoryId,
            categoryServerId: category.server_id.toString(),
            expectedServerId: serverId,
          },
        });
      }

      console.log("[WebSocket] Category validation passed");

      const conversation = await this.channelConversationModel.findOneAndUpdate(
        { channelId: new Types.ObjectId(channelId) },
        { $setOnInsert: { channel_id: new Types.ObjectId(channelId) } },
        { upsert: true, new: true, runValidators: true },
      );

      const conversationId = String((conversation as { _id: unknown })._id);

      // Leave previous rooms if any
      if (meta.currentRooms) {
        meta.currentRooms.forEach((roomId) => {
          client.leave(roomId);
        });
        meta.currentRooms.clear();
      }

      // Join new room
      await client.join(conversationId);
      meta.currentRooms?.add(conversationId);

      console.log(
        `[WebSocket] ✅ SUCCESS: User ${meta.userDehiveId} joined channel ${channelId}`,
      );
      console.log(`[WebSocket] ✅ CONVERSATION ID: ${conversationId}`);
      console.log(`[WebSocket] ✅ ROOM JOINED: ${conversationId}`);

      this.send(client, "joinedChannel", {
        conversationId,
        message: "Joined channel room successfully",
      });
    } catch (error) {
      console.error("[WebSocket] Error handling joinChannel:", error);
      this.send(client, "error", {
        message: "Failed to join channel.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("joinConversation")
  async handleJoinConversation(
    @MessageBody()
    payload: string | { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    if (!meta?.userDehiveId || !meta?.isAuthenticated) {
      return this.send(client, "error", {
        message:
          'Please identify yourself first by sending an "identity" event.',
      });
    }
    let conversationId = "";
    if (typeof payload === "string") {
      conversationId = payload;
    } else if (payload && typeof payload === "object") {
      conversationId = payload.conversationId;
    }
    if (!Types.ObjectId.isValid(conversationId)) {
      return this.send(client, "error", {
        message: "Invalid conversationId.",
      });
    }

    try {
      // Verify user has access to this conversation
      const conversation =
        await this.channelConversationModel.findById(conversationId);
      if (!conversation) {
        return this.send(client, "error", {
          message: "Conversation not found.",
        });
      }

      // Check if user is member of the server that owns this channel
      const channel = await this.channelModel.findById(conversation.channelId);
      if (!channel) {
        return this.send(client, "error", {
          message: "Channel not found.",
        });
      }

      const category = await this.categoryModel.findById(channel.category_id);
      if (!category) {
        return this.send(client, "error", {
          message: "Category not found.",
        });
      }

      const isMember = await this.userDehiveServerModel.findOne({
        user_dehive_id: new Types.ObjectId(meta.userDehiveId),
        server_id: category.server_id,
      });

      if (!isMember) {
        return this.send(client, "error", {
          message: "Access denied. You are not a member of this server.",
        });
      }

      // Leave previous rooms if any
      if (meta.currentRooms) {
        meta.currentRooms.forEach((roomId) => {
          client.leave(roomId);
        });
        meta.currentRooms.clear();
      }

      // Join new room
      await client.join(conversationId);
      meta.currentRooms?.add(conversationId);

      console.log(
        `[WebSocket] User ${meta.userDehiveId} joined conversation room: ${conversationId}`,
      );

      this.send(client, "joinedConversation", {
        conversationId,
        message: `You have successfully joined conversation ${conversationId}`,
      });
    } catch (error) {
      console.error("[WebSocket] Error handling joinConversation:", error);
      this.send(client, "error", {
        message: "Failed to join conversation.",
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
      const convId = parsedData.conversationId;
      if (!convId || !Types.ObjectId.isValid(convId)) {
        return this.send(client, "error", {
          message: "Invalid conversationId.",
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
        `[WebSocket] 📨 SEND MESSAGE: User ${meta.userDehiveId} sending to conversation ${convId}`,
      );
      console.log(`[WebSocket] 📨 MESSAGE CONTENT: "${parsedData.content}"`);
      console.log(
        `[WebSocket] 📨 UPLOAD IDS: ${JSON.stringify(parsedData.uploadIds)}`,
      );

      const savedMessage = (await this.messagingService.createMessage(
        parsedData,
        meta.userDehiveId,
      )) as any;

      console.log(`[WebSocket] ✅ MESSAGE SAVED: ${savedMessage._id}`);

      // Get user profile for the sender
      await this.userDehiveModel.findById(savedMessage.senderId).lean();

      const messageToBroadcast = {
        _id: savedMessage._id,
        sender: {
          dehive_id: savedMessage.senderId,
          username: `User_${savedMessage.senderId.toString().slice(-4)}`,
        },
        content: savedMessage.content,
        attachments: savedMessage.attachments || [],
        conversationId: savedMessage.conversationId?.toString?.(),
        createdAt: savedMessage.createdAt,
        isEdited: savedMessage.isEdited,
        replyTo: savedMessage.replyTo || null,
      };

      // Broadcast to all clients in the conversation room
      this.server
        .to(String(parsedData.conversationId))
        .emit("newMessage", messageToBroadcast);

      console.log(
        `[WebSocket] 📢 MESSAGE BROADCASTED to room: ${parsedData.conversationId}`,
      );
      console.log(
        `[WebSocket] 📢 BROADCAST DATA:`,
        JSON.stringify(messageToBroadcast, null, 2),
      );
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
      const payload = {
        _id: updated._id,
        content: updated.content,
        isEdited: true,
        editedAt: (updated as unknown as { editedAt?: Date }).editedAt,
        conversationId: (
          updated.conversationId as unknown as Types.ObjectId
        ).toString(),
      };
      this.server
        .to(String(payload.conversationId))
        .emit("messageEdited", payload);
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
      const payload = {
        _id: updated._id,
        isDeleted: true,
        conversationId: (
          updated.conversationId as unknown as Types.ObjectId
        ).toString(),
      };
      this.server
        .to(String(payload.conversationId))
        .emit("messageDeleted", payload);
    } catch (error: unknown) {
      this.send(client, "error", {
        message: "Failed to delete message.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("leaveRoom")
  async handleLeaveRoom(
    @MessageBody() data: string | { conversationId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    if (!meta?.userDehiveId || !meta?.isAuthenticated) {
      return this.send(client, "error", {
        message: "Please identify yourself first.",
      });
    }

    try {
      // Parse JSON string if needed
      let parsedData: { conversationId?: string };
      if (typeof data === "string") {
        parsedData = JSON.parse(data);
      } else {
        parsedData = data;
      }

      if (parsedData?.conversationId) {
        // Leave specific room
        if (meta.currentRooms?.has(parsedData.conversationId)) {
          await client.leave(parsedData.conversationId);
          meta.currentRooms.delete(parsedData.conversationId);
          this.send(client, "leftRoom", {
            conversationId: parsedData.conversationId,
            message: "Left room successfully",
          });
        } else {
          this.send(client, "error", {
            message: "You are not in this room.",
          });
        }
      } else {
        // Leave all rooms
        if (meta.currentRooms) {
          meta.currentRooms.forEach((roomId) => {
            client.leave(roomId);
          });
          meta.currentRooms.clear();
        }
        this.send(client, "leftAllRooms", {
          message: "Left all rooms successfully",
        });
      }
    } catch (error) {
      console.error("[WebSocket] Error handling leaveRoom:", error);
      this.send(client, "error", {
        message: "Failed to leave room.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("getCurrentRooms")
  handleGetCurrentRooms(@ConnectedSocket() client: Socket) {
    const meta = this.meta.get(client);
    if (!meta?.userDehiveId || !meta?.isAuthenticated) {
      return this.send(client, "error", {
        message: "Please identify yourself first.",
      });
    }

    this.send(client, "currentRooms", {
      rooms: Array.from(meta.currentRooms || []),
      message: "Current rooms retrieved successfully",
    });
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    this.send(client, "pong", {
      timestamp: new Date().toISOString(),
      message: "Pong!",
    });
  }
}

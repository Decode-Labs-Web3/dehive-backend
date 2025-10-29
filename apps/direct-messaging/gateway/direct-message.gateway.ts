import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Model, Types } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { DirectMessagingService } from "../src/direct-messaging.service";
import { SendDirectMessageDto } from "../dto/send-direct-message.dto";
import {
  UserDehive,
  UserDehiveDocument,
} from "../../user-dehive-server/schemas/user-dehive.schema";
import {
  DirectConversation,
  DirectConversationDocument,
} from "../schemas/direct-conversation.schema";

type SocketMeta = { userDehiveId?: string };

@WebSocketGateway({
  cors: { origin: "*" },
})
export class DmGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly meta = new WeakMap<Socket, SocketMeta>();

  constructor(
    private readonly service: DirectMessagingService,
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    @InjectModel(DirectConversation.name)
    private readonly conversationModel: Model<DirectConversationDocument>,
  ) {}

  afterInit() {
    // Set WebSocket server reference in service after initialization
    this.service.setWebSocketServer(this.server);
    console.log("[DM-WS] WebSocket server set in service");
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

  /**
   * Helper function to format message data consistently for WebSocket responses
   * This ensures WebSocket responses match API response format
   */
  private async formatMessageData(message: {
    _id: unknown;
    conversationId: unknown;
    senderId: unknown;
    content: unknown;
    attachments?: unknown[];
    isEdited?: boolean;
    replyTo?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  }) {
    // Get user profile for sender - try cache first, then fallback
    const userProfile = await this.service.getUserProfile(
      String(message.senderId),
    );

    return {
      _id: message._id,
      conversationId: message.conversationId,
      sender: {
        dehive_id: message.senderId,
        username: userProfile.username || `User_${String(message.senderId)}`,
        display_name:
          userProfile.display_name || `User_${String(message.senderId)}`,
        avatar_ipfs_hash: userProfile.avatar_ipfs_hash || null,
      },
      content: message.content,
      attachments: message.attachments || [],
      isEdited: message.isEdited || false,
      isDeleted: (message as { isDeleted?: boolean }).isDeleted || false,
      replyTo: message.replyTo || null,
      createdAt: (message as { createdAt: unknown }).createdAt,
      updatedAt: (message as { updatedAt: unknown }).updatedAt,
    };
  }

  handleConnection(client: Socket) {
    console.log("[DM-WS] ✅ Client CONNECTED:", client.id);
    console.log("[DM-WS] Awaiting identity confirmation...");
    this.meta.set(client, {});
  }

  handleDisconnect(client: Socket) {
    console.log("[DM-WS] ❌ Client DISCONNECTING:", client.id);

    const meta = this.meta.get(client);
    if (meta?.userDehiveId) {
      console.log(`[DM-WS] 👤 User DISCONNECTED: ${meta.userDehiveId}`);
      console.log(`[DM-WS] User ${meta.userDehiveId} left the DM gateway`);
    } else {
      console.log(`[DM-WS] ❌ Anonymous client disconnected: ${client.id}`);
    }

    this.meta.delete(client);
  }

  @SubscribeMessage("identity")
  async handleIdentity(
    @MessageBody() data: string | { userDehiveId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`[DM-WS] Identity request received:`, data);
    console.log(`[DM-WS] Identity data type:`, typeof data);

    // Handle both string and object formats
    let userDehiveId: string;
    if (typeof data === "string") {
      userDehiveId = data;
    } else if (typeof data === "object" && data?.userDehiveId) {
      userDehiveId = data.userDehiveId;
    } else {
      console.log(`[DM-WS] Invalid identity format:`, data);
      return this.send(client, "error", {
        message:
          "Invalid identity format. Send userDehiveId as string or {userDehiveId: string}",
        code: "INVALID_FORMAT",
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[DM-WS] Extracted userDehiveId: ${userDehiveId}`);

    if (!userDehiveId || !Types.ObjectId.isValid(userDehiveId)) {
      console.log(`[DM-WS] Invalid userDehiveId: ${userDehiveId}`);
      return this.send(client, "error", {
        message: "Invalid userDehiveId",
        code: "INVALID_USER_ID",
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[DM-WS] Checking if user exists: ${userDehiveId}`);
    const exists = await this.userDehiveModel.exists({
      _id: new Types.ObjectId(userDehiveId),
    });

    console.log(`[DM-WS] User exists result: ${exists}`);
    if (!exists) {
      console.log(`[DM-WS] User not found in database: ${userDehiveId}`);
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
      console.log(`[DM-WS] User identified as ${userDehiveId}`);
      this.send(client, "identityConfirmed", {
        userDehiveId,
        status: "success",
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @MessageBody() data: SendDirectMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const selfId = meta?.userDehiveId;

    console.log(`[DM-WS] SendMessage request from user: ${selfId}`);
    console.log(`[DM-WS] SendMessage data type:`, typeof data);
    console.log(`[DM-WS] SendMessage data:`, JSON.stringify(data, null, 2));

    if (!selfId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      let parsedData = data;
      if (typeof data === "string") {
        try {
          parsedData = JSON.parse(data);
        } catch (parseError) {
          console.error("[DM-WS] Failed to parse JSON data:", parseError);
          return this.send(client, "error", {
            message: "Invalid JSON format",
            code: "INVALID_JSON",
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Validate data structure
      if (!parsedData || typeof parsedData !== "object") {
        return this.send(client, "error", {
          message: "Invalid message data format",
        });
      }

      // Validate conversationId
      if (
        !parsedData.conversationId ||
        !Types.ObjectId.isValid(parsedData.conversationId)
      ) {
        return this.send(client, "error", {
          message: "Invalid conversationId",
        });
      }

      // Validate content
      if (typeof parsedData.content !== "string") {
        return this.send(client, "error", {
          message: "Content must be a string",
        });
      }
      if (parsedData.content.length > 2000) {
        return this.send(client, "error", {
          message: "Content must not exceed 2000 characters",
        });
      }

      // Validate uploadIds
      if (!Array.isArray(parsedData.uploadIds)) {
        return this.send(client, "error", {
          message: "uploadIds must be an array",
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

      const savedMessage = await this.service.sendMessage(selfId, parsedData);
      const conv = await this.conversationModel
        .findById(parsedData.conversationId)
        .lean();
      if (!conv) {
        return this.send(client, "error", {
          message: "Conversation not found",
        });
      }

      const recipientId =
        String(conv.userA) === selfId ? String(conv.userB) : String(conv.userA);

      const messageToBroadcast = await this.formatMessageData(
        savedMessage as {
          _id: unknown;
          conversationId: unknown;
          senderId: unknown;
          content: unknown;
          attachments?: unknown[];
          isEdited?: boolean;
          replyTo?: unknown;
          createdAt?: unknown;
          updatedAt?: unknown;
        },
      );

      // Broadcast to both users
      const serializedMessage = JSON.parse(JSON.stringify(messageToBroadcast));
      this.broadcast(`user:${recipientId}`, "newMessage", serializedMessage);
      this.broadcast(`user:${selfId}`, "newMessage", serializedMessage);

      // Emit conversation update for real-time conversation list updates
      try {
        await this.service.emitConversationUpdate(
          selfId,
          recipientId,
          parsedData.conversationId,
        );
      } catch (error) {
        console.error("[DM-WS] Error emitting conversation update:", error);
        // Don't fail the message send if conversation update fails
      }
    } catch (error) {
      console.error("[DM-WS] Error handling message:", error);
      console.error(
        "[DM-WS] Error stack:",
        error instanceof Error ? error.stack : "No stack trace",
      );
      this.send(client, "error", {
        message: "Failed to send message",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("editMessage")
  async handleEditMessage(
    @MessageBody() data: { messageId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const selfId = meta?.userDehiveId;
    if (!selfId)
      return this.send(client, "error", { message: "Please identify first" });
    try {
      const updated = await this.service.editMessage(
        selfId,
        data?.messageId,
        data?.content ?? "",
      );

      const conv = await this.conversationModel
        .findById(updated.conversationId)
        .lean();
      if (!conv) return;
      const recipientId =
        String(conv.userA) === selfId ? String(conv.userB) : String(conv.userA);
      const payload = {
        ...(await this.formatMessageData(updated)),
        messageId: updated._id, // Keep messageId for backward compatibility
      };
      const serializedPayload = JSON.parse(JSON.stringify(payload));
      this.broadcast(`user:${recipientId}`, "messageEdited", serializedPayload);
      this.broadcast(`user:${selfId}`, "messageEdited", serializedPayload);
    } catch (error) {
      this.send(client, "error", {
        message: "Failed to edit message",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("deleteMessage")
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const selfId = meta?.userDehiveId;
    if (!selfId)
      return this.send(client, "error", { message: "Please identify first" });
    try {
      const updated = await this.service.deleteMessage(selfId, data?.messageId);
      const conv = await this.conversationModel
        .findById(updated.conversationId)
        .lean();
      if (!conv) return;
      const recipientId =
        String(conv.userA) === selfId ? String(conv.userB) : String(conv.userA);
      const payload = {
        ...(await this.formatMessageData(updated)),
        messageId: updated._id, // Keep messageId for backward compatibility
        isDeleted: true, // Override isDeleted for delete events
      };
      const serializedPayload = JSON.parse(JSON.stringify(payload));
      this.broadcast(
        `user:${recipientId}`,
        "messageDeleted",
        serializedPayload,
      );
      this.broadcast(`user:${selfId}`, "messageDeleted", serializedPayload);
    } catch (error) {
      this.send(client, "error", {
        message: "Failed to delete message",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

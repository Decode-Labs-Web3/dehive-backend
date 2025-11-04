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
import {
  UserDehive,
  UserDehiveDocument,
} from "../../user-dehive-server/schemas/user-dehive.schema";
import { DmCall, DmCallDocument } from "../schemas/dm-call.schema";
import {
  DirectConversation,
  DirectConversationDocument,
} from "../schemas/direct-conversation.schema";
import { DecodeApiClient } from "../clients/decode-api.client";
import { CallStatus } from "../enum/enum";
import { CallEndReason } from "../enum/enum";

type SocketMeta = {
  userDehiveId?: string;
  callId?: string;
  callTimeout?: NodeJS.Timeout;
};

@WebSocketGateway({
  namespace: "/",
  cors: { origin: "*" },
})
export class DirectCallGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private meta: Map<Socket, SocketMeta>;

  constructor(
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    @InjectModel(DmCall.name)
    private readonly dmCallModel: Model<DmCallDocument>,
    @InjectModel(DirectConversation.name)
    private readonly directConversationModel: Model<DirectConversationDocument>,
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

  private findSocketByUserId(userId: string): Socket | null {
    for (const [socket, meta] of this.meta.entries()) {
      if (meta.userDehiveId === userId) {
        return socket;
      }
    }
    return null;
  }

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
          username: profile.username || `User_${userDehiveId}`,
          display_name: profile.display_name || `User_${userDehiveId}`,
          avatar_ipfs_hash: profile.avatar_ipfs_hash || "",
        };
      }

      return null;
    } catch (error) {
      console.error(`[Direct-Calling] Error getting user profile:`, error);
      return null;
    }
  }

  private async findOrCreateConversation(
    userIdA: string,
    userIdB: string,
  ): Promise<Types.ObjectId> {
    const [sortedUserA, sortedUserB] =
      userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];

    let conversation = await this.directConversationModel.findOne({
      userA: new Types.ObjectId(sortedUserA),
      userB: new Types.ObjectId(sortedUserB),
    });

    if (!conversation) {
      conversation = new this.directConversationModel({
        userA: new Types.ObjectId(sortedUserA),
        userB: new Types.ObjectId(sortedUserB),
      });
      await conversation.save();
    }

    return conversation._id as Types.ObjectId;
  }

  private async findOrCreateCall(
    callerId: string,
    calleeId: string,
  ): Promise<DmCallDocument> {
    const conversationId = await this.findOrCreateConversation(
      callerId,
      calleeId,
    );

    const activeCall = await this.dmCallModel.findOne({
      conversation_id: conversationId,
      status: { $in: [CallStatus.CALLING, CallStatus.CONNECTED] },
    });

    if (activeCall) {
      throw new Error("There is already an active call for this conversation");
    }

    let call = await this.dmCallModel.findOne({
      conversation_id: conversationId,
    });

    if (!call) {
      call = new this.dmCallModel({
        conversation_id: conversationId,
        caller_id: new Types.ObjectId(callerId),
        callee_id: new Types.ObjectId(calleeId),
        status: CallStatus.CALLING,
      });
      await call.save();
    } else {
      call.status = CallStatus.CALLING;
      call.started_at = undefined;
      call.ended_at = undefined;
      call.duration_seconds = undefined;
      call.end_reason = undefined;
      call.caller_id = new Types.ObjectId(callerId);
      call.callee_id = new Types.ObjectId(calleeId);
      await call.save();
    }

    return call;
  }

  handleConnection(client: Socket) {
    console.log(`[Direct-Calling] ✅ Client CONNECTED: ${client.id}`);

    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }
    this.meta.set(client, {});

    console.log(`[Direct-Calling] Total connected clients: ${this.meta.size}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`[Direct-Calling] ❌ Client DISCONNECTING: ${client.id}`);

    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);

    if (meta?.userDehiveId) {
      const userId = meta.userDehiveId;
      console.log(`[Direct-Calling] 👤 User DISCONNECTED: ${userId}`);

      if (meta.callTimeout) {
        clearTimeout(meta.callTimeout);
        console.log(
          `[Direct-Calling] 🧹 Cleared call timeout for user: ${userId}`,
        );
      }

      const activeCall = await this.dmCallModel.findOne({
        $or: [
          { caller_id: new Types.ObjectId(userId) },
          { callee_id: new Types.ObjectId(userId) },
        ],
        status: { $in: [CallStatus.CALLING, CallStatus.CONNECTED] },
      });

      if (activeCall) {
        console.log(
          `[Direct-Calling] ⚠️ User ${userId} disconnected during ACTIVE CALL (${activeCall.status})`,
        );

        activeCall.status = CallStatus.ENDED;
        activeCall.ended_at = new Date();
        activeCall.end_reason = CallEndReason.CONNECTION_ERROR;
        await activeCall.save();

        console.log(
          `[Direct-Calling] 📞 Call ${activeCall._id} auto-ended due to disconnect`,
        );

        const otherUserId =
          activeCall.caller_id.toString() === userId
            ? activeCall.callee_id.toString()
            : activeCall.caller_id.toString();

        const otherUserProfile = await this.getUserProfile(otherUserId);
        if (otherUserProfile) {
          this.broadcast(`user:${otherUserId}`, "callEnded", {
            conversation_id: String(activeCall.conversation_id),
            status: "ended",
            reason: "peer_disconnected",
            user_info: {
              _id: userId,
              username: "Disconnected User",
              display_name: "Disconnected User",
              avatar_ipfs_hash: "",
            },
          });
          console.log(
            `[Direct-Calling] 📢 Notified user ${otherUserId} about peer disconnect`,
          );
        }
      } else {
        console.log(
          `[Direct-Calling] ℹ️ User ${userId} disconnected (no active call)`,
        );
      }

      await this.handleUserDisconnect(userId, meta.callId);
    } else {
      console.log(
        `[Direct-Calling] ❌ Anonymous client disconnected: ${client.id}`,
      );
    }

    this.meta.delete(client);
    console.log(`[Direct-Calling] Total connected clients: ${this.meta.size}`);
  }

  private async handleUserDisconnect(userId: string, callId?: string) {
    if (callId) {
      try {
        await this.dmCallModel.updateOne(
          { _id: callId },
          { status: "ended", ended_at: new Date() },
        );
      } catch (error) {
        console.error("[Direct-Calling] Error handling disconnect:", error);
      }
    }
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

      console.log(
        `[Direct-Calling] Checking pending calls for user ${userDehiveId}`,
      );

      const pendingCall = await this.dmCallModel.findOne({
        callee_id: new Types.ObjectId(userDehiveId),
        status: CallStatus.CALLING,
      });

      if (pendingCall) {
        console.log(
          `[Direct-Calling] Found pending call ${pendingCall._id} for user ${userDehiveId}`,
        );

        const callerProfile = await this.getUserProfile(
          String(pendingCall.caller_id),
        );

        if (callerProfile) {
          this.send(client, "incomingCall", {
            conversation_id: String(pendingCall.conversation_id),
            status: "ringing",
            user_info: {
              _id: callerProfile._id,
              username: callerProfile.username,
              display_name: callerProfile.display_name,
              avatar_ipfs_hash: callerProfile.avatar_ipfs_hash,
            },
          });

          console.log(
            `[Direct-Calling] Sent pending incomingCall to user ${userDehiveId}`,
          );
        }
      }
    }
  }

  @SubscribeMessage("startCall")
  async handleStartCall(
    @MessageBody()
    data:
      | {
          target_user_id: string;
        }
      | string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const callerId = meta?.userDehiveId;

    let parsedData: {
      target_user_id: string;
    };

    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
        console.log("[DEBUG] Parsed from string:", parsedData);
      } catch {
        return this.send(client, "error", {
          message: "Invalid JSON format",
          code: "INVALID_FORMAT",
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      parsedData = data;
      console.log("[DEBUG] Using object directly:", parsedData);
    }

    if (!callerId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const calleeProfile = await this.getUserProfile(
        parsedData.target_user_id,
      );
      if (!calleeProfile) {
        return this.send(client, "error", {
          message: "Target user not found",
          code: "USER_NOT_FOUND",
        });
      }

      const callerProfile = await this.getUserProfile(callerId);
      if (!callerProfile) {
        return this.send(client, "error", {
          message: "Caller not found",
          code: "USER_NOT_FOUND",
        });
      }

      const call = await this.findOrCreateCall(
        callerId,
        parsedData.target_user_id,
      );

      meta.callId = String(call._id);

      console.log(
        `[Direct-Calling] New call created: ${call._id}, conversation: ${call.conversation_id}, status: ${call.status}`,
      );

      // Set timeout for call (60 seconds)
      const callTimeoutMs = 60000;
      const timeoutId = setTimeout(async () => {
        try {
          const currentCall = await this.dmCallModel.findById(call._id);
          if (
            currentCall &&
            (currentCall.status === CallStatus.CALLING ||
              currentCall.status === CallStatus.RINGING)
          ) {
            await this.dmCallModel.findByIdAndUpdate(
              call._id,
              {
                status: CallStatus.TIMEOUT,
                ended_at: new Date(),
                end_reason: "timeout",
              },
              { new: true },
            );

            this.send(client, "callTimeout", {
              conversation_id: String(call.conversation_id),
              status: "ended",
              user_info: {
                _id: calleeProfile._id,
                username: calleeProfile.username,
                display_name: calleeProfile.display_name,
                avatar_ipfs_hash: calleeProfile.avatar_ipfs_hash,
              },
            });

            this.broadcast(`user:${parsedData.target_user_id}`, "callTimeout", {
              conversation_id: String(call.conversation_id),
              status: "ended",
              user_info: {
                _id: callerProfile._id,
                username: callerProfile.username,
                display_name: callerProfile.display_name,
                avatar_ipfs_hash: callerProfile.avatar_ipfs_hash,
              },
            });
          }
        } catch (error) {
          console.error("[Direct-Calling] Error handling call timeout:", error);
        }
      }, callTimeoutMs);

      meta.callTimeout = timeoutId;

      this.send(client, "callStarted", {
        conversation_id: String(call.conversation_id),
        status: "calling",
        user_info: {
          _id: calleeProfile._id,
          username: calleeProfile.username,
          display_name: calleeProfile.display_name,
          avatar_ipfs_hash: calleeProfile.avatar_ipfs_hash,
        },
      });

      this.broadcast(`user:${parsedData.target_user_id}`, "incomingCall", {
        conversation_id: String(call.conversation_id),
        status: "ringing",
        user_info: {
          _id: callerProfile._id,
          username: callerProfile.username,
          display_name: callerProfile.display_name,
          avatar_ipfs_hash: callerProfile.avatar_ipfs_hash,
        },
      });
    } catch (error) {
      console.error("[Direct-Calling] Error starting call:", error);
      this.send(client, "error", {
        message: "Failed to start call",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("acceptCall")
  async handleAcceptCall(
    @MessageBody()
    data: { conversation_id: string } | string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const calleeId = meta?.userDehiveId;

    let parsedData: {
      conversation_id: string;
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

    if (!calleeId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const existingCall = await this.dmCallModel.findOne({
        conversation_id: new Types.ObjectId(parsedData.conversation_id),
        status: CallStatus.CALLING,
      });
      if (!existingCall) {
        return this.send(client, "error", {
          message: "Active call not found for this conversation",
          code: "CALL_NOT_FOUND",
        });
      }

      const callerId = String(existingCall.caller_id);

      const calleeProfile = await this.getUserProfile(calleeId);
      const callerProfile = await this.getUserProfile(callerId);

      if (!calleeProfile || !callerProfile) {
        return this.send(client, "error", {
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      const callerSocket = this.findSocketByUserId(callerId);
      if (callerSocket) {
        const callerMeta = this.meta.get(callerSocket);
        if (callerMeta?.callTimeout) {
          clearTimeout(callerMeta.callTimeout);
          callerMeta.callTimeout = undefined;
        }
      }

      const call = await this.dmCallModel.findByIdAndUpdate(
        existingCall._id,
        {
          status: CallStatus.CONNECTED,
          started_at: new Date(),
        },
        { new: true },
      );

      if (!call) {
        return this.send(client, "error", {
          message: "Call not found",
          code: "CALL_NOT_FOUND",
        });
      }

      meta.callId = String(call._id);

      this.broadcast(`user:${call.caller_id}`, "callAccepted", {
        conversation_id: String(call.conversation_id),
        status: "connected",
        user_info: {
          _id: calleeProfile._id,
          username: calleeProfile.username,
          display_name: calleeProfile.display_name,
          avatar_ipfs_hash: calleeProfile.avatar_ipfs_hash,
        },
      });

      this.send(client, "callAccepted", {
        conversation_id: String(call.conversation_id),
        status: "connected",
        user_info: {
          _id: callerProfile._id,
          username: callerProfile.username,
          display_name: callerProfile.display_name,
          avatar_ipfs_hash: callerProfile.avatar_ipfs_hash,
        },
      });
    } catch (error) {
      console.error("[Direct-Calling] Error accepting call:", error);
      this.send(client, "error", {
        message: "Failed to accept call",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("declineCall")
  async handleDeclineCall(
    @MessageBody() data: { conversation_id: string } | string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const calleeId = meta?.userDehiveId;

    let parsedData: { conversation_id: string };
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

    if (!calleeId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const existingCall = await this.dmCallModel.findOne({
        conversation_id: new Types.ObjectId(parsedData.conversation_id),
        status: CallStatus.CALLING,
      });
      if (!existingCall) {
        return this.send(client, "error", {
          message: "Active call not found for this conversation",
          code: "CALL_NOT_FOUND",
        });
      }

      const callerId = String(existingCall.caller_id);

      const calleeProfile = await this.getUserProfile(calleeId);
      const callerProfile = await this.getUserProfile(callerId);

      if (!calleeProfile || !callerProfile) {
        return this.send(client, "error", {
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      const callerSocket = this.findSocketByUserId(callerId);
      if (callerSocket) {
        const callerMeta = this.meta.get(callerSocket);
        if (callerMeta?.callTimeout) {
          clearTimeout(callerMeta.callTimeout);
          callerMeta.callTimeout = undefined;
        }
      }

      const call = await this.dmCallModel.findByIdAndUpdate(
        existingCall._id,
        {
          status: CallStatus.DECLINED,
          ended_at: new Date(),
        },
        { new: true },
      );

      if (!call) {
        return this.send(client, "error", {
          message: "Call not found",
          code: "CALL_NOT_FOUND",
        });
      }

      this.broadcast(`user:${call.caller_id}`, "callDeclined", {
        conversation_id: String(call.conversation_id),
        status: "declined",
        user_info: {
          _id: calleeProfile._id,
          username: calleeProfile.username,
          display_name: calleeProfile.display_name,
          avatar_ipfs_hash: calleeProfile.avatar_ipfs_hash,
        },
      });

      this.send(client, "callDeclined", {
        conversation_id: String(call.conversation_id),
        status: "declined",
        user_info: {
          _id: callerProfile._id,
          username: callerProfile.username,
          display_name: callerProfile.display_name,
          avatar_ipfs_hash: callerProfile.avatar_ipfs_hash,
        },
      });
    } catch (error) {
      console.error("[Direct-Calling] Error declining call:", error);
      this.send(client, "error", {
        message: "Failed to decline call",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    console.log(`[RTC-WS] Ping received from ${client.id}`);
    this.send(client, "pong", {
      timestamp: new Date().toISOString(),
      message: "pong",
    });
  }

  @SubscribeMessage("endCall")
  async handleEndCall(
    @MessageBody() data: { conversation_id: string } | string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    let parsedData: { conversation_id: string };
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
      const existingCall = await this.dmCallModel.findOne({
        conversation_id: new Types.ObjectId(parsedData.conversation_id),
        status: { $in: [CallStatus.CALLING, CallStatus.CONNECTED] },
      });

      if (!existingCall) {
        return this.send(client, "error", {
          message: "Active call not found for this conversation",
          code: "CALL_NOT_FOUND",
        });
      }

      const callerId = String(existingCall.caller_id);
      const calleeId = String(existingCall.callee_id);

      const otherUserId = callerId === userId ? calleeId : callerId;

      const currentUserProfile = await this.getUserProfile(userId);
      const otherUserProfile = await this.getUserProfile(otherUserId);

      if (!currentUserProfile || !otherUserProfile) {
        return this.send(client, "error", {
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      if (meta.callTimeout) {
        clearTimeout(meta.callTimeout);
        meta.callTimeout = undefined;
        console.log(`[Direct-Calling] Cleared call timeout for user ${userId}`);
      }

      const otherUserSocket = this.findSocketByUserId(otherUserId);
      if (otherUserSocket) {
        const otherMeta = this.meta.get(otherUserSocket);
        if (otherMeta?.callTimeout) {
          clearTimeout(otherMeta.callTimeout);
          otherMeta.callTimeout = undefined;
          console.log(
            `[Direct-Calling] Cleared call timeout for other user ${otherUserId}`,
          );
        }
      }

      const endReason =
        existingCall.status === CallStatus.CALLING
          ? CallEndReason.USER_HANGUP
          : CallEndReason.USER_HANGUP;

      const call = await this.dmCallModel.findByIdAndUpdate(
        existingCall._id,
        {
          status: CallStatus.ENDED,
          ended_at: new Date(),
          end_reason: endReason,
        },
        { new: true },
      );

      if (!call) {
        return this.send(client, "error", {
          message: "Call not found",
          code: "CALL_NOT_FOUND",
        });
      }

      const endReasonText =
        existingCall.status === CallStatus.CALLING ? "cancelled" : "ended";

      console.log(
        `[Direct-Calling] Call ${call._id} ended with reason: ${endReasonText}`,
      );

      this.broadcast(`user:${otherUserId}`, "callEnded", {
        conversation_id: String(call.conversation_id),
        status: "ended",
        reason: endReasonText,
        user_info: {
          _id: currentUserProfile._id,
          username: currentUserProfile.username,
          display_name: currentUserProfile.display_name,
          avatar_ipfs_hash: currentUserProfile.avatar_ipfs_hash,
        },
      });

      this.send(client, "callEnded", {
        conversation_id: String(call.conversation_id),
        status: "ended",
        reason: endReasonText,
        user_info: {
          _id: otherUserProfile._id,
          username: otherUserProfile.username,
          display_name: otherUserProfile.display_name,
          avatar_ipfs_hash: otherUserProfile.avatar_ipfs_hash,
        },
      });
    } catch (error) {
      console.error("[Direct-Calling] Error ending call:", error);
      this.send(client, "error", {
        message: "Failed to end call",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

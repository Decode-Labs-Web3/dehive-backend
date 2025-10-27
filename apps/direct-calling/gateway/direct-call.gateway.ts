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
          username: profile.username,
          display_name: profile.display_name,
          avatar_ipfs_hash: profile.avatar_ipfs_hash,
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
    // Sort userIds to ensure consistent lookup (schema pre-save hook does this too)
    const [sortedUserA, sortedUserB] =
      userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];

    // Try to find existing conversation
    let conversation = await this.directConversationModel.findOne({
      userA: new Types.ObjectId(sortedUserA),
      userB: new Types.ObjectId(sortedUserB),
    });

    // If not found, create new one
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
    // Get or create fixed conversation first
    const conversationId = await this.findOrCreateConversation(
      callerId,
      calleeId,
    );

    // Check if there's already an ACTIVE call (CALLING or CONNECTED)
    const activeCall = await this.dmCallModel.findOne({
      conversation_id: conversationId,
      status: { $in: [CallStatus.CALLING, CallStatus.CONNECTED] },
    });

    if (activeCall) {
      // There's already an active call, return error or handle accordingly
      throw new Error("There is already an active call for this conversation");
    }

    // Try to find existing call document for this conversation
    let call = await this.dmCallModel.findOne({
      conversation_id: conversationId,
    });

    // If not found, create new one
    if (!call) {
      call = new this.dmCallModel({
        conversation_id: conversationId,
        caller_id: new Types.ObjectId(callerId),
        callee_id: new Types.ObjectId(calleeId),
        status: CallStatus.CALLING,
      });
      await call.save();
    } else {
      // If found, reset/update for new call
      call.status = CallStatus.CALLING;
      call.started_at = undefined;
      call.ended_at = undefined;
      call.duration_seconds = undefined;
      call.end_reason = undefined;
      // Update caller/callee in case roles switched
      call.caller_id = new Types.ObjectId(callerId);
      call.callee_id = new Types.ObjectId(calleeId);
      await call.save();
    }

    return call;
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
      this.handleUserDisconnect(meta.userDehiveId, meta.callId);
    }
    this.meta.delete(client);
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
    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const callerId = meta?.userDehiveId;

    // Parse data if it's a string
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
      // Get callee profile first - NO EMIT if not found
      const calleeProfile = await this.getUserProfile(
        parsedData.target_user_id,
      );
      if (!calleeProfile) {
        return this.send(client, "error", {
          message: "Target user not found",
          code: "USER_NOT_FOUND",
        });
      }

      // Get caller profile - NO EMIT if not found
      const callerProfile = await this.getUserProfile(callerId);
      if (!callerProfile) {
        return this.send(client, "error", {
          message: "Caller not found",
          code: "USER_NOT_FOUND",
        });
      }

      // Find or create call for this conversation (uses conversation_id)
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
            // Update call status to timeout
            await this.dmCallModel.findByIdAndUpdate(
              call._id,
              {
                status: CallStatus.TIMEOUT,
                ended_at: new Date(),
                end_reason: "timeout",
              },
              { new: true },
            );

            // Notify caller - status: ended, user_info: callee
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

            // Notify callee - status: ended, user_info: caller
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

      // Store timeout ID in meta for later cleanup
      meta.callTimeout = timeoutId;

      // Notify caller - status: calling, user_info: callee
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

      // Notify callee - status: ringing, user_info: caller
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
    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const calleeId = meta?.userDehiveId;

    // Parse data if it's a string
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
      // Get call info first - find call with CALLING status
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

      // Get both profiles - NO EMIT if not found
      const calleeProfile = await this.getUserProfile(calleeId);
      const callerProfile = await this.getUserProfile(callerId);

      if (!calleeProfile || !callerProfile) {
        return this.send(client, "error", {
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      // Clear timeout if it exists
      const callerSocket = this.findSocketByUserId(callerId);
      if (callerSocket) {
        const callerMeta = this.meta.get(callerSocket);
        if (callerMeta?.callTimeout) {
          clearTimeout(callerMeta.callTimeout);
          callerMeta.callTimeout = undefined;
        }
      }

      // Update call status to connected
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

      // Notify caller - status: connected, user_info: callee
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

      // Notify callee - status: connected, user_info: caller
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
    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const calleeId = meta?.userDehiveId;

    // Parse data if it's a string
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
      // Get call info first - find call with CALLING status
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

      // Get both profiles - NO EMIT if not found
      const calleeProfile = await this.getUserProfile(calleeId);
      const callerProfile = await this.getUserProfile(callerId);

      if (!calleeProfile || !callerProfile) {
        return this.send(client, "error", {
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      // Clear timeout if it exists
      const callerSocket = this.findSocketByUserId(callerId);
      if (callerSocket) {
        const callerMeta = this.meta.get(callerSocket);
        if (callerMeta?.callTimeout) {
          clearTimeout(callerMeta.callTimeout);
          callerMeta.callTimeout = undefined;
        }
      }

      // Update call status to declined
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

      // Notify caller - status: declined, user_info: callee
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

      // Notify callee - status: declined, user_info: caller
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
    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    // Parse data if it's a string
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
      // Get call info first
      const existingCall = await this.dmCallModel.findOne({
        conversation_id: new Types.ObjectId(parsedData.conversation_id),
        status: CallStatus.CONNECTED,
      });
      if (!existingCall) {
        return this.send(client, "error", {
          message: "Active call not found for this conversation",
          code: "CALL_NOT_FOUND",
        });
      }

      const callerId = String(existingCall.caller_id);
      const calleeId = String(existingCall.callee_id);

      // Determine other user
      const otherUserId = callerId === userId ? calleeId : callerId;

      // Get both profiles - NO EMIT if not found
      const currentUserProfile = await this.getUserProfile(userId);
      const otherUserProfile = await this.getUserProfile(otherUserId);

      if (!currentUserProfile || !otherUserProfile) {
        return this.send(client, "error", {
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      // Update call status to ended
      const call = await this.dmCallModel.findByIdAndUpdate(
        existingCall._id,
        {
          status: CallStatus.ENDED,
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

      // Notify other user - status: ended, user_info: current user
      this.broadcast(`user:${otherUserId}`, "callEnded", {
        conversation_id: String(call.conversation_id),
        status: "ended",
        user_info: {
          _id: currentUserProfile._id,
          username: currentUserProfile.username,
          display_name: currentUserProfile.display_name,
          avatar_ipfs_hash: currentUserProfile.avatar_ipfs_hash,
        },
      });

      // Notify current user - status: ended, user_info: other user
      this.send(client, "callEnded", {
        conversation_id: String(call.conversation_id),
        status: "ended",
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

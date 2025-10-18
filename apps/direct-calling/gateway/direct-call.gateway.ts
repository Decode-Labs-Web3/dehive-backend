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
// import { DirectCallService } from "../src/service/direct-call.service";
import {
  UserDehive,
  UserDehiveDocument,
} from "../../user-dehive-server/schemas/user-dehive.schema";
import { DmCall, DmCallDocument } from "../schemas/dm-call.schema";
import { MediaState } from "../enum/enum";

type SocketMeta = {
  userDehiveId?: string;
  callId?: string;
  callTimeout?: NodeJS.Timeout;
};

@WebSocketGateway({
  namespace: "/rtc",
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
  ) {
    // Initialize meta Map
    this.meta = new Map<Socket, SocketMeta>();

    // Debug logging
    console.log("[RTC-WS] Gateway constructor called");
    console.log("[RTC-WS] userDehiveModel available:", !!this.userDehiveModel);
    console.log("[RTC-WS] dmCallModel available:", !!this.dmCallModel);
  }

  private send(client: Socket, event: string, data: unknown) {
    const serializedData = JSON.parse(JSON.stringify(data));
    client.emit(event, serializedData);
  }

  private findSocketByUserId(userId: string): Socket | null {
    for (const [socket, meta] of this.meta.entries()) {
      if (meta.userDehiveId === userId) {
        return socket;
      }
    }
    return null;
  }

  handleConnection(client: Socket) {
    console.log("[RTC-WS] ========================================");
    console.log(
      "[RTC-WS] Client connected to /rtc namespace. Awaiting identity.",
    );
    console.log(`[RTC-WS] Socket ID: ${client.id}`);
    console.log("[RTC-WS] ========================================");

    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    this.meta.set(client, {});
  }

  handleDisconnect(client: Socket) {
    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    if (meta?.userDehiveId) {
      console.log(`[RTC-WS] User ${meta.userDehiveId} disconnected from /rtc.`);
      this.handleUserDisconnect(meta.userDehiveId, meta.callId);
    }
    this.meta.delete(client);
  }

  private async handleUserDisconnect(userId: string, callId?: string) {
    if (callId) {
      try {
        // Handle user disconnect - update call status if needed
        if (callId) {
          await this.dmCallModel.updateOne(
            { _id: callId },
            { status: "ended", ended_at: new Date() },
          );
        }
      } catch (error) {
        console.error("[RTC-WS] Error handling user disconnect:", error);
      }
    }
  }

  @SubscribeMessage("identity")
  async handleIdentity(
    @MessageBody() data: string | { userDehiveId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`[RTC-WS] Identity request received:`, data);

    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    let userDehiveId: string;
    if (typeof data === "string") {
      userDehiveId = data;
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

    // For now, skip database check and just validate ObjectId format
    // TODO: Implement proper user validation when database connection is stable
    console.log(`[RTC-WS] Accepting identity for user: ${userDehiveId}`);

    const meta = this.meta.get(client);
    if (meta) {
      meta.userDehiveId = userDehiveId;
      void client.join(`user:${userDehiveId}`);
      console.log(`[RTC-WS] User identified as ${userDehiveId}`);
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
          with_video?: boolean;
          with_audio?: boolean;
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

    console.log("[RTC-WS] ========================================");
    console.log("[RTC-WS] startCall event received");
    console.log("[RTC-WS] Parsed data:", parsedData);
    console.log("[RTC-WS] target_user_id:", parsedData?.target_user_id);
    console.log("[RTC-WS] Caller ID:", callerId);
    console.log("[RTC-WS] ========================================");

    if (!callerId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Create call directly in database
      console.log("[RTC-WS] Creating call in database");

      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create call document - only essential fields
      const call = new this.dmCallModel({
        conversation_id: new Types.ObjectId(),
        caller_id: new Types.ObjectId(callerId),
        callee_id: new Types.ObjectId(parsedData.target_user_id),
        status: "ringing",
        // Store user's actual choice from request
        caller_audio_enabled: parsedData.with_audio ?? true,
        caller_video_enabled: parsedData.with_video ?? true,
        // Callee preferences will be set when they accept the call
        callee_audio_enabled: true, // Default for callee
        callee_video_enabled: true, // Default for callee
        metadata: {
          stream_call_id: callId,
          stream_config: {
            apiKey: "stream_api_key",
            callType: "default",
            callId,
            members: [
              { user_id: callerId, role: "caller" },
              { user_id: parsedData.target_user_id, role: "callee" },
            ],
            settings: {
              audio: {
                default_device: "speaker",
                is_default_enabled: parsedData.with_audio ?? true,
              },
              video: {
                camera_default_on: parsedData.with_video ?? true,
                camera_facing: "front",
              },
            },
          },
        },
      });

      await call.save();
      meta.callId = String(call._id);

      // Set timeout for call (30 seconds)
      const callTimeoutMs = 30000; // 30 seconds
      const timeoutId = setTimeout(async () => {
        try {
          const currentCall = await this.dmCallModel.findById(call._id);
          if (currentCall && currentCall.status === "ringing") {
            // Update call status to timeout
            await this.dmCallModel.findByIdAndUpdate(
              call._id,
              {
                status: "timeout",
                ended_at: new Date(),
              },
              { new: true },
            );

            // Notify caller about timeout
            this.send(client, "callTimeout", {
              call_id: call._id,
              status: "timeout",
              reason: "call_timeout",
              timestamp: new Date().toISOString(),
            });

            // Notify callee about timeout
            this.server
              .to(`user:${parsedData.target_user_id}`)
              .emit("callTimeout", {
                call_id: call._id,
                caller_id: callerId,
                reason: "call_timeout",
                timestamp: new Date().toISOString(),
              });

            console.log(`[RTC-WS] Call ${call._id} timed out after 30 seconds`);
          }
        } catch (error) {
          console.error("[RTC-WS] Error handling call timeout:", error);
        }
      }, callTimeoutMs);

      // Store timeout ID in meta for later cleanup
      meta.callTimeout = timeoutId;

      const result = {
        call: {
          _id: call._id,
          status: "ringing",
          caller_id: callerId,
          callee_id: parsedData.target_user_id,
          caller_audio_enabled: parsedData.with_audio ?? true,
          caller_video_enabled: parsedData.with_video ?? true,
          callee_audio_enabled: true,
          callee_video_enabled: true,
          created_at: new Date(),
        },
        streamInfo: {
          callId: String(call._id),
          callerToken: `token_${callerId}_${Date.now()}`,
          calleeToken: `token_${parsedData.target_user_id}_${Date.now()}`,
          streamConfig: {
            apiKey: "stream_api_key",
            callType: "default",
            callId: String(call._id),
            members: [
              { user_id: callerId, role: "caller" },
              { user_id: parsedData.target_user_id, role: "callee" },
            ],
            settings: {
              audio: {
                default_device: "speaker",
                is_default_enabled: parsedData.with_audio ?? true,
              },
              video: {
                camera_default_on: parsedData.with_video ?? true,
                camera_facing: "front",
              },
            },
          },
        },
      };

      meta.callId = String(result.call._id);

      // Notify caller
      this.send(client, "callStarted", {
        call_id: result.call._id,
        status: result.call.status,
        target_user_id: parsedData.target_user_id,
        stream_info: result.streamInfo,
        timestamp: new Date().toISOString(),
      });

      // Notify callee
      this.server.to(`user:${parsedData.target_user_id}`).emit("incomingCall", {
        call_id: result.call._id,
        caller_id: callerId,
        caller_info: {
          _id: callerId,
          username: "user_" + callerId.substring(0, 8),
          display_name: "User " + callerId.substring(0, 8),
          avatar_ipfs_hash: "",
          bio: "User profile",
          status: "ACTIVE",
          is_active: true,
        },
        with_video: parsedData.with_video ?? true,
        with_audio: parsedData.with_audio ?? true,
        stream_info: result.streamInfo,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[RTC-WS] Error starting call:", error);
      this.send(client, "error", {
        message: "Failed to start call",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("acceptCall")
  async handleAcceptCall(
    @MessageBody()
    data:
      | { call_id: string; with_video?: boolean; with_audio?: boolean }
      | string,
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
      call_id: string;
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

    if (!calleeId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Get call info first to find caller
      const existingCall = await this.dmCallModel.findById(parsedData.call_id);
      if (!existingCall) {
        return this.send(client, "error", {
          message: "Call not found",
          code: "CALL_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
      }

      // Clear timeout if it exists
      const callerSocket = this.findSocketByUserId(
        String(existingCall.caller_id),
      );
      if (callerSocket) {
        const callerMeta = this.meta.get(callerSocket);
        if (callerMeta?.callTimeout) {
          clearTimeout(callerMeta.callTimeout);
          callerMeta.callTimeout = undefined;
          console.log(
            `[RTC-WS] Cleared timeout for call ${parsedData.call_id}`,
          );
        }
      }

      // Update call status to connected
      const call = await this.dmCallModel.findByIdAndUpdate(
        parsedData.call_id,
        {
          status: "connected",
          started_at: new Date(),
          callee_audio_enabled: parsedData.with_audio ?? true,
          callee_video_enabled: parsedData.with_video ?? true,
        },
        { new: true },
      );

      if (!call) {
        return this.send(client, "error", {
          message: "Call not found",
          code: "CALL_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
      }

      const result = {
        call: {
          _id: call._id,
          status: call.status,
          caller_id: call.caller_id,
          callee_id: call.callee_id,
          caller_audio_enabled: call.caller_audio_enabled,
          caller_video_enabled: call.caller_video_enabled,
          callee_audio_enabled: call.callee_audio_enabled,
          callee_video_enabled: call.callee_video_enabled,
          started_at: call.started_at,
        },
        streamInfo: {
          callId: String(call._id),
          callerToken: `token_${call.caller_id}_${Date.now()}`,
          calleeToken: `token_${call.callee_id}_${Date.now()}`,
          streamConfig: {
            apiKey: "stream_api_key",
            callType: "default",
            callId: String(call._id),
            members: [
              { user_id: String(call.caller_id), role: "caller" },
              { user_id: String(call.callee_id), role: "callee" },
            ],
            settings: {
              audio: {
                default_device: "speaker",
                is_default_enabled: call.caller_audio_enabled,
              },
              video: {
                camera_default_on: call.caller_video_enabled,
                camera_facing: "front",
              },
            },
          },
        },
      };

      meta.callId = String(result.call._id);

      // Notify both parties
      this.server.to(`user:${result.call.caller_id}`).emit("callAccepted", {
        call_id: result.call._id,
        callee_id: calleeId,
        callee_info: {
          _id: calleeId,
          username: "user_" + calleeId.substring(0, 8),
          display_name: "User " + calleeId.substring(0, 8),
          avatar_ipfs_hash: "",
          bio: "User profile",
          status: "ACTIVE",
          is_active: true,
        },
        with_video: parsedData.with_video ?? true,
        with_audio: parsedData.with_audio ?? true,
        stream_info: result.streamInfo,
        timestamp: new Date().toISOString(),
      });

      this.send(client, "callAccepted", {
        call_id: result.call._id,
        status: result.call.status,
        stream_info: result.streamInfo,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[RTC-WS] Error accepting call:", error);
      this.send(client, "error", {
        message: "Failed to accept call",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("declineCall")
  async handleDeclineCall(
    @MessageBody() data: { call_id: string } | string,
    @ConnectedSocket() client: Socket,
  ) {
    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const calleeId = meta?.userDehiveId;

    // Parse data if it's a string
    let parsedData: { call_id: string };
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
      // Clear timeout if it exists
      const existingCall = await this.dmCallModel.findById(parsedData.call_id);
      if (existingCall) {
        const callerSocket = this.findSocketByUserId(
          String(existingCall.caller_id),
        );
        if (callerSocket) {
          const callerMeta = this.meta.get(callerSocket);
          if (callerMeta?.callTimeout) {
            clearTimeout(callerMeta.callTimeout);
            callerMeta.callTimeout = undefined;
            console.log(
              `[RTC-WS] Cleared timeout for declined call ${parsedData.call_id}`,
            );
          }
        }
      }

      const call = await this.dmCallModel.findByIdAndUpdate(
        parsedData.call_id,
        {
          status: "declined",
          ended_at: new Date(),
        },
        { new: true },
      );

      if (call) {
        // Notify caller
        this.server.to(`user:${call.caller_id}`).emit("callDeclined", {
          call_id: call._id,
          callee_id: calleeId,
          reason: "user_declined",
          timestamp: new Date().toISOString(),
        });

        this.send(client, "callDeclined", {
          call_id: call._id,
          status: call.status,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[RTC-WS] Error declining call:", error);
      this.send(client, "error", {
        message: "Failed to decline call",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
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
    @MessageBody() data: { call_id: string } | string,
    @ConnectedSocket() client: Socket,
  ) {
    // Ensure meta Map is initialized
    if (!this.meta) {
      this.meta = new Map<Socket, SocketMeta>();
    }

    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    // Parse data if it's a string
    let parsedData: { call_id: string };
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
      const call = await this.dmCallModel.findByIdAndUpdate(
        parsedData.call_id,
        {
          status: "ended",
          ended_at: new Date(),
        },
        { new: true },
      );

      if (call) {
        // Notify both parties
        const otherUserId =
          String(call.caller_id) === userId
            ? String(call.callee_id)
            : String(call.caller_id);

        this.server.to(`user:${otherUserId}`).emit("callEnded", {
          call_id: call._id,
          ended_by: userId,
          reason: "user_hangup",
          duration: call.duration_seconds,
          timestamp: new Date().toISOString(),
        });

        this.send(client, "callEnded", {
          call_id: call._id,
          status: call.status,
          duration: call.duration_seconds,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[RTC-WS] Error ending call:", error);
      this.send(client, "error", {
        message: "Failed to end call",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  // WebRTC signaling methods removed - Stream.io handles this automatically

  @SubscribeMessage("toggleMedia")
  async handleToggleMedia(
    @MessageBody()
    data:
      | { call_id: string; media_type: "audio" | "video"; state: MediaState }
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
      call_id: string;
      media_type: "audio" | "video";
      state: MediaState;
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
      // Update media status in database
      const updateField = `${parsedData.media_type}_enabled`;
      await this.dmCallModel.findByIdAndUpdate(parsedData.call_id, {
        [updateField]: parsedData.state,
      });

      // Notify other participant
      const call = await this.dmCallModel.findById(parsedData.call_id).lean();
      if (call) {
        const otherUserId =
          String(call.caller_id) === userId
            ? String(call.callee_id)
            : String(call.caller_id);
        this.server.to(`user:${otherUserId}`).emit("mediaToggled", {
          call_id: parsedData.call_id,
          user_id: userId,
          media_type: parsedData.media_type,
          state: parsedData.state,
          timestamp: new Date().toISOString(),
        });
      }

      this.send(client, "mediaToggled", {
        call_id: parsedData.call_id,
        media_type: parsedData.media_type,
        state: parsedData.state,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[RTC-WS] Error toggling media:", error);
      this.send(client, "error", {
        message: "Failed to toggle media",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }
}

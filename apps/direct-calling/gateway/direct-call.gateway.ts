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

      // Create call document - only essential fields
      const call = new this.dmCallModel({
        conversation_id: new Types.ObjectId(),
        caller_id: new Types.ObjectId(callerId),
        callee_id: new Types.ObjectId(parsedData.target_user_id),
        status: "ringing",
      });

      await call.save();
      meta.callId = String(call._id);

      // Set timeout for call (30 seconds)
      const callTimeoutMs = 60000; // 60 seconds
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

            const payload = {
              call_id: call._id,
              status: "timeout",
              reason: "call_timeout",
              timestamp: new Date().toISOString(),
            };
            // Notify caller about timeout
            // this.send(client, "callTimeout", JSON.stringify(payload));
            this.send(client, "callTimeout", payload);

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

      meta.callId = String(call._id);

      // Notify caller
      this.send(client, "callStarted", {
        call_id: call._id,
        status: "ringing",
        target_user_id: parsedData.target_user_id,
        timestamp: new Date().toISOString(),
      });

      // Notify callee
      this.server.to(`user:${parsedData.target_user_id}`).emit("incomingCall", {
        call_id: call._id,
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
    data: { call_id: string } | string,
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

      meta.callId = String(call._id);

      // Notify both parties
      this.server.to(`user:${call.caller_id}`).emit("callAccepted", {
        call_id: call._id,
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
        timestamp: new Date().toISOString(),
      });

      this.send(client, "callAccepted", {
        call_id: call._id,
        status: call.status,
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
}

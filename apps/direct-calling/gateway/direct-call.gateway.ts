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
import { DirectCallService } from "../src/direct-call.service";
import { SignalOfferDto } from "../dto/signal-offer.dto";
import { SignalAnswerDto } from "../dto/signal-answer.dto";
import { IceCandidateDto } from "../dto/ice-candidate.dto";
import {
  UserDehive,
  UserDehiveDocument,
} from "../../user-dehive-server/schemas/user-dehive.schema";
import { DmCall, DmCallDocument } from "../schemas/dm-call.schema";
import { RtcSession, RtcSessionDocument } from "../schemas/rtc-session.schema";
import { MediaState } from "../enum/enum";

type SocketMeta = {
  userDehiveId?: string;
  sessionId?: string;
  callId?: string;
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

  private readonly meta = new WeakMap<Socket, SocketMeta>();

  constructor(
    private readonly service: DirectCallService,
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    @InjectModel(DmCall.name)
    private readonly dmCallModel: Model<DmCallDocument>,
    @InjectModel(RtcSession.name)
    private readonly rtcSessionModel: Model<RtcSessionDocument>,
  ) {}

  private send(client: Socket, event: string, data: unknown) {
    const serializedData = JSON.parse(JSON.stringify(data));
    client.emit(event, serializedData);
  }

  handleConnection(client: Socket) {
    console.log(
      "[RTC-WS] Client connected to /rtc namespace. Awaiting identity.",
    );
    this.meta.set(client, {});
  }

  handleDisconnect(client: Socket) {
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
        await this.service.handleUserDisconnect(userId, callId);
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
    data: {
      target_user_id: string;
      with_video?: boolean;
      with_audio?: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const callerId = meta?.userDehiveId;

    if (!callerId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const call = await this.service.startCall(
        callerId,
        data.target_user_id,
        data.with_video ?? true,
        data.with_audio ?? true,
      );

      meta.callId = String(call._id);
      meta.sessionId = client.handshake.headers["x-session-id"] as string;

      // Notify caller
      this.send(client, "callStarted", {
        call_id: call._id,
        status: call.status,
        target_user_id: data.target_user_id,
        timestamp: new Date().toISOString(),
      });

      // Notify callee
      this.server.to(`user:${data.target_user_id}`).emit("incomingCall", {
        call_id: call._id,
        caller_id: callerId,
        caller_info: await this.service.getUserProfile(callerId),
        with_video: data.with_video ?? true,
        with_audio: data.with_audio ?? true,
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
    data: { call_id: string; with_video?: boolean; with_audio?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const calleeId = meta?.userDehiveId;

    if (!calleeId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const call = await this.service.acceptCall(
        calleeId,
        data.call_id,
        data.with_video ?? true,
        data.with_audio ?? true,
      );

      meta.callId = String(call._id);

      // Notify both parties
      this.server.to(`user:${call.caller_id}`).emit("callAccepted", {
        call_id: call._id,
        callee_id: calleeId,
        callee_info: await this.service.getUserProfile(calleeId),
        with_video: data.with_video ?? true,
        with_audio: data.with_audio ?? true,
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
    @MessageBody() data: { call_id: string },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const calleeId = meta?.userDehiveId;

    if (!calleeId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const call = await this.service.declineCall(calleeId, data.call_id);

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
    } catch (error) {
      console.error("[RTC-WS] Error declining call:", error);
      this.send(client, "error", {
        message: "Failed to decline call",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("endCall")
  async handleEndCall(
    @MessageBody() data: { call_id: string; reason?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const call = await this.service.endCall(
        userId,
        data.call_id,
        data.reason,
      );

      // Notify both parties
      const otherUserId =
        String(call.caller_id) === userId
          ? String(call.callee_id)
          : String(call.caller_id);

      this.server.to(`user:${otherUserId}`).emit("callEnded", {
        call_id: call._id,
        ended_by: userId,
        reason: data.reason || "user_hangup",
        duration: call.duration_seconds,
        timestamp: new Date().toISOString(),
      });

      this.send(client, "callEnded", {
        call_id: call._id,
        status: call.status,
        duration: call.duration_seconds,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[RTC-WS] Error ending call:", error);
      this.send(client, "error", {
        message: "Failed to end call",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("signalOffer")
  async handleSignalOffer(
    @MessageBody() data: SignalOfferDto,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      await this.service.handleSignalOffer(userId, data);

      // Forward offer to the other participant
      const call = await this.dmCallModel.findById(data.call_id).lean();
      if (call) {
        const otherUserId =
          String(call.caller_id) === userId
            ? String(call.callee_id)
            : String(call.caller_id);
        this.server.to(`user:${otherUserId}`).emit("signalOffer", {
          call_id: data.call_id,
          offer: data.offer,
          metadata: data.metadata,
          from_user_id: userId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[RTC-WS] Error handling signal offer:", error);
      this.send(client, "error", {
        message: "Failed to handle signal offer",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("signalAnswer")
  async handleSignalAnswer(
    @MessageBody() data: SignalAnswerDto,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      await this.service.handleSignalAnswer(userId, data);

      // Forward answer to the other participant
      const call = await this.dmCallModel.findById(data.call_id).lean();
      if (call) {
        const otherUserId =
          String(call.caller_id) === userId
            ? String(call.callee_id)
            : String(call.caller_id);
        this.server.to(`user:${otherUserId}`).emit("signalAnswer", {
          call_id: data.call_id,
          answer: data.answer,
          metadata: data.metadata,
          from_user_id: userId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[RTC-WS] Error handling signal answer:", error);
      this.send(client, "error", {
        message: "Failed to handle signal answer",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("iceCandidate")
  async handleIceCandidate(
    @MessageBody() data: IceCandidateDto,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      await this.service.handleIceCandidate(userId, data);

      // Forward ICE candidate to the other participant
      const call = await this.dmCallModel.findById(data.call_id).lean();
      if (call) {
        const otherUserId =
          String(call.caller_id) === userId
            ? String(call.callee_id)
            : String(call.caller_id);
        this.server.to(`user:${otherUserId}`).emit("iceCandidate", {
          call_id: data.call_id,
          candidate: data.candidate,
          sdpMLineIndex: data.sdpMLineIndex,
          sdpMid: data.sdpMid,
          metadata: data.metadata,
          from_user_id: userId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[RTC-WS] Error handling ICE candidate:", error);
      this.send(client, "error", {
        message: "Failed to handle ICE candidate",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("toggleMedia")
  async handleToggleMedia(
    @MessageBody()
    data: { call_id: string; media_type: "audio" | "video"; state: MediaState },
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      await this.service.toggleMedia(
        userId,
        data.call_id,
        data.media_type,
        data.state,
      );

      // Notify other participant
      const call = await this.dmCallModel.findById(data.call_id).lean();
      if (call) {
        const otherUserId =
          String(call.caller_id) === userId
            ? String(call.callee_id)
            : String(call.caller_id);
        this.server.to(`user:${otherUserId}`).emit("mediaToggled", {
          call_id: data.call_id,
          user_id: userId,
          media_type: data.media_type,
          state: data.state,
          timestamp: new Date().toISOString(),
        });
      }

      this.send(client, "mediaToggled", {
        call_id: data.call_id,
        media_type: data.media_type,
        state: data.state,
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

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
import { SignalOfferDto } from "../dto/signal-offer.dto";
import { SignalAnswerDto } from "../dto/signal-answer.dto";
import { IceCandidateDto } from "../dto/ice-candidate.dto";
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
import {
  ChannelRtcSession,
  ChannelRtcSessionDocument,
} from "../schemas/rtc-session.schema";
import { MediaState } from "../enum/enum";

type SocketMeta = {
  userDehiveId?: string;
  sessionId?: string;
  callId?: string;
};

@WebSocketGateway({
  namespace: "/channel-rtc",
  cors: { origin: "*" },
})
export class ChannelCallGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly meta = new WeakMap<Socket, SocketMeta>();

  constructor(
    private readonly service: ChannelCallService,
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    @InjectModel(ChannelCall.name)
    private readonly channelCallModel: Model<ChannelCallDocument>,
    @InjectModel(ChannelParticipant.name)
    private readonly participantModel: Model<ChannelParticipantDocument>,
    @InjectModel(ChannelRtcSession.name)
    private readonly rtcSessionModel: Model<ChannelRtcSessionDocument>,
  ) {}

  private send(client: Socket, event: string, data: unknown) {
    const serializedData = JSON.parse(JSON.stringify(data));
    client.emit(event, serializedData);
  }

  handleConnection(client: Socket) {
    console.log(
      "[CHANNEL-RTC-WS] Client connected to /channel-rtc namespace. Awaiting identity.",
    );
    this.meta.set(client, {});
  }

  handleDisconnect(client: Socket) {
    const meta = this.meta.get(client);
    if (meta?.userDehiveId) {
      console.log(
        `[CHANNEL-RTC-WS] User ${meta.userDehiveId} disconnected from /channel-rtc.`,
      );
      this.handleUserDisconnect(meta.userDehiveId, meta.callId);
    }
    this.meta.delete(client);
  }

  private async handleUserDisconnect(userId: string, callId?: string) {
    if (callId) {
      try {
        await this.service.handleUserDisconnect(userId, callId);
      } catch (error) {
        console.error(
          "[CHANNEL-RTC-WS] Error handling user disconnect:",
          error,
        );
      }
    }
  }

  @SubscribeMessage("identity")
  async handleIdentity(
    @MessageBody() data: string | { userDehiveId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`[CHANNEL-RTC-WS] Identity request received:`, data);

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
      console.log(`[CHANNEL-RTC-WS] User identified as ${userDehiveId}`);
      this.send(client, "identityConfirmed", {
        userDehiveId,
        status: "success",
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    console.log(`[CHANNEL-RTC-WS] Ping received from ${client.id}`);
    this.send(client, "pong", {
      timestamp: new Date().toISOString(),
      message: "pong",
    });
  }

  @SubscribeMessage("joinCall")
  async handleJoinCall(
    @MessageBody()
    data:
      | {
          channel_id: string;
          with_video?: boolean;
          with_audio?: boolean;
        }
      | string,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    // Parse data if string
    let parsedData: {
      channel_id: string;
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

    if (!userId) {
      return this.send(client, "error", {
        message: "Please identify first",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const result = await this.service.joinCall(
        userId,
        parsedData.channel_id,
        parsedData.with_video ?? false,
        parsedData.with_audio ?? true,
      );

      meta.callId = String(result.call._id);

      // Notify user who joined
      this.send(client, "callJoined", {
        call_id: result.call._id,
        participant_id: result.participant._id,
        status: result.call.status,
        current_participants: result.call.current_participants,
        other_participants: result.otherParticipants,
        timestamp: new Date().toISOString(),
      });

      // Join channel room
      void client.join(`channel:${parsedData.channel_id}`);

      // Notify others in the call
      this.server
        .to(`channel:${parsedData.channel_id}`)
        .except(client.id)
        .emit("userJoined", {
          call_id: result.call._id,
          user_id: userId,
          user_info: await this.service.getUserProfile(userId),
          with_video: parsedData.with_video ?? false,
          with_audio: parsedData.with_audio ?? true,
          current_participants: result.call.current_participants,
          timestamp: new Date().toISOString(),
        });
    } catch (error) {
      console.error("[CHANNEL-RTC-WS] Error joining call:", error);
      this.send(client, "error", {
        message: "Failed to join call",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("leaveCall")
  async handleLeaveCall(
    @MessageBody() data: { call_id: string } | string,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    // Parse data if string
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
      const result = await this.service.leaveCall(userId, parsedData.call_id);

      const call = result.call;

      // Get channel_id to notify others
      const channelId = String(call.channel_id);

      // Notify user who left
      this.send(client, "callLeft", {
        call_id: call._id,
        status: call.status,
        remaining_participants: call.current_participants,
        timestamp: new Date().toISOString(),
      });

      // Leave channel room
      void client.leave(`channel:${channelId}`);

      // Notify others in the call
      this.server.to(`channel:${channelId}`).emit("userLeft", {
        call_id: call._id,
        user_id: userId,
        remaining_participants: call.current_participants,
        call_ended: call.current_participants === 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[CHANNEL-RTC-WS] Error leaving call:", error);
      this.send(client, "error", {
        message: "Failed to leave call",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("signalOffer")
  async handleSignalOffer(
    @MessageBody() data: SignalOfferDto | string,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    // Parse data if string
    let parsedData: SignalOfferDto;
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
      await this.service.handleSignalOffer(userId, parsedData);

      // Forward offer to specific target user
      this.server.to(`user:${parsedData.target_user_id}`).emit("signalOffer", {
        call_id: parsedData.call_id,
        offer: parsedData.offer,
        metadata: parsedData.metadata,
        from_user_id: userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[CHANNEL-RTC-WS] Error handling signal offer:", error);
      this.send(client, "error", {
        message: "Failed to handle signal offer",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("signalAnswer")
  async handleSignalAnswer(
    @MessageBody() data: SignalAnswerDto | string,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    // Parse data if string
    let parsedData: SignalAnswerDto;
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
      await this.service.handleSignalAnswer(userId, parsedData);

      // Forward answer to specific target user
      this.server.to(`user:${parsedData.target_user_id}`).emit("signalAnswer", {
        call_id: parsedData.call_id,
        answer: parsedData.answer,
        metadata: parsedData.metadata,
        from_user_id: userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[CHANNEL-RTC-WS] Error handling signal answer:", error);
      this.send(client, "error", {
        message: "Failed to handle signal answer",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("iceCandidate")
  async handleIceCandidate(
    @MessageBody() data: IceCandidateDto | string,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    // Parse data if string
    let parsedData: IceCandidateDto;
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
      await this.service.handleIceCandidate(userId, parsedData);

      // Forward ICE candidate to specific target user
      this.server.to(`user:${parsedData.target_user_id}`).emit("iceCandidate", {
        call_id: parsedData.call_id,
        candidate: parsedData.candidate,
        sdpMLineIndex: parsedData.sdpMLineIndex,
        sdpMid: parsedData.sdpMid,
        metadata: parsedData.metadata,
        from_user_id: userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[CHANNEL-RTC-WS] Error handling ICE candidate:", error);
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
    data:
      | { call_id: string; media_type: "audio" | "video"; state: MediaState }
      | string,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    // Parse data if string
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
      const enabled =
        parsedData.state === "enabled" || parsedData.state === "unmuted";
      await this.service.toggleMedia(
        userId,
        parsedData.call_id,
        parsedData.media_type,
        enabled,
      );

      // Get call to find channel
      const call = await this.channelCallModel
        .findById(parsedData.call_id)
        .lean();
      if (call) {
        const channelId = String(call.channel_id);

        // Notify all users in the channel
        this.server.to(`channel:${channelId}`).emit("mediaToggled", {
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
      console.error("[CHANNEL-RTC-WS] Error toggling media:", error);
      this.send(client, "error", {
        message: "Failed to toggle media",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage("updateParticipantStatus")
  async handleUpdateParticipantStatus(
    @MessageBody()
    data: { call_id: string; status: string } | string,
    @ConnectedSocket() client: Socket,
  ) {
    const meta = this.meta.get(client);
    const userId = meta?.userDehiveId;

    // Parse data if string
    let parsedData: { call_id: string; status: string };
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
      await this.participantModel.findOneAndUpdate(
        {
          call_id: new Types.ObjectId(parsedData.call_id),
          user_id: new Types.ObjectId(userId),
        },
        {
          $set: { status: parsedData.status },
        },
      );

      // Get call to find channel
      const call = await this.channelCallModel
        .findById(parsedData.call_id)
        .lean();
      if (call) {
        const channelId = String(call.channel_id);

        // Notify all users in the channel
        this.server
          .to(`channel:${channelId}`)
          .emit("participantStatusChanged", {
            call_id: parsedData.call_id,
            user_id: userId,
            status: parsedData.status,
            timestamp: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error(
        "[CHANNEL-RTC-WS] Error updating participant status:",
        error,
      );
      this.send(client, "error", {
        message: "Failed to update participant status",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }
}

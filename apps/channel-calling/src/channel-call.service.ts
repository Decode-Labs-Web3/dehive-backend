import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
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
import { CallStatus, CallEndReason } from "../enum/enum";
import { UserProfile } from "../interfaces/user-profile.interface";
import { UserDehiveLean } from "../interfaces/user-dehive-lean.interface";
import { DecodeApiClient } from "../clients/decode-api.client";

@Injectable()
export class ChannelCallService {
  private readonly logger = new Logger(ChannelCallService.name);

  constructor(
    @InjectModel(ChannelCall.name)
    private channelCallModel: Model<ChannelCallDocument>,
    @InjectModel(ChannelParticipant.name)
    private channelParticipantModel: Model<ChannelParticipantDocument>,
    @InjectModel(ChannelRtcSession.name)
    private rtcSessionModel: Model<ChannelRtcSessionDocument>,
    private configService: ConfigService,
    private decodeApiClient: DecodeApiClient,
  ) {}

  async joinCall(
    userId: string,
    channelId: string,
    withVideo: boolean = false,
    withAudio: boolean = true,
  ): Promise<{
    call: ChannelCallDocument;
    participant: ChannelParticipantDocument;
    otherParticipants: UserDehiveLean[];
  }> {
    this.logger.log(`User ${userId} joining voice channel ${channelId}`);

    // Find or create call for this channel (Discord style - always active)
    let call = await this.channelCallModel
      .findOne({ channel_id: channelId, status: CallStatus.CONNECTED })
      .exec();

    if (!call) {
      // Create new voice channel call
      call = new this.channelCallModel({
        channel_id: channelId,
        status: CallStatus.CONNECTED,
        current_participants: 0,
        started_at: new Date(),
      });
      await call.save();
      this.logger.log(
        `Created new voice channel call for channel ${channelId}`,
      );
    }

    // Check if user is already in the call
    const existingParticipant = await this.channelParticipantModel
      .findOne({ call_id: call._id, user_id: userId })
      .exec();

    if (existingParticipant) {
      this.logger.log(`User ${userId} already in call ${call._id}`);
      const otherParticipants = await this.getOtherParticipants(
        String(call._id),
        userId,
      );
      return {
        call,
        participant: existingParticipant,
        otherParticipants,
      };
    }

    // Create new participant
    const participant = new this.channelParticipantModel({
      call_id: call._id,
      user_id: userId,
      is_muted: false,
      is_video_enabled: withVideo,
      is_audio_enabled: withAudio,
      joined_at: new Date(),
    });
    await participant.save();

    // Update call participant count
    await this.channelCallModel
      .findByIdAndUpdate(call._id, {
        $inc: { current_participants: 1 },
      })
      .exec();

    // Get other participants
    const otherParticipants = await this.getOtherParticipants(
      String(call._id as any),
      userId,
    );

    this.logger.log(
      `User ${userId} joined voice channel ${channelId}. Total participants: ${call.current_participants + 1}`,
    );

    return {
      call,
      participant,
      otherParticipants,
    };
  }

  async leaveCall(
    userId: string,
    callId: string,
  ): Promise<{
    call: ChannelCallDocument;
  }> {
    this.logger.log(`User ${userId} leaving voice channel call ${callId}`);

    // Find participant
    const participant = await this.channelParticipantModel
      .findOne({ call_id: callId, user_id: userId })
      .exec();

    if (!participant) {
      throw new NotFoundException(
        "Participant not found in this voice channel",
      );
    }

    // Remove participant
    await this.channelParticipantModel
      .findByIdAndDelete(participant._id)
      .exec();

    // Update call participant count
    const call = await this.channelCallModel
      .findByIdAndUpdate(
        callId,
        {
          $inc: { current_participants: -1 },
        },
        { new: true },
      )
      .exec();

    if (!call) {
      throw new NotFoundException("Voice channel call not found");
    }

    // Discord style: Only end call if no participants left
    if (call.current_participants <= 0) {
      await this.channelCallModel
        .findByIdAndUpdate(callId, {
          status: CallStatus.ENDED,
          end_reason: CallEndReason.USER_HANGUP,
          ended_at: new Date(),
        })
        .exec();
      this.logger.log(
        `Voice channel call ${callId} ended - no participants left`,
      );
    }

    this.logger.log(
      `User ${userId} left voice channel call ${callId}. Remaining participants: ${call.current_participants}`,
    );

    return { call };
  }

  async getCallParticipants(
    callId: string,
    userId: string,
  ): Promise<UserDehiveLean[]> {
    this.logger.log(`Getting participants for call ${callId}`);

    const call = await this.channelCallModel.findById(callId).exec();
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    // Check if user is in this call
    const userParticipant = await this.channelParticipantModel
      .findOne({ call_id: callId, user_id: userId })
      .exec();

    if (!userParticipant) {
      throw new NotFoundException("User not in this call");
    }

    return await this.getOtherParticipants(callId, userId);
  }

  async getCallStatus(
    callId: string,
    userId: string,
  ): Promise<ChannelCallDocument> {
    this.logger.log(`Getting status for call ${callId}`);

    const call = await this.channelCallModel.findById(callId).exec();
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    // Check if user is in this call
    const userParticipant = await this.channelParticipantModel
      .findOne({ call_id: callId, user_id: userId })
      .exec();

    if (!userParticipant) {
      throw new NotFoundException("User not in this call");
    }

    return call;
  }

  async toggleMedia(
    userId: string,
    callId: string,
    mediaType: "audio" | "video",
    enabled: boolean,
  ): Promise<ChannelParticipantDocument> {
    this.logger.log(
      `User ${userId} toggling ${mediaType} to ${enabled} in call ${callId}`,
    );

    const participant = await this.channelParticipantModel
      .findOne({ call_id: callId, user_id: userId })
      .exec();

    if (!participant) {
      throw new NotFoundException("Participant not found in this call");
    }

    const updateField =
      mediaType === "audio" ? "is_audio_enabled" : "is_video_enabled";

    await this.channelParticipantModel
      .findByIdAndUpdate(participant._id, {
        [updateField]: enabled,
      })
      .exec();

    const updatedParticipant = await this.channelParticipantModel
      .findById(participant._id)
      .exec();

    if (!updatedParticipant) {
      throw new NotFoundException("Participant not found after update");
    }

    this.logger.log(
      `User ${userId} ${mediaType} toggled to ${enabled} in call ${callId}`,
    );

    return updatedParticipant;
  }

  async getTurnCredentials(): Promise<{
    username: string;
    credential: string;
  }> {
    const secret = this.configService.get<string>("TURN_SECRET");
    if (!secret) {
      throw new Error("TURN_SECRET not configured");
    }

    const unixTimeStamp = Math.floor(Date.now() / 1000) + 24 * 3600; // 24 hours
    const username = unixTimeStamp.toString();
    const credential = require("crypto")
      .createHmac("sha1", secret)
      .update(username)
      .digest("base64");

    return { username, credential };
  }

  async getIceServers(): Promise<
    Array<{ urls: string; username?: string; credential?: string }>
  > {
    const turnCredentials = await this.getTurnCredentials();

    // Get TURN server config from environment (default to localhost for local dev)
    const turnHost = this.configService.get<string>("TURN_HOST") || "localhost";
    const turnPort = this.configService.get<number>("TURN_PORT") || 3478;

    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      {
        urls: `turn:${turnHost}:${turnPort}`,
        username: turnCredentials.username,
        credential: turnCredentials.credential,
      },
    ];
  }

  private async getOtherParticipants(
    callId: string,
    userId: string,
  ): Promise<UserDehiveLean[]> {
    const participants = await this.channelParticipantModel
      .find({ call_id: callId, user_id: { $ne: userId } })
      .exec();

    const userIds = participants.map((p) => p.user_id.toString());

    if (userIds.length === 0) {
      return [];
    }

    try {
      const users = await this.decodeApiClient.getUsersByIds(userIds);
      return users.map((user) => ({
        _id: user._id,
        username: user.username,
        display_name: user.display_name,
        avatar_ipfs_hash: user.avatar_ipfs_hash,
      }));
    } catch (error) {
      this.logger.error("Error fetching user profiles:", error);
      return [];
    }
  }

  async handleUserDisconnect(userId: string, callId: string): Promise<void> {
    this.logger.log(`Handling user disconnect: ${userId} from call ${callId}`);

    try {
      // Find and remove participant
      const participant = await this.channelParticipantModel
        .findOne({ call_id: callId, user_id: userId })
        .exec();

      if (participant) {
        await this.channelParticipantModel
          .findByIdAndDelete(participant._id)
          .exec();

        // Update call participant count
        await this.channelCallModel
          .findByIdAndUpdate(callId, {
            $inc: { current_participants: -1 },
          })
          .exec();

        // Check if call should be ended
        const call = await this.channelCallModel.findById(callId).exec();
        if (call && call.current_participants <= 1) {
          await this.channelCallModel
            .findByIdAndUpdate(callId, {
              status: CallStatus.ENDED,
              end_reason: CallEndReason.USER_HANGUP,
              ended_at: new Date(),
            })
            .exec();
        }
      }
    } catch (error) {
      this.logger.error(`Error handling user disconnect: ${error}`);
    }
  }

  async handleSignalOffer(userId: string, data: any): Promise<void> {
    this.logger.log(
      `Handling signal offer for user ${userId} in call ${data.call_id}`,
    );

    try {
      const call = await this.channelCallModel.findById(data.call_id);
      if (!call) {
        throw new NotFoundException("Call not found");
      }

      // Check if user is participant in this call
      const participant = await this.channelParticipantModel
        .findOne({ call_id: data.call_id, user_id: userId })
        .exec();

      if (!participant) {
        throw new NotFoundException("User not in this call");
      }

      // Update or create RTC session
      await this.rtcSessionModel.findOneAndUpdate(
        { call_id: call._id, user_id: userId },
        {
          $set: {
            offers: [data.offer],
            last_activity: new Date(),
          },
          $setOnInsert: {
            session_id: require("crypto").randomUUID(),
            socket_id: "",
            is_active: true,
          },
        },
        { upsert: true, new: true },
      );

      this.logger.log(
        `Signal offer handled for call ${data.call_id} by user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Error handling signal offer: ${error}`);
      throw error;
    }
  }

  async handleSignalAnswer(userId: string, data: any): Promise<void> {
    this.logger.log(
      `Handling signal answer for user ${userId} in call ${data.call_id}`,
    );

    try {
      const call = await this.channelCallModel.findById(data.call_id);
      if (!call) {
        throw new NotFoundException("Call not found");
      }

      // Check if user is participant in this call
      const participant = await this.channelParticipantModel
        .findOne({ call_id: data.call_id, user_id: userId })
        .exec();

      if (!participant) {
        throw new NotFoundException("User not in this call");
      }

      // Update RTC session
      await this.rtcSessionModel.findOneAndUpdate(
        { call_id: call._id, user_id: userId },
        {
          $set: {
            answers: [data.answer],
            last_activity: new Date(),
          },
        },
        { new: true },
      );

      this.logger.log(
        `Signal answer handled for call ${data.call_id} by user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Error handling signal answer: ${error}`);
      throw error;
    }
  }

  async handleIceCandidate(userId: string, data: any): Promise<void> {
    this.logger.log(
      `Handling ICE candidate for user ${userId} in call ${data.call_id}`,
    );

    try {
      const call = await this.channelCallModel.findById(data.call_id);
      if (!call) {
        throw new NotFoundException("Call not found");
      }

      // Check if user is participant in this call
      const participant = await this.channelParticipantModel
        .findOne({ call_id: data.call_id, user_id: userId })
        .exec();

      if (!participant) {
        throw new NotFoundException("User not in this call");
      }

      // Update RTC session with ICE candidate
      await this.rtcSessionModel.findOneAndUpdate(
        { call_id: call._id, user_id: userId },
        {
          $push: {
            ice_candidates: {
              candidate: data.candidate,
              sdpMLineIndex: data.sdpMLineIndex,
              sdpMid: data.sdpMid,
              timestamp: new Date(),
            },
          },
          $set: {
            last_activity: new Date(),
          },
        },
        { new: true },
      );

      this.logger.log(
        `ICE candidate handled for call ${data.call_id} by user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Error handling ICE candidate: ${error}`);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<UserDehiveLean | null> {
    this.logger.log(`Getting user profile for ${userId}`);

    try {
      const users = await this.decodeApiClient.getUsersByIds([userId]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      this.logger.error(`Error getting user profile: ${error}`);
      return null;
    }
  }
}

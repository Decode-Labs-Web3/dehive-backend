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
import { CallStatus, CallEndReason } from "../enum/enum";
import { UserDehiveLean } from "../interfaces/user-dehive-lean.interface";
import { DecodeApiClient } from "../clients/decode-api.client";
import { StreamCallService } from "./stream-call.service";

@Injectable()
export class ChannelCallService {
  private readonly logger = new Logger(ChannelCallService.name);

  constructor(
    @InjectModel(ChannelCall.name)
    private channelCallModel: Model<ChannelCallDocument>,
    @InjectModel(ChannelParticipant.name)
    private channelParticipantModel: Model<ChannelParticipantDocument>,
    private configService: ConfigService,
    private decodeApiClient: DecodeApiClient,
    private streamCallService: StreamCallService,
  ) {}

  async joinChannel(
    userId: string,
    channelId: string,
    withVideo: boolean = false,
    withAudio: boolean = true,
  ): Promise<{
    call: ChannelCallDocument;
    participant: ChannelParticipantDocument;
    otherParticipants: UserDehiveLean[];
    streamInfo: {
      callId: string;
      callerToken: string;
      calleeToken: string;
      streamConfig: unknown;
    };
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
      // Generate Stream.io info for existing participant
      const streamInfo = await this.streamCallService.createChannelCall(
        channelId,
        [userId, ...otherParticipants.map((p) => p._id)],
      );

      return {
        call,
        participant: existingParticipant,
        otherParticipants,
        streamInfo,
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
      String(call._id),
      userId,
    );

    // Generate Stream.io info for channel call
    const streamInfo = await this.streamCallService.createChannelCall(
      channelId,
      [userId, ...otherParticipants.map((p) => p._id)],
    );

    this.logger.log(
      `User ${userId} joined voice channel ${channelId}. Total participants: ${call.current_participants + 1}`,
    );

    return {
      call,
      participant,
      otherParticipants,
      streamInfo,
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
        { $inc: { current_participants: -1 } },
        { new: true },
      )
      .exec();

    if (!call) {
      throw new NotFoundException("Call not found");
    }

    // If no participants left, end the call
    if (call.current_participants <= 0) {
      await this.channelCallModel
        .findByIdAndUpdate(callId, {
          status: CallStatus.ENDED,
          ended_at: new Date(),
          end_reason: CallEndReason.ALL_PARTICIPANTS_LEFT,
        })
        .exec();
    }

    this.logger.log(
      `User ${userId} left voice channel call ${callId}. Remaining participants: ${call.current_participants}`,
    );

    return { call };
  }

  async getStreamConfig(): Promise<{
    apiKey: string;
    environment: string;
  }> {
    this.logger.log("Getting Stream.io configuration for channel calling");
    return await this.streamCallService.getStreamConfig();
  }

  async getStreamToken(userId: string): Promise<string> {
    this.logger.log(`Getting Stream.io token for user ${userId}`);
    return await this.streamCallService.generateStreamToken(userId);
  }

  /**
   * Generate Stream.io Call ID for channel call
   */
  generateStreamCallId(): string {
    return this.streamCallService.generateStreamCallId();
  }

  async getOtherParticipants(
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
        bio: user.bio,
        status: user.status,
        is_active: user.is_active,
      }));
    } catch (error) {
      this.logger.error("Error fetching other participants:", error);
      return [];
    }
  }

  async getUserProfile(userId: string): Promise<UserDehiveLean | null> {
    this.logger.log(`Getting user profile for ${userId}`);

    try {
      const users = await this.decodeApiClient.getUsersByIds([userId]);
      if (users.length === 0) {
        return null;
      }

      const user = users[0];
      return {
        _id: user._id,
        username: user.username,
        display_name: user.display_name,
        avatar_ipfs_hash: user.avatar_ipfs_hash,
        bio: user.bio,
        status: user.status,
        is_active: user.is_active,
      };
    } catch (error) {
      this.logger.error("Error getting user profile:", error);
      return null;
    }
  }

  async handleUserDisconnect(userId: string): Promise<void> {
    this.logger.log(`Handling user disconnect for ${userId}`);

    try {
      // Find all active calls where user is participating
      const participants = await this.channelParticipantModel
        .find({ user_id: userId })
        .populate("call_id")
        .exec();

      for (const participant of participants) {
        const call = participant.call_id as any;
        if (call && call.status === CallStatus.CONNECTED) {
          // Remove participant
          await this.channelParticipantModel
            .findByIdAndDelete(participant._id)
            .exec();

          // Update call participant count
          await this.channelCallModel
            .findByIdAndUpdate(
              call._id,
              { $inc: { current_participants: -1 } },
              { new: true },
            )
            .exec();

          // If no participants left, end the call
          if (call.current_participants <= 1) {
            await this.channelCallModel
              .findByIdAndUpdate(call._id, {
                status: CallStatus.ENDED,
                ended_at: new Date(),
                end_reason: CallEndReason.ALL_PARTICIPANTS_LEFT,
              })
              .exec();
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error handling user disconnect: ${error}`);
    }
  }
}

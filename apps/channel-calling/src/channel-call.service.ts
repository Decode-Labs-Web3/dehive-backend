import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";
import {
  ChannelCall,
  ChannelCallDocument,
} from "../schemas/channel-call.schema";
import {
  ChannelParticipant,
  ChannelParticipantDocument,
} from "../schemas/channel-participant.schema";
import { CallStatus, CallEndReason } from "../enum/enum";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";
import { Participant } from "../interfaces/participant.interface";
import { DecodeApiClient } from "../clients/decode-api.client";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";

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
    @InjectRedis() private readonly redis: Redis,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async joinChannel(
    userId: string,
    channelId: string,
  ): Promise<{
    call: ChannelCallDocument;
    participant: ChannelParticipantDocument;
    otherParticipants: AuthenticatedUser[];
  }> {
    this.logger.log(`User ${userId} joining voice channel ${channelId}`);

    // Validate channel exists and is a VOICE channel
    await this.validateVoiceChannel(channelId);

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
      is_video_enabled: true,
      is_audio_enabled: true,
      joined_at: new Date(),
    });
    await participant.save();

    // Update call participant count and get updated call
    const updatedCall = await this.channelCallModel
      .findByIdAndUpdate(
        call._id,
        { $inc: { current_participants: 1 } },
        { new: true },
      )
      .exec();

    if (!updatedCall) {
      throw new NotFoundException("Call not found after update");
    }

    // Get other participants
    const otherParticipants = await this.getOtherParticipants(
      String(call._id),
      userId,
    );

    this.logger.log(
      `User ${userId} joined voice channel ${channelId}. Total participants: ${updatedCall.current_participants}`,
    );

    return {
      call: updatedCall,
      participant,
      otherParticipants,
    };
  }

  async leaveChannel(
    userId: string,
    channelId: string,
  ): Promise<{
    call: ChannelCallDocument;
  }> {
    this.logger.log(`User ${userId} leaving voice channel ${channelId}`);

    // Find the call for this channel
    const call = await this.channelCallModel
      .findOne({ channel_id: channelId, status: CallStatus.CONNECTED })
      .exec();

    if (!call) {
      throw new NotFoundException(
        "No active voice call found for this channel",
      );
    }

    // Find participant
    const participant = await this.channelParticipantModel
      .findOne({ call_id: call._id, user_id: userId })
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
    const updatedCall = await this.channelCallModel
      .findByIdAndUpdate(
        call._id,
        { $inc: { current_participants: -1 } },
        { new: true },
      )
      .exec();

    this.logger.log(
      `User ${userId} left voice channel ${channelId}. Participants: ${updatedCall?.current_participants}`,
    );

    if (!updatedCall) {
      throw new NotFoundException("Call not found after update");
    }

    return { call: updatedCall };
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

  async getOtherParticipants(
    callId: string,
    userId: string,
  ): Promise<AuthenticatedUser[]> {
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
        session_id: "",
        fingerprint_hash: "",
      }));
    } catch (error) {
      this.logger.error("Error fetching other participants:", error);
      return [];
    }
  }

  async getUserProfile(userId: string): Promise<AuthenticatedUser | null> {
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
        session_id: "",
        fingerprint_hash: "",
      };
    } catch (error) {
      this.logger.error("Error getting user profile:", error);
      return null;
    }
  }

  async handleUserDisconnect(
    userId: string,
    channelId?: string,
  ): Promise<void> {
    this.logger.log(
      `Handling user disconnect for ${userId} from channel ${channelId}`,
    );

    try {
      if (channelId) {
        // Handle specific channel disconnect
        const call = await this.channelCallModel
          .findOne({ channel_id: channelId, status: CallStatus.CONNECTED })
          .exec();

        if (call) {
          const participant = await this.channelParticipantModel
            .findOne({ call_id: call._id, user_id: userId })
            .exec();

          if (participant) {
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
      } else {
        // Handle all channel disconnects
        const participants = await this.channelParticipantModel
          .find({ user_id: userId })
          .populate("call_id")
          .exec();

        for (const participant of participants) {
          const call = participant.call_id as unknown as ChannelCallDocument;
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
      }
    } catch (error) {
      this.logger.error(`Error handling user disconnect: ${error}`);
    }
  }

  /**
   * Toggle media (audio/video) for a participant in a channel call
   */

  /**
   * Get active participants in a channel call
   */
  async getChannelParticipants(
    channelId: string,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<Participant[]> {
    this.logger.log(`Getting participants for channel ${channelId}`);

    try {
      const call = await this.channelCallModel
        .findOne({ channel_id: channelId, status: CallStatus.CONNECTED })
        .exec();

      if (!call) {
        return [];
      }

      const participants = await this.channelParticipantModel
        .find({ call_id: call._id })
        .exec();

      const userIds = participants.map((p) => p.user_id.toString());

      if (userIds.length === 0) {
        return [];
      }

      try {
        const users = await this.decodeApiClient.getUsersByIds(
          userIds,
          sessionId,
          fingerprintHash,
        );
        return users.map(
          (user): Participant => ({
            _id: user._id,
            username: user.username,
            display_name: user.display_name,
            avatar_ipfs_hash: user.avatar_ipfs_hash,
            bio: user.bio,
            status: user.status,
            is_active: user.is_active,
          }),
        );
      } catch (error) {
        this.logger.error("Error fetching participants:", error);
        return [];
      }
    } catch (error) {
      this.logger.error(
        `Error getting participants for channel ${channelId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Get call history for a channel
   */
  async getChannelCallHistory(
    channelId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<unknown[]> {
    this.logger.log(`Getting call history for channel ${channelId}`);

    try {
      return this.channelCallModel
        .find({ channel_id: channelId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();
    } catch (error) {
      this.logger.error(
        `Error getting call history for channel ${channelId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get active calls across all channels
   */
  async getActiveChannelCalls(): Promise<
    {
      call_id: string;
      channel_id: string;
      status: string;
      participant_count: number;
      created_at: Date;
      started_at?: Date;
    }[]
  > {
    this.logger.log("Getting all active channel calls");

    try {
      const calls = await this.channelCallModel
        .find({ status: CallStatus.CONNECTED })
        .select(
          "_id channel_id status current_participants createdAt started_at",
        )
        .lean();

      return calls.map((call) => ({
        call_id: String(call._id),
        channel_id: String(call.channel_id),
        status: call.status,
        participant_count: call.current_participants,
        created_at: (call as Record<string, unknown>).createdAt as Date,
        started_at: (call as Record<string, unknown>).started_at as
          | Date
          | undefined,
      }));
    } catch (error) {
      this.logger.error("Error getting active channel calls:", error);
      throw error;
    }
  }

  /**
   * Get session and fingerprint from current request
   */
  private getAuthHeaders(): {
    sessionId?: string;
    fingerprintHash?: string;
  } {
    const user = (this.request as { user?: AuthenticatedUser }).user;
    return {
      sessionId: user?.session_id,
      fingerprintHash: user?.fingerprint_hash,
    };
  }

  /**
   * Validate that a channel exists and is a VOICE channel
   */
  private async validateVoiceChannel(channelId: string): Promise<void> {
    try {
      this.logger.log(`Validating channel ${channelId} is a VOICE channel`);

      // Check cache first
      const cacheKey = `channel:${channelId}:type`;
      const cachedType = await this.redis.get(cacheKey);

      if (cachedType) {
        if (cachedType !== "VOICE") {
          throw new BadRequestException(
            `Cannot join voice call in TEXT channel. Channel type: ${cachedType}`,
          );
        }
        this.logger.log(
          `Channel ${channelId} validated from cache as VOICE channel`,
        );
        return;
      }

      // Get auth headers from current request
      const { sessionId, fingerprintHash } = this.getAuthHeaders();

      // Fetch channel info from server service via DecodeApiClient
      const channel = await this.decodeApiClient.getChannelById(
        channelId,
        sessionId,
        fingerprintHash,
      );

      if (!channel) {
        throw new NotFoundException(
          `Channel ${channelId} not found or failed to fetch channel information`,
        );
      }

      // Check if channel type is VOICE
      if (channel.type !== "VOICE") {
        throw new BadRequestException(
          `Cannot join voice call in TEXT channel. This channel is for text messages only.`,
        );
      }

      // Cache the result for 1 hour
      await this.redis.setex(cacheKey, 3600, channel.type);

      this.logger.log(
        `Channel ${channelId} validated as VOICE channel and cached`,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        `Error validating channel ${channelId}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        `Failed to validate channel: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

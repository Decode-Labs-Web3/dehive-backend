import { Injectable, Logger, NotFoundException } from "@nestjs/common";
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
import { ParticipantsResponse } from "../interfaces/participants-response.interface";
import { DecodeApiClient } from "../clients/decode-api.client";

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

    // Check if user is already in the call (by logical channel id)
    const existingParticipant = await this.channelParticipantModel
      .findOne({ channel_id: channelId, user_id: userId })
      .exec();

    if (existingParticipant) {
      this.logger.log(`User ${userId} already in call ${call._id}`);
      const otherParticipants = await this.getOtherParticipants(
        channelId,
        userId,
      );

      return {
        call,
        participant: existingParticipant,
        otherParticipants,
      };
    }

    // Create new participant
    // Store logical channel id on participant (not the call document id)
    const participant = new this.channelParticipantModel({
      channel_id: channelId,
      user_id: userId,
      is_muted: false,
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
      channelId,
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
      .findOne({ channel_id: channelId, user_id: userId })
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
      throw new NotFoundException("Call not found");
    }

    // Find participant by logical channel id
    const participant = await this.channelParticipantModel
      .findOne({ channel_id: channelId, user_id: userId })
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

    if (!updatedCall) {
      throw new NotFoundException("Call not found after update");
    }

    // If no participants left, end the call
    if (updatedCall.current_participants <= 0) {
      await this.channelCallModel
        .findByIdAndUpdate(call._id, {
          status: CallStatus.ENDED,
          ended_at: new Date(),
          end_reason: CallEndReason.ALL_PARTICIPANTS_LEFT,
        })
        .exec();
    }

    this.logger.log(
      `User ${userId} left voice channel ${channelId}. Remaining participants: ${updatedCall.current_participants}`,
    );

    return { call: updatedCall };
  }

  async getOtherParticipants(
    channelId: string,
    userId: string,
  ): Promise<AuthenticatedUser[]> {
    const participants = await this.channelParticipantModel
      .find({ channel_id: channelId, user_id: { $ne: userId } })
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
            .findOne({ channel_id: call._id, user_id: userId })
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
          .exec();

        for (const participant of participants) {
          // participant.channel_id stores the logical channel id (string/ObjectId)
          const channelIdFromParticipant =
            participant.channel_id as unknown as string;
          const call = await this.channelCallModel
            .findOne({
              channel_id: channelIdFromParticipant,
              status: CallStatus.CONNECTED,
            })
            .exec();
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

  async getChannelParticipants(
    channelId: string,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<ParticipantsResponse> {
    this.logger.log(`Getting participants for channel ${channelId}`);

    try {
      const call = await this.channelCallModel
        .findOne({ channel_id: channelId, status: CallStatus.CONNECTED })
        .exec();

      if (!call) {
        return { participants: [] };
      }

      const participants = await this.channelParticipantModel
        .find({ channel_id: channelId })
        .exec();

      const userIds = participants.map((p) => p.user_id.toString());

      if (userIds.length === 0) {
        return { participants: [] };
      }

      try {
        const users = await this.decodeApiClient.getUsersByIds(
          userIds,
          sessionId,
          fingerprintHash,
        );
        return {
          participants: users.map(
            (user): Participant => ({
              _id: user._id,
              username: user.username,
              display_name: user.display_name,
              avatar_ipfs_hash: user.avatar_ipfs_hash,
            }),
          ),
        };
      } catch (error) {
        this.logger.error("Error fetching participants:", error);
        return { participants: [] };
      }
    } catch (error) {
      this.logger.error(
        `Error getting participants for channel ${channelId}:`,
        error,
      );
      return { participants: [] };
    }
  }
}

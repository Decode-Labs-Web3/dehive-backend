import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
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
import {
  Category,
  CategoryDocument,
} from "../../server/schemas/category.schema";
import { Channel, ChannelDocument } from "../../server/schemas/channel.schema";
import { CallStatus, CallEndReason } from "../enum/enum";
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
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(Channel.name)
    private channelModel: Model<ChannelDocument>,
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
    otherParticipants: Array<{
      _id: string;
      username: string;
      display_name: string;
      avatar_ipfs_hash: string;
    }>;
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
  ): Promise<
    Array<{
      _id: string;
      username: string;
      display_name: string;
      avatar_ipfs_hash: string;
    }>
  > {
    const participants = await this.channelParticipantModel
      .find({ channel_id: channelId, user_id: { $ne: userId } })
      .exec();

    const userIds = participants.map((p) => p.user_id.toString());

    if (userIds.length === 0) {
      return [];
    }

    try {
      // Fetch each user profile in parallel
      const userProfiles = await Promise.all(
        userIds.map((id) => this.decodeApiClient.getUserProfilePublic(id)),
      );

      // Filter out null results and return only 4 essential fields
      return userProfiles
        .filter(
          (profile): profile is NonNullable<typeof profile> => profile !== null,
        )
        .map((profile) => ({
          _id: profile._id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_ipfs_hash: profile.avatar_ipfs_hash,
        }));
    } catch (error) {
      this.logger.error("Error fetching other participants:", error);
      return [];
    }
  }

  async getUserProfile(userId: string): Promise<{
    _id: string;
    username: string;
    display_name: string;
    avatar_ipfs_hash: string;
  } | null> {
    this.logger.log(`Getting user profile for ${userId}`);

    try {
      const profile = await this.decodeApiClient.getUserProfilePublic(userId);

      if (!profile) {
        return null;
      }

      return {
        _id: profile._id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_ipfs_hash: profile.avatar_ipfs_hash,
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
    _sessionId?: string,
    _fingerprintHash?: string,
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
        // Fetch each user profile in parallel
        const userProfiles = await Promise.all(
          userIds.map((id) => this.decodeApiClient.getUserProfilePublic(id)),
        );

        // Filter out null results and convert to Participant
        const validProfiles = userProfiles.filter(
          (profile): profile is NonNullable<typeof profile> => profile !== null,
        );

        return {
          participants: validProfiles.map(
            (profile): Participant => ({
              _id: profile._id,
              username: profile.username,
              display_name: profile.display_name,
              avatar_ipfs_hash: profile.avatar_ipfs_hash,
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

  async getServerChannelsWithParticipants(serverId: string): Promise<{
    server_id: string;
    channels: Array<{
      channel_id: string;
      participants: Array<{
        _id: string;
        username: string;
        display_name: string;
        avatar_ipfs_hash: string;
      }>;
    }>;
  }> {
    this.logger.log(
      `Getting all channels with participants for server ${serverId}`,
    );

    try {
      // Get all categories in the server
      const categories = await this.categoryModel
        .aggregate([
          { $match: { server_id: new Types.ObjectId(serverId) } },
          {
            $lookup: {
              from: "channel",
              localField: "_id",
              foreignField: "category_id",
              as: "channels",
            },
          },
        ])
        .exec();

      // Flatten all channels from all categories
      const allChannels: Array<{ _id: Types.ObjectId; name: string }> = [];
      categories.forEach((category) => {
        if (category.channels && Array.isArray(category.channels)) {
          allChannels.push(...category.channels);
        }
      });

      // For each channel, get participants
      const channelsWithParticipants = await Promise.all(
        allChannels.map(async (channel) => {
          const channelId = channel._id.toString();

          // Get all participants in this channel
          const participants = await this.channelParticipantModel
            .find({ channel_id: channelId })
            .exec();

          if (participants.length === 0) {
            return {
              channel_id: channelId,
              participants: [],
            };
          }

          const userIds = participants.map((p) => p.user_id.toString());

          try {
            // Fetch each user profile in parallel
            const userProfiles = await Promise.all(
              userIds.map((id) =>
                this.decodeApiClient.getUserProfilePublic(id),
              ),
            );

            // Filter out null results
            const validProfiles = userProfiles
              .filter(
                (profile): profile is NonNullable<typeof profile> =>
                  profile !== null,
              )
              .map((profile) => ({
                _id: profile._id,
                username: profile.username,
                display_name: profile.display_name,
                avatar_ipfs_hash: profile.avatar_ipfs_hash,
              }));

            return {
              channel_id: channelId,
              participants: validProfiles,
            };
          } catch (error) {
            this.logger.error(
              `Error fetching participants for channel ${channelId}:`,
              error,
            );
            return {
              channel_id: channelId,
              participants: [],
            };
          }
        }),
      );

      return {
        server_id: serverId,
        channels: channelsWithParticipants,
      };
    } catch (error) {
      this.logger.error(
        `Error getting server channels with participants:`,
        error,
      );
      return {
        server_id: serverId,
        channels: [],
      };
    }
  }
}

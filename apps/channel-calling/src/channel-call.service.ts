import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ConfigService } from "@nestjs/config";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";
import { v4 as uuidv4 } from "uuid";
import * as crypto from "crypto";

import { ChannelCall, ChannelCallDocument } from "../schemas/channel-call.schema";
import {
  ChannelParticipant,
  ChannelParticipantDocument,
} from "../schemas/channel-participant.schema";
import {
  ChannelRtcSession,
  ChannelRtcSessionDocument,
} from "../schemas/rtc-session.schema";
import {
  UserDehive,
  UserDehiveDocument,
} from "../../user-dehive-server/schemas/user-dehive.schema";
import { ChannelCallStatus, ParticipantStatus, MediaState } from "../enum/enum";
import { SignalOfferDto } from "../dto/signal-offer.dto";
import { SignalAnswerDto } from "../dto/signal-answer.dto";
import { IceCandidateDto } from "../dto/ice-candidate.dto";
import { UserProfile } from "../interfaces/user-profile.interface";
import { UserDehiveLean } from "../interfaces/user-dehive-lean.interface";
import { DecodeApiClient } from "../clients/decode-api.client";

@Injectable()
export class ChannelCallService {
  private readonly logger = new Logger(ChannelCallService.name);
  private readonly authServiceUrl: string;

  constructor(
    @InjectModel(ChannelCall.name)
    private readonly channelCallModel: Model<ChannelCallDocument>,
    @InjectModel(ChannelParticipant.name)
    private readonly participantModel: Model<ChannelParticipantDocument>,
    @InjectModel(ChannelRtcSession.name)
    private readonly rtcSessionModel: Model<ChannelRtcSessionDocument>,
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    private readonly configService: ConfigService,
    private readonly decodeApiClient: DecodeApiClient,
    @InjectRedis() private readonly redis: Redis,
  ) {
    const host = this.configService.get<string>("DECODE_API_GATEWAY_HOST");
    const port = this.configService.get<number>("DECODE_API_GATEWAY_PORT");
    if (!host || !port) {
      throw new Error(
        "DECODE_API_GATEWAY_HOST and DECODE_API_GATEWAY_PORT must be set in .env file!",
      );
    }
    this.authServiceUrl = `http://${host}:${port}`;
  }

  /**
   * Join voice channel call
   */
  async joinCall(
    userId: string,
    channelId: string,
    withVideo: boolean = false,
    withAudio: boolean = true,
  ): Promise<{
    call: ChannelCallDocument;
    participant: ChannelParticipantDocument;
    otherParticipants: ChannelParticipantDocument[];
  }> {
    this.logger.log(`User ${userId} joining call in channel ${channelId}`);

    // Validate user exists
    const user = await this.userDehiveModel.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Get or create active call for this channel
    let call = await this.channelCallModel.findOne({
      channel_id: new Types.ObjectId(channelId),
      status: { $in: [ChannelCallStatus.WAITING, ChannelCallStatus.ACTIVE] },
    });

    if (!call) {
      // Create new call if none exists
      call = new this.channelCallModel({
        channel_id: new Types.ObjectId(channelId),
        server_id: new Types.ObjectId("000000000000000000000000"), // Will be updated
        status: ChannelCallStatus.WAITING,
        started_at: new Date(),
        current_participants: 0,
        max_participants: 0,
      });
      await call.save();
      this.logger.log(`Created new call ${call._id} for channel ${channelId}`);
    }

    // Check if user already in call
    const existing = await this.participantModel.findOne({
      call_id: call._id,
      user_id: new Types.ObjectId(userId),
      status: { $in: [ParticipantStatus.JOINING, ParticipantStatus.CONNECTED] },
    });

    if (existing) {
      throw new BadRequestException("You are already in this call");
    }

    // Create participant record
    const participant = new this.participantModel({
      call_id: call._id,
      user_id: new Types.ObjectId(userId),
      status: ParticipantStatus.JOINING,
      joined_at: new Date(),
      audio_enabled: withAudio,
      video_enabled: withVideo,
      audio_muted: false,
      video_muted: false,
      screen_sharing: false,
    });

    await participant.save();

    // Update call status and participant count
    call.status = ChannelCallStatus.ACTIVE;
    call.current_participants = await this.participantModel.countDocuments({
      call_id: call._id,
      status: { $in: [ParticipantStatus.JOINING, ParticipantStatus.CONNECTED] },
    });
    call.max_participants = Math.max(
      call.max_participants,
      call.current_participants,
    );
    await call.save();

    // Get other participants
    const otherParticipants = await this.participantModel
      .find({
        call_id: call._id,
        user_id: { $ne: new Types.ObjectId(userId) },
        status: { $in: [ParticipantStatus.JOINING, ParticipantStatus.CONNECTED] },
      })
      .populate("user_id", "username display_name avatar_ipfs_hash")
      .lean();

    // Cache call info
    await this.redis.setex(
      `channel_call:${call._id}`,
      300,
      JSON.stringify({
        channel_id: channelId,
        status: call.status,
        participant_count: call.current_participants,
      }),
    );

    this.logger.log(
      `User ${userId} joined call ${call._id}. Total participants: ${call.current_participants}`,
    );

    return {
      call,
      participant,
      otherParticipants: otherParticipants as unknown as ChannelParticipantDocument[],
    };
  }

  /**
   * Leave voice channel call
   */
  async leaveCall(userId: string, callId: string): Promise<{
    call: ChannelCallDocument;
    participant: ChannelParticipantDocument;
  }> {
    this.logger.log(`User ${userId} leaving call ${callId}`);

    const call = await this.channelCallModel.findById(callId);
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    const participant = await this.participantModel.findOne({
      call_id: call._id,
      user_id: new Types.ObjectId(userId),
      status: { $in: [ParticipantStatus.JOINING, ParticipantStatus.CONNECTED] },
    });

    if (!participant) {
      throw new NotFoundException("You are not in this call");
    }

    // Update participant status
    participant.status = ParticipantStatus.LEFT;
    participant.left_at = new Date();

    if (participant.joined_at) {
      participant.duration_seconds = Math.floor(
        (participant.left_at.getTime() - participant.joined_at.getTime()) / 1000,
      );
    }

    await participant.save();

    // Update call participant count
    call.current_participants = await this.participantModel.countDocuments({
      call_id: call._id,
      status: { $in: [ParticipantStatus.JOINING, ParticipantStatus.CONNECTED] },
    });

    // End call if no one left
    if (call.current_participants === 0) {
      call.status = ChannelCallStatus.ENDED;
      call.ended_at = new Date();

      if (call.started_at) {
        call.duration_seconds = Math.floor(
          (call.ended_at.getTime() - call.started_at.getTime()) / 1000,
        );
      }
    }

    await call.save();

    // Clean up RTC sessions
    await this.rtcSessionModel.updateMany(
      { call_id: call._id, user_id: new Types.ObjectId(userId), is_active: true },
      { is_active: false, ended_at: new Date() },
    );

    // Update cache
    if (call.status === ChannelCallStatus.ENDED) {
      await this.redis.del(`channel_call:${callId}`);
    } else {
      await this.redis.setex(
        `channel_call:${callId}`,
        300,
        JSON.stringify({
          channel_id: String(call.channel_id),
          status: call.status,
          participant_count: call.current_participants,
        }),
      );
    }

    this.logger.log(
      `User ${userId} left call ${callId}. Remaining participants: ${call.current_participants}`,
    );

    return { call, participant };
  }

  /**
   * Handle WebRTC signal offer
   */
  async handleSignalOffer(userId: string, data: SignalOfferDto): Promise<void> {
    const call = await this.channelCallModel.findById(data.call_id);
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    // Verify user is in call
    const participant = await this.participantModel.findOne({
      call_id: call._id,
      user_id: new Types.ObjectId(userId),
      status: { $in: [ParticipantStatus.JOINING, ParticipantStatus.CONNECTED] },
    });

    if (!participant) {
      throw new ForbiddenException("You are not in this call");
    }

    // Update or create RTC session
    await this.rtcSessionModel.findOneAndUpdate(
      { call_id: call._id, user_id: new Types.ObjectId(userId) },
      {
        $push: { offers: data.offer },
        $set: { last_activity: new Date() },
        $setOnInsert: {
          session_id: uuidv4(),
          socket_id: "",
          is_active: true,
        },
      },
      { upsert: true, new: true },
    );

    this.logger.log(`Signal offer handled for call ${data.call_id} by user ${userId}`);
  }

  /**
   * Handle WebRTC signal answer
   */
  async handleSignalAnswer(
    userId: string,
    data: SignalAnswerDto,
  ): Promise<void> {
    const call = await this.channelCallModel.findById(data.call_id);
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    const participant = await this.participantModel.findOne({
      call_id: call._id,
      user_id: new Types.ObjectId(userId),
      status: { $in: [ParticipantStatus.JOINING, ParticipantStatus.CONNECTED] },
    });

    if (!participant) {
      throw new ForbiddenException("You are not in this call");
    }

    // Update RTC session
    await this.rtcSessionModel.findOneAndUpdate(
      { call_id: call._id, user_id: new Types.ObjectId(userId) },
      {
        $push: { answers: data.answer },
        $set: { last_activity: new Date() },
      },
    );

    this.logger.log(`Signal answer handled for call ${data.call_id} by user ${userId}`);
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(
    userId: string,
    data: IceCandidateDto,
  ): Promise<void> {
    const call = await this.channelCallModel.findById(data.call_id);
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    const participant = await this.participantModel.findOne({
      call_id: call._id,
      user_id: new Types.ObjectId(userId),
      status: { $in: [ParticipantStatus.JOINING, ParticipantStatus.CONNECTED] },
    });

    if (!participant) {
      throw new ForbiddenException("You are not in this call");
    }

    // Add ICE candidate
    await this.rtcSessionModel.findOneAndUpdate(
      { call_id: call._id, user_id: new Types.ObjectId(userId) },
      {
        $push: {
          ice_candidates: {
            candidate: data.candidate,
            sdpMLineIndex: data.sdpMLineIndex,
            sdpMid: data.sdpMid,
            timestamp: new Date(),
          },
        },
        $set: { last_activity: new Date() },
      },
    );

    this.logger.log(`ICE candidate handled for call ${data.call_id} by user ${userId}`);
  }

  /**
   * Toggle media (audio/video)
   */
  async toggleMedia(
    userId: string,
    callId: string,
    mediaType: "audio" | "video",
    state: MediaState,
  ): Promise<void> {
    const call = await this.channelCallModel.findById(callId);
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    const participant = await this.participantModel.findOne({
      call_id: call._id,
      user_id: new Types.ObjectId(userId),
      status: { $in: [ParticipantStatus.JOINING, ParticipantStatus.CONNECTED] },
    });

    if (!participant) {
      throw new ForbiddenException("You are not in this call");
    }

    const updateField = `${mediaType}_muted`;
    await this.participantModel.findByIdAndUpdate(participant._id, {
      $set: { [updateField]: state === MediaState.MUTED },
    });

    this.logger.log(
      `Media ${mediaType} ${state} for call ${callId} by user ${userId}`,
    );
  }

  /**
   * Handle user disconnect
   */
  async handleUserDisconnect(userId: string, callId?: string): Promise<void> {
    if (callId) {
      try {
        await this.leaveCall(userId, callId);
      } catch (error) {
        this.logger.error(
          `Error leaving call ${callId} for user ${userId}:`,
          error,
        );
      }
    } else {
      // Leave all active calls
      const activeParticipants = await this.participantModel.find({
        user_id: new Types.ObjectId(userId),
        status: { $in: [ParticipantStatus.JOINING, ParticipantStatus.CONNECTED] },
      });

      for (const participant of activeParticipants) {
        try {
          await this.leaveCall(userId, String(participant.call_id));
        } catch (error) {
          this.logger.error(
            `Error leaving call ${participant.call_id} for user ${userId}:`,
            error,
          );
        }
      }
    }

    // Clean up RTC sessions
    await this.rtcSessionModel.updateMany(
      { user_id: new Types.ObjectId(userId), is_active: true },
      { is_active: false, ended_at: new Date() },
    );
  }

  /**
   * Get TURN credentials
   */
  async getTurnCredentials(): Promise<{
    username: string;
    credential: string;
    ttl: number;
  }> {
    const turnSecret = this.configService.get<string>("TURN_SECRET");

    if (!turnSecret) {
      throw new Error("TURN_SECRET must be set in environment variables");
    }

    const username = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ttl = 24 * 60 * 60; // 24 hours
    const credential = crypto
      .createHmac("sha1", turnSecret)
      .update(username)
      .digest("base64");

    return {
      username,
      credential,
      ttl,
    };
  }

  /**
   * Get ICE servers configuration
   */
  async getIceServers(): Promise<
    Array<{ urls: string; username?: string; credential?: string }>
  > {
    const turnCredentials = await this.getTurnCredentials();
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

  /**
   * Get user profile (with caching)
   */
  async getUserProfile(
    userId: string,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<UserProfile> {
    try {
      const cacheKey = `user_profile:${userId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      let profile: UserProfile | null = null;

      if (sessionId && fingerprintHash) {
        try {
          profile = await this.decodeApiClient.getUserProfile(
            sessionId,
            fingerprintHash,
            userId,
          );

          if (profile) {
            await this.redis.setex(cacheKey, 300, JSON.stringify(profile));
            return profile;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to get profile from decode API for ${userId}:`,
            error,
          );
        }
      }

      const user = (await this.userDehiveModel
        .findById(userId)
        .lean()) as unknown as UserDehiveLean;
      if (!user) {
        throw new NotFoundException("User not found");
      }

      profile = {
        _id: String(user._id),
        username: user.username || "",
        display_name: user.display_name || "",
        avatar_ipfs_hash: user.avatar_ipfs_hash || "",
        bio: user.bio,
        status: user.status,
        banner_color: user.banner_color,
        server_count: user.server_count,
        last_login: user.last_login,
        primary_wallet: user.primary_wallet,
        following_number: user.following_number,
        followers_number: user.followers_number,
        is_following: user.is_following,
        is_follower: user.is_follower,
        is_blocked: user.is_blocked,
        is_blocked_by: user.is_blocked_by,
        mutual_followers_number: user.mutual_followers_number,
        mutual_followers_list: user.mutual_followers_list,
        is_active: user.is_active,
        last_account_deactivation: user.last_account_deactivation,
        dehive_role: user.dehive_role,
        role_subscription: user.role_subscription,
      };

      await this.redis.setex(cacheKey, 300, JSON.stringify(profile));
      return profile;
    } catch (error) {
      this.logger.error(`Error getting user profile for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get participants in a call
   */
  async getParticipants(callId: string): Promise<unknown[]> {
    return this.participantModel
      .find({
        call_id: new Types.ObjectId(callId),
        status: { $in: [ParticipantStatus.JOINING, ParticipantStatus.CONNECTED] },
      })
      .populate("user_id", "username display_name avatar_ipfs_hash")
      .lean();
  }

  /**
   * Get active call for a channel
   */
  async getActiveCallByChannel(channelId: string): Promise<unknown | null> {
    return this.channelCallModel
      .findOne({
        channel_id: new Types.ObjectId(channelId),
        status: { $in: [ChannelCallStatus.WAITING, ChannelCallStatus.ACTIVE] },
      })
      .lean();
  }

  /**
   * Get user's active calls
   */
  async getUserActiveCalls(userId: string): Promise<unknown[]> {
    const participants = await this.participantModel
      .find({
        user_id: new Types.ObjectId(userId),
        status: { $in: [ParticipantStatus.JOINING, ParticipantStatus.CONNECTED] },
      })
      .populate("call_id")
      .lean();

    return participants.map((p) => (p as Record<string, unknown>).call_id);
  }
}

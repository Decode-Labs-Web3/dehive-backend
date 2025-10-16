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

import { DmCall, DmCallDocument } from "../schemas/dm-call.schema";
import { RtcSession, RtcSessionDocument } from "../schemas/rtc-session.schema";
import {
  DirectConversation,
  DirectConversationDocument,
} from "../schemas/direct-conversation.schema";
import {
  DirectMessage,
  DirectMessageDocument,
} from "../schemas/direct-message.schema";
import {
  UserDehive,
  UserDehiveDocument,
} from "../../user-dehive-server/schemas/user-dehive.schema";
import { CallStatus, CallEndReason, MediaState } from "../enum/enum";
import { SignalOfferDto } from "../dto/signal-offer.dto";
import { SignalAnswerDto } from "../dto/signal-answer.dto";
import { IceCandidateDto } from "../dto/ice-candidate.dto";
import { UserProfile } from "../interfaces/user-profile.interface";
import { UserDehiveLean } from "../interfaces/user-dehive-lean.interface";
import { DecodeApiClient } from "../../direct-calling/clients/decode-api.client";

@Injectable()
export class DirectCallService {
  private readonly logger = new Logger(DirectCallService.name);
  private readonly authServiceUrl: string;
  private readonly callTimeoutMs = 30000; // 30 seconds
  private readonly maxConcurrentCalls = 3;

  constructor(
    @InjectModel(DmCall.name)
    private readonly dmCallModel: Model<DmCallDocument>,
    @InjectModel(RtcSession.name)
    private readonly rtcSessionModel: Model<RtcSessionDocument>,
    @InjectModel(DirectConversation.name)
    private readonly conversationModel: Model<DirectConversationDocument>,
    @InjectModel(DirectMessage.name)
    private readonly directMessageModel: Model<DirectMessageDocument>,
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

  async startCall(
    callerId: string,
    targetUserId: string,
    withVideo: boolean = true,
    withAudio: boolean = true,
  ): Promise<DmCallDocument> {
    this.logger.log(`Starting call from ${callerId} to ${targetUserId}`);

    // Validate users exist
    const [caller, targetUser] = await Promise.all([
      this.userDehiveModel.findById(callerId),
      this.userDehiveModel.findById(targetUserId),
    ]);

    if (!caller) {
      throw new NotFoundException("Caller not found");
    }
    if (!targetUser) {
      throw new NotFoundException("Target user not found");
    }

    // Anti-abuse: Check for existing active calls
    await this.checkAntiAbuse(callerId, targetUserId);

    // Get or create conversation
    const conversation = await this.getOrCreateConversation(
      callerId,
      targetUserId,
    );

    // Create call record
    const call = new this.dmCallModel({
      conversation_id: conversation._id,
      caller_id: new Types.ObjectId(callerId),
      callee_id: new Types.ObjectId(targetUserId),
      status: CallStatus.RINGING,
      caller_audio_enabled: withAudio,
      caller_video_enabled: withVideo,
      callee_audio_enabled: true, // Default for callee
      callee_video_enabled: true, // Default for callee
      caller_audio_muted: false,
      caller_video_muted: false,
      callee_audio_muted: false,
      callee_video_muted: false,
    });

    await call.save();

    // Set timeout for call
    setTimeout(async () => {
      try {
        const currentCall = await this.dmCallModel.findById(call._id);
        if (currentCall && currentCall.status === CallStatus.RINGING) {
          await this.endCall(callerId, String(call._id), CallEndReason.TIMEOUT);
        }
      } catch (error) {
        this.logger.error("Error handling call timeout:", error);
      }
    }, this.callTimeoutMs);

    // Cache call info for quick access
    await this.redis.setex(
      `call:${call._id}`,
      300, // 5 minutes
      JSON.stringify({
        caller_id: callerId,
        callee_id: targetUserId,
        status: CallStatus.RINGING,
      }),
    );

    this.logger.log(`Call ${call._id} created successfully`);
    return call;
  }

  async acceptCall(
    calleeId: string,
    callId: string,
    withVideo: boolean = true,
    withAudio: boolean = true,
  ): Promise<DmCallDocument> {
    this.logger.log(`Accepting call ${callId} by ${calleeId}`);

    const call = await this.dmCallModel.findById(callId);
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    if (String(call.callee_id) !== calleeId) {
      throw new ForbiddenException("You can only accept calls directed to you");
    }

    if (call.status !== CallStatus.RINGING) {
      throw new BadRequestException("Call is not in ringing state");
    }

    // Update call status and media settings
    call.status = CallStatus.CONNECTED;
    call.started_at = new Date();
    call.callee_audio_enabled = withAudio;
    call.callee_video_enabled = withVideo;

    await call.save();

    // Update cache
    await this.redis.setex(
      `call:${callId}`,
      300,
      JSON.stringify({
        caller_id: String(call.caller_id),
        callee_id: String(call.callee_id),
        status: CallStatus.CONNECTED,
      }),
    );

    this.logger.log(`Call ${callId} accepted successfully`);
    return call;
  }

  async declineCall(calleeId: string, callId: string): Promise<DmCallDocument> {
    this.logger.log(`Declining call ${callId} by ${calleeId}`);

    const call = await this.dmCallModel.findById(callId);
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    if (String(call.callee_id) !== calleeId) {
      throw new ForbiddenException(
        "You can only decline calls directed to you",
      );
    }

    const callerId = String(call.caller_id);

    call.status = CallStatus.DECLINED;
    call.end_reason = CallEndReason.USER_DECLINED;
    call.ended_at = new Date();

    await call.save();

    // Create system message in conversation
    await this.createCallSystemMessage(call, callerId, calleeId);

    // Clean up cache
    await this.redis.del(`call:${callId}`);

    this.logger.log(`Call ${callId} declined successfully`);
    return call;
  }

  async endCall(
    userId: string,
    callId: string,
    reason: string = CallEndReason.USER_HANGUP,
  ): Promise<DmCallDocument> {
    this.logger.log(`Ending call ${callId} by ${userId}`);

    const call = await this.dmCallModel.findById(callId);
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    if (
      String(call.caller_id) !== userId &&
      String(call.callee_id) !== userId
    ) {
      throw new ForbiddenException("You can only end calls you are part of");
    }

    const callerId = String(call.caller_id);
    const calleeId = String(call.callee_id);

    const wasConnected = call.status === CallStatus.CONNECTED;
    call.status = CallStatus.ENDED;
    call.end_reason = reason as CallEndReason;
    call.ended_at = new Date();

    if (wasConnected && call.started_at) {
      call.duration_seconds = Math.floor(
        (call.ended_at.getTime() - call.started_at.getTime()) / 1000,
      );
    }

    await call.save();

    // Create system message in conversation
    await this.createCallSystemMessage(call, callerId, calleeId);

    // Clean up RTC sessions
    await this.rtcSessionModel.updateMany(
      { call_id: call._id, is_active: true },
      { is_active: false, ended_at: new Date() },
    );

    // Clean up cache
    await this.redis.del(`call:${callId}`);

    this.logger.log(`Call ${callId} ended successfully`);
    return call;
  }

  async handleSignalOffer(userId: string, data: SignalOfferDto): Promise<void> {
    const call = await this.dmCallModel.findById(data.call_id);
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    if (
      String(call.caller_id) !== userId &&
      String(call.callee_id) !== userId
    ) {
      throw new ForbiddenException(
        "You can only send signals for calls you are part of",
      );
    }

    // Update or create RTC session
    await this.rtcSessionModel.findOneAndUpdate(
      { call_id: call._id, user_id: new Types.ObjectId(userId) },
      {
        $set: {
          offer: data.offer,
          last_activity: new Date(),
        },
        $setOnInsert: {
          session_id: uuidv4(),
          socket_id: "", // Will be set by gateway
          is_active: true,
        },
      },
      { upsert: true, new: true },
    );

    this.logger.log(
      `Signal offer handled for call ${data.call_id} by user ${userId}`,
    );
  }

  async handleSignalAnswer(
    userId: string,
    data: SignalAnswerDto,
  ): Promise<void> {
    const call = await this.dmCallModel.findById(data.call_id);
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    if (
      String(call.caller_id) !== userId &&
      String(call.callee_id) !== userId
    ) {
      throw new ForbiddenException(
        "You can only send signals for calls you are part of",
      );
    }

    // Update RTC session
    await this.rtcSessionModel.findOneAndUpdate(
      { call_id: call._id, user_id: new Types.ObjectId(userId) },
      {
        $set: {
          answer: data.answer,
          last_activity: new Date(),
        },
      },
    );

    this.logger.log(
      `Signal answer handled for call ${data.call_id} by user ${userId}`,
    );
  }

  async handleIceCandidate(
    userId: string,
    data: IceCandidateDto,
  ): Promise<void> {
    const call = await this.dmCallModel.findById(data.call_id);
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    if (
      String(call.caller_id) !== userId &&
      String(call.callee_id) !== userId
    ) {
      throw new ForbiddenException(
        "You can only send signals for calls you are part of",
      );
    }

    // Add ICE candidate to RTC session
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
        $set: {
          last_activity: new Date(),
        },
      },
    );

    this.logger.log(
      `ICE candidate handled for call ${data.call_id} by user ${userId}`,
    );
  }

  async toggleMedia(
    userId: string,
    callId: string,
    mediaType: "audio" | "video",
    state: MediaState,
  ): Promise<void> {
    const call = await this.dmCallModel.findById(callId);
    if (!call) {
      throw new NotFoundException("Call not found");
    }

    if (
      String(call.caller_id) !== userId &&
      String(call.callee_id) !== userId
    ) {
      throw new ForbiddenException(
        "You can only toggle media for calls you are part of",
      );
    }

    const isCaller = String(call.caller_id) === userId;
    const updateField = isCaller
      ? `caller_${mediaType}_muted`
      : `callee_${mediaType}_muted`;

    await this.dmCallModel.findByIdAndUpdate(callId, {
      $set: { [updateField]: state === MediaState.MUTED },
    });

    this.logger.log(
      `Media ${mediaType} ${state} for call ${callId} by user ${userId}`,
    );
  }

  async handleUserDisconnect(userId: string, callId?: string): Promise<void> {
    if (callId) {
      // End the specific call
      try {
        await this.endCall(userId, callId, CallEndReason.CONNECTION_ERROR);
      } catch (error) {
        this.logger.error(
          `Error ending call ${callId} for user ${userId}:`,
          error,
        );
      }
    } else {
      // End all active calls for the user
      const activeCalls = await this.dmCallModel.find({
        $or: [
          { caller_id: new Types.ObjectId(userId) },
          { callee_id: new Types.ObjectId(userId) },
        ],
        status: { $in: [CallStatus.RINGING, CallStatus.CONNECTED] },
      });

      for (const call of activeCalls) {
        try {
          await this.endCall(
            userId,
            String(call._id),
            CallEndReason.CONNECTION_ERROR,
          );
        } catch (error) {
          this.logger.error(
            `Error ending call ${call._id} for user ${userId}:`,
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

  async getUserProfile(
    userId: string,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<UserProfile> {
    try {
      // Try to get from cache first
      const cacheKey = `user_profile:${userId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      let profile: UserProfile | null = null;

      // If we have session info, try to get from decode API first
      if (sessionId && fingerprintHash) {
        try {
          this.logger.log(
            `Fetching profile for ${userId} from decode API using session ${sessionId}`,
          );
          profile = await this.decodeApiClient.getUserProfile(
            sessionId,
            fingerprintHash,
            userId,
          );

          if (profile) {
            // Cache the profile for future use
            await this.redis.setex(cacheKey, 300, JSON.stringify(profile));
            this.logger.log(
              `Successfully fetched and cached profile for ${userId} from decode API`,
            );
            return profile;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to get profile from decode API for ${userId}:`,
            error,
          );
        }
      }

      // Fallback to database if decode API fails or no session info
      this.logger.log(`Fetching profile for ${userId} from database`);
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

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(profile));

      return profile;
    } catch (error) {
      this.logger.error(`Error getting user profile for ${userId}:`, error);
      throw error;
    }
  }

  private async checkAntiAbuse(
    callerId: string,
    targetUserId: string,
  ): Promise<void> {
    // Check for existing active calls from caller
    const existingCall = await this.dmCallModel.findOne({
      caller_id: new Types.ObjectId(callerId),
      status: { $in: [CallStatus.RINGING, CallStatus.CONNECTED] },
    });

    if (existingCall) {
      throw new BadRequestException(
        "You already have an active call in progress",
      );
    }

    // Check for existing calls to the same target
    const existingCallToTarget = await this.dmCallModel.findOne({
      caller_id: new Types.ObjectId(callerId),
      callee_id: new Types.ObjectId(targetUserId),
      status: { $in: [CallStatus.RINGING, CallStatus.CONNECTED] },
    });

    if (existingCallToTarget) {
      throw new BadRequestException(
        "You already have an active call with this user",
      );
    }

    // Check call frequency (rate limiting)
    const recentCalls = await this.dmCallModel.countDocuments({
      caller_id: new Types.ObjectId(callerId),
      created_at: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
    });

    if (recentCalls >= this.maxConcurrentCalls) {
      throw new BadRequestException(
        "Too many calls in a short period. Please wait before making another call.",
      );
    }
  }

  private async getOrCreateConversation(
    userA: string,
    userB: string,
  ): Promise<DirectConversationDocument> {
    // Try to find existing conversation
    let conversation = await this.conversationModel.findOne({
      $or: [
        { userA: new Types.ObjectId(userA), userB: new Types.ObjectId(userB) },
        { userA: new Types.ObjectId(userB), userB: new Types.ObjectId(userA) },
      ],
    });

    if (!conversation) {
      // Create new conversation
      conversation = new this.conversationModel({
        userA: new Types.ObjectId(userA),
        userB: new Types.ObjectId(userB),
      });
      await conversation.save();
    }

    return conversation;
  }

  /**
   * Create a system message in the conversation about the call
   */
  private async createCallSystemMessage(
    call: DmCallDocument,
    callerId: string,
    _calleeId: string,
  ): Promise<void> {
    try {
      const conversation = await this.conversationModel.findById(
        call.conversation_id,
      );
      if (!conversation) {
        this.logger.warn(
          `Conversation ${call.conversation_id} not found for call ${call._id}`,
        );
        return;
      }

      let messageContent = "";
      const duration = call.duration_seconds || 0;
      const durationText =
        duration > 0 ? this.formatCallDuration(duration) : "";

      // Determine message content based on call status and reason
      if (call.status === CallStatus.DECLINED) {
        messageContent = "Call declined";
      } else if (call.status === CallStatus.ENDED) {
        if (call.end_reason === CallEndReason.TIMEOUT) {
          messageContent = "Missed call";
        } else if (call.end_reason === CallEndReason.USER_HANGUP) {
          if (duration > 0) {
            messageContent = `Video call • ${durationText}`;
          } else {
            messageContent = "Call cancelled";
          }
        } else if (call.end_reason === CallEndReason.CONNECTION_ERROR) {
          messageContent = "Call disconnected";
        } else {
          messageContent = duration > 0 ? `Call • ${durationText}` : "Call";
        }
      }

      if (!messageContent) {
        return;
      }

      // Create system message
      const systemMessage = new this.directMessageModel({
        conversationId: conversation._id,
        senderId: new Types.ObjectId(callerId),
        content: messageContent,
        attachments: [
          {
            type: "call",
            call_id: String(call._id),
            status: call.status,
            duration: duration,
            with_video: call.caller_video_enabled || call.callee_video_enabled,
            end_reason: call.end_reason,
          },
        ],
      });

      await systemMessage.save();

      this.logger.log(
        `Created system message for call ${call._id} in conversation ${conversation._id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error creating system message for call ${call._id}:`,
        error,
      );
    }
  }

  /**
   * Format call duration to human readable string
   */
  private formatCallDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `0:${secs.toString().padStart(2, "0")}`;
    }
  }

  async getCallHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<unknown[]> {
    return this.dmCallModel
      .find({
        $or: [
          { caller_id: new Types.ObjectId(userId) },
          { callee_id: new Types.ObjectId(userId) },
        ],
      })
      .sort({ created_at: -1 })
      .limit(limit)
      .skip(offset)
      .populate("caller_id", "username display_name avatar_ipfs_hash")
      .populate("callee_id", "username display_name avatar_ipfs_hash")
      .lean();
  }

  async getActiveCall(userId: string): Promise<unknown | null> {
    return this.dmCallModel
      .findOne({
        $or: [
          { caller_id: new Types.ObjectId(userId) },
          { callee_id: new Types.ObjectId(userId) },
        ],
        status: { $in: [CallStatus.RINGING, CallStatus.CONNECTED] },
      })
      .populate("caller_id", "username display_name avatar_ipfs_hash")
      .populate("callee_id", "username display_name avatar_ipfs_hash")
      .lean();
  }
}

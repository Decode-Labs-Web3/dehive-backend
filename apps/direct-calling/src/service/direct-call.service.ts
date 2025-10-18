import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ConfigService } from "@nestjs/config";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";

import { DmCall, DmCallDocument } from "../../schemas/dm-call.schema";
import {
  DirectConversation,
  DirectConversationDocument,
} from "../../schemas/direct-conversation.schema";
import {
  DirectMessage,
  DirectMessageDocument,
} from "../../schemas/direct-message.schema";
import {
  UserDehive,
  UserDehiveDocument,
} from "../../../user-dehive-server/schemas/user-dehive.schema";
import { CallStatus, CallEndReason, MediaState } from "../../enum/enum";
import { AuthenticatedUser } from "../../interfaces/authenticated-user.interface";
import { UserDehiveLean } from "../../interfaces/user-dehive-lean.interface";
import {
  StreamInfo,
  StreamConfig,
} from "../../interfaces/stream-info.interface";
import { DecodeApiClient } from "../../clients/decode-api.client";
import { StreamCallService } from "./stream-call.service";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";

@Injectable()
export class DirectCallService {
  private readonly logger = new Logger(DirectCallService.name);
  private readonly authServiceUrl: string;
  private readonly callTimeoutMs = 30000; // 30 seconds
  private readonly maxConcurrentCalls = 3;

  constructor(
    @InjectModel(DmCall.name)
    private readonly dmCallModel: Model<DmCallDocument>,
    @InjectModel(DirectConversation.name)
    private readonly conversationModel: Model<DirectConversationDocument>,
    @InjectModel(DirectMessage.name)
    private readonly directMessageModel: Model<DirectMessageDocument>,
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    private readonly configService: ConfigService,
    private readonly decodeApiClient: DecodeApiClient,
    private readonly streamCallService: StreamCallService,
    @InjectRedis() private readonly redis: Redis,
    @Inject(REQUEST) private readonly request: Request,
  ) {
    // Make environment variables optional for now
    const host =
      this.configService.get<string>("DECODE_API_GATEWAY_HOST") || "localhost";
    const port =
      this.configService.get<number>("DECODE_API_GATEWAY_PORT") || 4006;
    this.authServiceUrl = `http://${host}:${port}`;
  }

  /**
   * Get current user ID from request context
   */
  private getCurrentUserId(): string {
    const user = (this.request as { user?: { _id: string } }).user;
    if (!user || !user._id) {
      throw new BadRequestException(
        "User not authenticated or user ID not found",
      );
    }
    return user._id;
  }

  /**
   * Start call without needing to pass callerId - gets it from context
   */
  async startCallForCurrentUser(
    targetUserId: string,
    withVideo: boolean = true,
    withAudio: boolean = true,
  ): Promise<{ call: DmCallDocument; streamInfo: StreamInfo }> {
    const callerId = this.getCurrentUserId();
    return this.startCall(callerId, targetUserId, withVideo, withAudio);
  }

  async startCall(
    callerId: string,
    targetUserId: string,
    withVideo: boolean = true,
    withAudio: boolean = true,
  ): Promise<{ call: DmCallDocument; streamInfo: StreamInfo }> {
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

    // Create Stream.io call info
    const streamInfo = await this.streamCallService.createCallInfo(
      callerId,
      targetUserId,
      withVideo,
      withAudio,
    );

    // Create call record with Stream.io call ID
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
      metadata: {
        stream_call_id: streamInfo.callId,
        stream_config: streamInfo.streamConfig,
      },
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
        stream_call_id: streamInfo.callId,
      }),
    );

    this.logger.log(
      `Call ${call._id} created successfully with Stream.io call ID: ${streamInfo.callId}`,
    );
    return { call, streamInfo };
  }

  /**
   * Accept call without needing to pass calleeId - gets it from context
   */
  async acceptCallForCurrentUser(
    callId: string,
    withVideo: boolean = true,
    withAudio: boolean = true,
  ): Promise<{ call: DmCallDocument; streamInfo: StreamInfo }> {
    const calleeId = this.getCurrentUserId();
    return this.acceptCall(calleeId, callId, withVideo, withAudio);
  }

  async acceptCall(
    calleeId: string,
    callId: string,
    withVideo: boolean = true,
    withAudio: boolean = true,
  ): Promise<{ call: DmCallDocument; streamInfo: StreamInfo }> {
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

    // Get Stream.io call info
    const streamCallId = call.metadata?.stream_call_id;
    if (!streamCallId) {
      throw new BadRequestException("Stream.io call ID not found");
    }

    // Get Stream.io call info - create fresh tokens for both users
    const callerId = String(call.caller_id);
    const streamInfo = await this.streamCallService.createCallInfo(
      callerId,
      calleeId,
      withVideo,
      withAudio,
    );

    // Update call status and media settings
    call.status = CallStatus.CONNECTED;
    call.started_at = new Date();
    call.callee_audio_enabled = withAudio;
    call.callee_video_enabled = withVideo;

    // Update metadata with fresh stream info
    call.metadata = {
      stream_call_id: streamInfo.callId,
      stream_config: streamInfo.streamConfig,
    };

    await call.save();

    // Update cache
    await this.redis.setex(
      `call:${callId}`,
      300,
      JSON.stringify({
        caller_id: String(call.caller_id),
        callee_id: String(call.callee_id),
        status: CallStatus.CONNECTED,
        stream_call_id: streamInfo.callId,
      }),
    );

    this.logger.log(
      `Call ${callId} accepted successfully with Stream.io call ID: ${streamInfo.callId}`,
    );
    return { call, streamInfo };
  }

  /**
   * Decline call without needing to pass calleeId - gets it from context
   */
  async declineCallForCurrentUser(callId: string): Promise<DmCallDocument> {
    const calleeId = this.getCurrentUserId();
    return this.declineCall(calleeId, callId);
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

  /**
   * End call without needing to pass userId - gets it from context
   */
  async endCallForCurrentUser(
    callId: string,
    reason: string = CallEndReason.USER_HANGUP,
  ): Promise<DmCallDocument> {
    const userId = this.getCurrentUserId();
    return this.endCall(userId, callId, reason);
  }

  /**
   * Toggle media without needing to pass userId - gets it from context
   */
  async toggleMediaForCurrentUser(
    callId: string,
    mediaType: "audio" | "video",
    state: MediaState,
  ): Promise<void> {
    const userId = this.getCurrentUserId();
    return this.toggleMedia(userId, callId, mediaType, state);
  }

  /**
   * Get call history without needing to pass userId - gets it from context
   */
  async getCallHistoryForCurrentUser(
    limit: number = 20,
    offset: number = 0,
  ): Promise<unknown[]> {
    const userId = this.getCurrentUserId();
    return this.getCallHistory(userId, limit, offset);
  }

  /**
   * Get active call without needing to pass userId - gets it from context
   */
  async getActiveCallForCurrentUser(): Promise<unknown | null> {
    const userId = this.getCurrentUserId();
    return this.getActiveCall(userId);
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

    // End Stream.io call
    const streamCallId = call.metadata?.stream_call_id;
    if (streamCallId) {
      try {
        await this.streamCallService.endCall(streamCallId);
      } catch (error) {
        this.logger.error(
          `Error ending Stream.io call ${streamCallId}:`,
          error,
        );
      }
    }

    // Clean up cache
    await this.redis.del(`call:${callId}`);

    this.logger.log(`Call ${callId} ended successfully`);
    return call;
  }

  // WebRTC signaling methods removed - Stream.io handles this automatically

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

    // Stream.io will handle cleanup automatically
    this.logger.log(
      `User ${userId} disconnected, Stream.io will handle cleanup`,
    );
  }

  // TURN server methods removed - Stream.io handles NAT traversal automatically

  /**
   * Get Stream.io configuration for frontend
   */
  async getStreamConfig(): Promise<StreamConfig> {
    return this.streamCallService.getStreamConfig();
  }

  /**
   * Create user token for Stream.io authentication
   */
  async createUserToken(userId: string): Promise<string> {
    return this.streamCallService.createUserToken(userId);
  }

  /**
   * Generate Stream.io Call ID for stream token
   */
  generateStreamCallId(): string {
    return this.streamCallService.generateStreamCallId();
  }

  async getUserProfile(
    userId: string,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<AuthenticatedUser> {
    try {
      // Try to get from cache first
      const cacheKey = `user_profile:${userId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      let profile: AuthenticatedUser | null = null;

      if (sessionId && fingerprintHash) {
        try {
          this.logger.log(
            `Fetching profile for ${userId} from decode API using session ${sessionId}`,
          );
          const userProfile = await this.decodeApiClient.getUserProfile(
            sessionId,
            fingerprintHash,
            userId,
          );

          if (userProfile) {
            // Convert UserProfile to AuthenticatedUser
            profile = {
              ...userProfile,
              session_id: sessionId,
              fingerprint_hash: fingerprintHash,
            };
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
        session_id: sessionId || "",
        fingerprint_hash: fingerprintHash || "",
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

  /**
   * Get all active calls (ringing or connected)
   */
  async getActiveCalls(): Promise<
    {
      call_id: string;
      status: string;
      caller_id: unknown;
      callee_id: unknown;
      created_at: Date;
      started_at?: Date;
    }[]
  > {
    this.logger.log("Getting all active calls");

    try {
      const calls = await this.dmCallModel
        .find({
          status: { $in: ["ringing", "connected"] },
        })
        .select("_id status caller_id callee_id createdAt started_at")
        .populate("caller_id", "username display_name avatar_ipfs_hash")
        .populate("callee_id", "username display_name avatar_ipfs_hash")
        .lean();

      // Transform data to match expected format
      return calls.map((call) => ({
        call_id: String(call._id),
        status: call.status,
        caller_id: call.caller_id,
        callee_id: call.callee_id,
        created_at:
          ((call as Record<string, unknown>).createdAt as Date) || new Date(),
        started_at: (call as Record<string, unknown>).started_at as Date,
      }));
    } catch (error) {
      this.logger.error("Error getting active calls:", error);
      throw error;
    }
  }
}

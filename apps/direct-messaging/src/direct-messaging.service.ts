import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  DirectConversation,
  DirectConversationDocument,
} from "../schemas/direct-conversation.schema";
import {
  DirectMessage,
  DirectMessageDocument,
} from "../schemas/direct-message.schema";
import { CreateOrGetConversationDto } from "../dto/create-or-get-conversation.dto.ts";
import {
  DirectUploadInitDto,
  DirectUploadResponseDto,
} from "../dto/direct-upload.dto";
import { ListDirectMessagesDto } from "../dto/list-direct-messages.dto";
import { SendDirectMessageDto } from "../dto/send-direct-message.dto";
import {
  DirectUpload,
  DirectUploadDocument,
} from "../schemas/direct-upload.schema";
import { AttachmentType } from "../enum/enum";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import * as childProcess from "child_process";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import { ConfigService } from "@nestjs/config";
import { ListDirectUploadsDto } from "../dto/list-direct-upload.dto";
import { DecodeApiClient } from "../clients/decode-api.client";
import { GetFollowingDto } from "../dto/get-following.dto";
import { GetFollowingMessagesDto } from "../dto/get-following-messages.dto";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";
import { SessionCacheDoc } from "../interfaces/session-doc.interface";
import { UserProfile } from "../interfaces/user-profile.interface";
import {
  FollowingMessageUser,
  FollowingMessagesResponse,
} from "../interfaces/following-message.interface";
import { ConversationUpdateEvent } from "../interfaces/following-message-event.interface";
import {
  ConversationUser,
  ConversationUsersResponse,
} from "../interfaces/conversation-user.interface";
import { GetConversationUsersDto } from "../dto/get-conversation-users.dto";

@Injectable()
export class DirectMessagingService {
  private readonly logger = new Logger(DirectMessagingService.name);

  constructor(
    @InjectModel(DirectConversation.name)
    private readonly conversationModel: Model<DirectConversationDocument>,
    @InjectModel(DirectMessage.name)
    private readonly messageModel: Model<DirectMessageDocument>,
    @InjectModel(DirectUpload.name)
    private readonly directuploadModel: Model<DirectUploadDocument>,
    private readonly configService: ConfigService,
    private readonly decodeApiClient: DecodeApiClient,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Get user status from Redis cache (set by user-status service)
   */
  private async getUserStatusFromRedis(
    userId: string,
  ): Promise<"online" | "offline"> {
    try {
      const statusKey = `user:status:${userId}`;
      const statusData = await this.redis.get(statusKey);

      if (!statusData) {
        return "offline"; // No cache = offline
      }

      const parsed = JSON.parse(statusData);
      return parsed.status === "online" ? "online" : "offline";
    } catch (error) {
      this.logger.warn(
        `Failed to get status from Redis for user ${userId}: ${error.message}`,
      );
      return "offline"; // Default to offline on error
    }
  }

  /**
   * Get batch user status from Redis
   */
  private async getBatchUserStatusFromRedis(
    userIds: string[],
  ): Promise<Map<string, "online" | "offline">> {
    const statusMap = new Map<string, "online" | "offline">();

    try {
      // Use pipeline for better performance
      const pipeline = this.redis.pipeline();
      userIds.forEach((userId) => {
        pipeline.get(`user:status:${userId}`);
      });

      const results = await pipeline.exec();

      if (!results) {
        // If pipeline fails, set all to offline
        userIds.forEach((userId) => statusMap.set(userId, "offline"));
        return statusMap;
      }

      results.forEach((result, index) => {
        const userId = userIds[index];
        if (result && result[1]) {
          try {
            const parsed = JSON.parse(result[1] as string);
            statusMap.set(
              userId,
              parsed.status === "online" ? "online" : "offline",
            );
          } catch {
            statusMap.set(userId, "offline");
          }
        } else {
          statusMap.set(userId, "offline");
        }
      });
    } catch (error) {
      this.logger.warn(
        `Failed to get batch status from Redis: ${error.message}`,
      );
      // Set all to offline on error
      userIds.forEach((userId) => statusMap.set(userId, "offline"));
    }

    return statusMap;
  }

  private detectAttachmentType(mime: string): AttachmentType {
    if (mime.startsWith("image/")) return AttachmentType.IMAGE;
    if (mime.startsWith("video/")) return AttachmentType.VIDEO;
    if (mime.startsWith("audio/")) return AttachmentType.AUDIO;
    return AttachmentType.FILE;
  }

  private getLimits() {
    const toBytes = (mb: string, def: number) =>
      (parseInt(mb || "", 10) || def) * 1024 * 1024;
    return {
      image: toBytes(
        this.configService.get<string>("MAX_IMAGE_MB") ?? "10",
        10,
      ),
      video: toBytes(
        this.configService.get<string>("MAX_VIDEO_MB") ?? "100",
        100,
      ),
      file: toBytes(this.configService.get<string>("MAX_FILE_MB") ?? "25", 25),
    };
  }

  private validateUploadSize(mime: string, size: number) {
    const type = this.detectAttachmentType(mime);
    const limits = this.getLimits();
    if (type === AttachmentType.IMAGE && size > limits.image)
      throw new BadRequestException(
        `Image exceeds size limit (${limits.image / 1024 / 1024}MB)`,
      );
    if (type === AttachmentType.VIDEO && size > limits.video)
      throw new BadRequestException(
        `Video exceeds size limit (${limits.video / 1024 / 1024}MB)`,
      );
    if (
      type !== AttachmentType.IMAGE &&
      type !== AttachmentType.VIDEO &&
      size > limits.file
    )
      throw new BadRequestException(
        `File exceeds size limit (${limits.file / 1024 / 1024}MB)`,
      );
  }

  async createOrGetConversation(
    selfId: string,
    dto: CreateOrGetConversationDto,
  ) {
    if (
      !Types.ObjectId.isValid(selfId) ||
      !Types.ObjectId.isValid(dto.otherUserDehiveId)
    ) {
      throw new BadRequestException("Invalid participant id");
    }
    const existing = await this.conversationModel.findOne({
      $or: [
        {
          userA: new Types.ObjectId(selfId),
          userB: new Types.ObjectId(dto.otherUserDehiveId),
        },
        {
          userA: new Types.ObjectId(dto.otherUserDehiveId),
          userB: new Types.ObjectId(selfId),
        },
      ],
    });
    if (existing) return existing;

    const doc = await this.conversationModel.create({
      userA: new Types.ObjectId(selfId),
      userB: new Types.ObjectId(dto.otherUserDehiveId),
    });
    return doc;
  }

  async handleUpload(
    selfId: string,
    file: unknown,
    body: DirectUploadInitDto,
  ): Promise<DirectUploadResponseDto> {
    if (!file || typeof file !== "object") {
      throw new BadRequestException("File is required");
    }
    type UploadedFileLike = {
      mimetype?: string;
      size?: number;
      originalname?: string;
      buffer?: Buffer;
    };
    const uploaded = file as UploadedFileLike;

    if (!selfId || !Types.ObjectId.isValid(selfId)) {
      throw new BadRequestException("Invalid or missing user_dehive_id");
    }
    if (!body.conversationId || !Types.ObjectId.isValid(body.conversationId)) {
      throw new BadRequestException("Invalid conversationId");
    }

    const conv = await this.conversationModel
      .findById(body.conversationId)
      .lean();
    if (!conv) {
      throw new NotFoundException("Conversation not found");
    }
    const isParticipant = [
      conv.userA.toString(),
      conv.userB.toString(),
    ].includes(selfId);
    if (!isParticipant) {
      throw new BadRequestException(
        "You are not a participant of this conversation",
      );
    }

    const mime = uploaded.mimetype || "application/octet-stream";
    const size = uploaded.size ?? 0;
    this.validateUploadSize(mime, size);

    const storage = (
      this.configService.get<string>("STORAGE") || "local"
    ).toLowerCase();
    const port =
      this.configService.get<number>("DIRECT_MESSAGING_PORT") || 4004;
    const cdnBase =
      this.configService.get<string>("CDN_BASE_URL_DM") ||
      `http://localhost:${port}/uploads`;

    let fileUrl = "";
    const originalName = uploaded.originalname || "upload.bin";
    const ext = path.extname(originalName) || "";
    const safeName = `${randomUUID()}${ext}`;
    const uploadDir = path.resolve(process.cwd(), "uploads");

    if (storage === "local") {
      if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });
      const dest = path.join(uploadDir, safeName);
      const buffer: Buffer = Buffer.isBuffer(uploaded.buffer)
        ? uploaded.buffer
        : Buffer.from("");
      fs.writeFileSync(dest, buffer);
      fileUrl = `${cdnBase.replace(/\/$/, "")}/${safeName}`;
    } else {
      throw new BadRequestException("S3/MinIO storage is not implemented yet");
    }

    const type = this.detectAttachmentType(mime);
    let width: number | undefined,
      height: number | undefined,
      durationMs: number | undefined,
      thumbnailUrl: string | undefined;

    try {
      if (type === AttachmentType.IMAGE) {
        const metadata = await sharp(uploaded.buffer).metadata();
        width = metadata.width;
        height = metadata.height;
      } else if (
        type === AttachmentType.VIDEO ||
        type === AttachmentType.AUDIO
      ) {
        const tmpFilePath = path.join(uploadDir, safeName);
        const probeBin =
          (typeof ffprobePath === "object" && "path" in ffprobePath
            ? (ffprobePath as { path: string }).path
            : undefined) || "ffprobe";
        const probe = childProcess.spawnSync(
          probeBin,
          [
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            tmpFilePath,
          ],
          { encoding: "utf-8" },
        );

        if (probe.status === 0 && probe.stdout) {
          const info: {
            streams?: Array<{
              codec_type?: string;
              width?: number;
              height?: number;
              duration?: string;
            }>;
            format?: {
              duration?: string;
            };
          } = JSON.parse(probe.stdout);

          const videoStream = Array.isArray(info.streams)
            ? info.streams.find((s) => s && s.codec_type === "video")
            : undefined;

          if (videoStream) {
            width =
              typeof videoStream.width === "number"
                ? videoStream.width
                : undefined;
            height =
              typeof videoStream.height === "number"
                ? videoStream.height
                : undefined;
          }

          let dur: number | undefined;
          if (
            videoStream?.duration &&
            !Number.isNaN(Number(videoStream.duration))
          ) {
            dur = parseFloat(videoStream.duration);
          } else if (
            info.format?.duration &&
            !Number.isNaN(Number(info.format.duration))
          ) {
            dur = parseFloat(info.format.duration);
          }
          if (typeof dur === "number" && !Number.isNaN(dur))
            durationMs = Math.round(dur * 1000);

          if (type === AttachmentType.VIDEO) {
            const thumbName = `${path.parse(safeName).name}_thumb.jpg`;
            const thumbPath = path.join(uploadDir, thumbName);
            const ffmpegBin = ffmpegPath || "ffmpeg";
            const ffmpeg = childProcess.spawnSync(
              ffmpegBin,
              [
                "-i",
                tmpFilePath,
                "-ss",
                "00:00:00.000",
                "-vframes",
                "1",
                "-vf",
                "scale=640:-1",
                thumbPath,
                "-y",
              ],
              { encoding: "utf-8" },
            );
            if (ffmpeg.status === 0) {
              thumbnailUrl = `${cdnBase.replace(/\/$/, "")}/${thumbName}`;
            }
          }
        }
      }
    } catch (err) {
      console.error(
        `[DirectMessaging] Failed to process media metadata for ${safeName}:`,
        err,
      );
    }

    const doc = await this.directuploadModel.create({
      ownerId: new Types.ObjectId(selfId),
      conversationId: new Types.ObjectId(body.conversationId),
      type,
      url: fileUrl,
      name: originalName,
      size,
      mimeType: mime,
      width,
      height,
      durationMs,
      thumbnailUrl,
    });

    return {
      uploadId: (doc._id as Types.ObjectId).toString(),
      type: doc.type as AttachmentType,
      url: doc.url,
      name: doc.name,
      size: doc.size,
      mimeType: doc.mimeType,
      width: doc.width,
      height: doc.height,
      durationMs: doc.durationMs,
      thumbnailUrl: doc.thumbnailUrl,
    };
  }

  async sendMessage(selfId: string, dto: SendDirectMessageDto) {
    if (!Types.ObjectId.isValid(selfId)) {
      throw new BadRequestException("Invalid sender id");
    }
    if (!Types.ObjectId.isValid(dto.conversationId)) {
      throw new BadRequestException("Invalid conversation id");
    }
    const conv = await this.conversationModel
      .findById(dto.conversationId)
      .lean();
    if (!conv) throw new NotFoundException("Conversation not found");
    const isParticipant = [conv.userA, conv.userB]
      .map((x) => String(x))
      .includes(selfId);
    if (!isParticipant) throw new BadRequestException("Not a participant");

    let attachments: Array<{
      type: AttachmentType;
      url: string;
      name: string;
      size: number;
      mimeType: string;
      width?: number;
      height?: number;
      durationMs?: number;
      thumbnailUrl?: string;
    }> = [];
    if (Array.isArray(dto.uploadIds) && dto.uploadIds.length > 0) {
      const ids = dto.uploadIds.map((id) => new Types.ObjectId(id));
      const uploads = await this.directuploadModel
        .find({ _id: { $in: ids }, ownerId: new Types.ObjectId(selfId) })
        .lean();
      if (uploads.length !== ids.length) {
        throw new BadRequestException("You can only attach your own uploads");
      }
      attachments = uploads.map((u) => ({
        type: u.type as unknown as AttachmentType,
        url: u.url,
        name: u.name,
        size: u.size,
        mimeType: u.mimeType,
        width: u.width,
        height: u.height,
        durationMs: u.durationMs,
        thumbnailUrl: u.thumbnailUrl,
      }));
    }

    // Validate replyTo if provided
    let replyToMessageId: Types.ObjectId | undefined;
    if (dto.replyTo) {
      if (!Types.ObjectId.isValid(dto.replyTo)) {
        throw new BadRequestException("Invalid replyTo message id");
      }

      // Check if the message being replied to exists and is in the same conversation
      const replyToMessage = await this.messageModel
        .findById(dto.replyTo)
        .lean();
      if (!replyToMessage) {
        throw new NotFoundException("Message being replied to not found");
      }

      if (String(replyToMessage.conversationId) !== dto.conversationId) {
        throw new BadRequestException(
          "Cannot reply to a message from a different conversation",
        );
      }

      replyToMessageId = new Types.ObjectId(dto.replyTo);
    }

    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(dto.conversationId),
      senderId: new Types.ObjectId(selfId),
      content: dto.content,
      attachments,
      replyTo: replyToMessageId || null,
    });

    // Populate the replyTo field to match the format returned by listMessages
    const populatedMessage = await this.messageModel
      .findById(message._id)
      .populate("replyTo", "content senderId createdAt")
      .lean();

    // Ensure replyTo field is properly formatted (null if no reply)
    const formattedMessage = {
      ...populatedMessage,
      replyTo: populatedMessage?.replyTo || null,
    };

    return formattedMessage;
  }

  async listMessages(
    selfId: string,
    conversationId: string,
    dto: ListDirectMessagesDto,
    sessionId?: string,
    fingerprintHash?: string,
  ) {
    if (!Types.ObjectId.isValid(selfId))
      throw new BadRequestException("Invalid self id");
    if (!Types.ObjectId.isValid(conversationId))
      throw new BadRequestException("Invalid conversation id");

    const conv = await this.conversationModel.findById(conversationId).lean();
    if (!conv) throw new NotFoundException("Conversation not found");
    const isParticipant = [conv.userA, conv.userB]
      .map((x) => String(x))
      .includes(selfId);
    if (!isParticipant) throw new BadRequestException("Not a participant");

    const page = dto.page || 0;
    const limit = dto.limit || 10;
    const skip = page * limit;
    const [items, total] = await Promise.all([
      this.messageModel
        .find({ conversationId: new Types.ObjectId(conversationId) })
        .populate("replyTo", "content senderId createdAt")
        // ensure deterministic ordering when createdAt is identical
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.messageModel.countDocuments({
        conversationId: new Types.ObjectId(conversationId),
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Format messages with sender information and avatar
    const formattedItems = await Promise.all(
      items.map(async (item) => {
        // Get user profile for sender - use decode API if session ID is available
        this.logger.log(
          `Getting profile for sender ${item.senderId}, sessionId: ${sessionId}, fingerprintHash: ${fingerprintHash}`,
        );
        let userProfile;
        if (sessionId && fingerprintHash) {
          userProfile = await this.getUserProfileFromDecode(
            String(item.senderId),
            sessionId,
            fingerprintHash,
          );
          if (!userProfile) {
            this.logger.warn(
              `Failed to get profile from decode API for ${item.senderId}, using fallback`,
            );
            userProfile = await this.getUserProfile(String(item.senderId));
          }
        } else {
          userProfile = await this.getUserProfile(String(item.senderId));
        }

        return {
          _id: item._id,
          conversationId: item.conversationId,
          sender: {
            dehive_id: item.senderId,
            username: userProfile.username || `User_${String(item.senderId)}`,
            display_name:
              userProfile.display_name || `User_${String(item.senderId)}`,
            avatar_ipfs_hash: userProfile.avatar_ipfs_hash || null,
          },
          content: item.content,
          attachments: item.attachments || [],
          isEdited: item.isEdited || false,
          isDeleted: item.isDeleted || false,
          replyTo: item.replyTo || null,
          createdAt: (item as { createdAt?: Date }).createdAt,
          updatedAt: (item as { updatedAt?: Date }).updatedAt,
          __v: item.__v,
        };
      }),
    );

    return {
      items: formattedItems,
      metadata: {
        page,
        limit,
        total: items.length,
        totalPages,
        hasNextPage: page < totalPages - 1,
        hasPrevPage: page > 0,
      },
    };
  }

  async editMessage(selfId: string, messageId: string, content: string) {
    if (!Types.ObjectId.isValid(selfId))
      throw new BadRequestException("Invalid self id");
    if (!Types.ObjectId.isValid(messageId))
      throw new BadRequestException("Invalid message id");
    if (typeof content !== "string")
      throw new BadRequestException("Content must be a string");

    const message = await this.messageModel.findById(messageId);
    if (!message) throw new NotFoundException("Message not found");
    if (String(message.senderId) !== selfId)
      throw new BadRequestException("You can only edit your own message");
    if (message.isDeleted)
      throw new BadRequestException("Cannot edit a deleted message");

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();
    return message.toJSON();
  }

  async deleteMessage(selfId: string, messageId: string) {
    if (!Types.ObjectId.isValid(selfId))
      throw new BadRequestException("Invalid self id");
    if (!Types.ObjectId.isValid(messageId))
      throw new BadRequestException("Invalid message id");

    const message = await this.messageModel.findById(messageId);
    if (!message) throw new NotFoundException("Message not found");
    if (String(message.senderId) !== selfId)
      throw new BadRequestException("You can only delete your own message");
    if (message.isDeleted) return message.toJSON();

    message.isDeleted = true;
    message.content = "[deleted]";
    (message as unknown as { attachments?: unknown[] }).attachments = [];
    await message.save();
    return message.toJSON();
  }

  async listUploads(selfId: string, dto: ListDirectUploadsDto) {
    if (!selfId || !Types.ObjectId.isValid(selfId)) {
      throw new BadRequestException("Invalid user id");
    }

    const page = dto.page >= 0 ? dto.page : 0;
    const limit = dto.limit > 0 ? Math.min(dto.limit, 100) : 10;
    const skip = page * limit;

    const query: Record<string, unknown> = {
      ownerId: new Types.ObjectId(selfId),
    };
    if (dto.type) {
      query.type = dto.type;
    }

    const [items, total] = await Promise.all([
      this.directuploadModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.directuploadModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);
    const isLastPage = page >= totalPages - 1;

    return {
      items,
      metadata: {
        page,
        limit,
        total: items.length,
        is_last_page: isLastPage,
      },
    };
  }

  async getFollowing(currentUser: AuthenticatedUser, dto: GetFollowingDto) {
    const page = dto.page || 0;
    const limit = dto.limit || 10;

    const sessionId = currentUser.session_id;
    if (!sessionId) {
      throw new UnauthorizedException("Session ID not found in user session.");
    }
    const sessionKey = `session:${sessionId}`;
    const sessionDataRaw = await this.redis.get(sessionKey);
    if (!sessionDataRaw) {
      throw new UnauthorizedException("Session not found in cache.");
    }

    const sessionData: SessionCacheDoc = JSON.parse(sessionDataRaw);
    const accessToken = sessionData.access_token;
    const fingerprintHash = currentUser.fingerprint_hash;

    if (!accessToken) {
      throw new UnauthorizedException(
        "Access token not found in user session.",
      );
    }

    if (!fingerprintHash) {
      throw new UnauthorizedException(
        "Fingerprint hash not found in user session.",
      );
    }

    const result = await this.decodeApiClient.getFollowing(
      accessToken,
      fingerprintHash,
      page,
      limit,
    );

    if (!result || !result.success) {
      throw new NotFoundException(
        "Could not retrieve following list from Decode service",
      );
    }

    const items = result.data?.users || [];
    const metadata = result.data?.meta;

    return {
      success: true,
      statusCode: 200,
      message: "OK",
      data: {
        items,
        metadata: metadata || {
          page,
          limit,
          total: items.length,
          is_last_page: true,
        },
      },
    };
  }

  async getFollowingWithMessages(
    currentUser: AuthenticatedUser,
    dto: GetFollowingMessagesDto,
  ): Promise<FollowingMessagesResponse> {
    const page = dto.page || 0;
    const limit = dto.limit || 10;

    const sessionId = currentUser.session_id;
    if (!sessionId) {
      throw new UnauthorizedException("Session ID not found in user session.");
    }
    const sessionKey = `session:${sessionId}`;
    const sessionDataRaw = await this.redis.get(sessionKey);
    if (!sessionDataRaw) {
      throw new UnauthorizedException("Session not found in cache.");
    }

    const sessionData: SessionCacheDoc = JSON.parse(sessionDataRaw);
    const accessToken = sessionData.access_token;
    const fingerprintHash = currentUser.fingerprint_hash;

    if (!accessToken) {
      throw new UnauthorizedException(
        "Access token not found in user session.",
      );
    }

    if (!fingerprintHash) {
      throw new UnauthorizedException(
        "Fingerprint hash not found in user session.",
      );
    }

    // Get following users from decode API
    const followingResult = await this.decodeApiClient.getFollowing(
      accessToken,
      fingerprintHash,
      0, // Get all following users first
      1000, // Large limit to get all
    );

    if (!followingResult || !followingResult.success) {
      throw new NotFoundException(
        "Could not retrieve following list from Decode service",
      );
    }

    const followingUsers = followingResult.data?.users || [];
    const currentUserId = currentUser._id;

    // Get conversations for current user
    const conversations = await this.conversationModel
      .find({
        $or: [
          { userA: new Types.ObjectId(currentUserId) },
          { userB: new Types.ObjectId(currentUserId) },
        ],
      })
      .lean();

    // Create a map of other user ID to conversation ID
    const userToConversationMap = new Map<string, string>();
    conversations.forEach((conv) => {
      const otherUserId =
        conv.userA.toString() === currentUserId
          ? conv.userB.toString()
          : conv.userA.toString();
      userToConversationMap.set(otherUserId, conv._id.toString());
    });

    // Get last message for each conversation
    const conversationIds = conversations.map((conv) => conv._id);
    const lastMessages = await this.messageModel.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$$ROOT" },
          lastMessageAt: { $first: "$createdAt" },
        },
      },
    ]);

    // Create a map of conversation ID to last message info
    const conversationToLastMessageMap = new Map<
      string,
      { lastMessage: unknown; lastMessageAt: Date }
    >();
    lastMessages.forEach((item) => {
      conversationToLastMessageMap.set(item._id.toString(), {
        lastMessage: item.lastMessage,
        lastMessageAt: item.lastMessageAt,
      });
    });

    // Debug logging
    this.logger.log(`Current user ID: ${currentUserId}`);
    this.logger.log(`Found ${conversations.length} conversations`);
    this.logger.log(`Found ${followingUsers.length} following users`);

    // Log conversation mappings for debugging
    userToConversationMap.forEach((convId, userId) => {
      this.logger.log(`User ${userId} -> Conversation ${convId}`);
    });

    // Get user IDs to check status
    const userIdsToCheck = followingUsers.map((user) => user.user_id);

    // Get status for all users from Redis cache
    const userStatusMap =
      await this.getBatchUserStatusFromRedis(userIdsToCheck);
    this.logger.log(
      `Retrieved status for ${userStatusMap.size} users from Redis`,
    );

    // Process following users and add conversation info
    const followingWithMessages: FollowingMessageUser[] = [];

    for (const user of followingUsers) {
      // Use user_id from Decode API response
      const userId = user.user_id;
      const conversationId = userToConversationMap.get(userId);

      let lastMessageAt: Date | undefined;
      const status: "online" | "offline" =
        userStatusMap.get(userId) || "offline";
      const isCall = false;

      if (conversationId) {
        const lastMessageInfo =
          conversationToLastMessageMap.get(conversationId);
        if (lastMessageInfo) {
          lastMessageAt = lastMessageInfo.lastMessageAt;
        }
      }

      followingWithMessages.push({
        id: userId, // This will be user_id from Decode API
        conversationid: conversationId || "",
        displayname: user.display_name || user.username || `User_${userId}`,
        username: user.username || `User_${userId}`,
        avatar_ipfs_hash: user.avatar_ipfs_hash || undefined,
        status,
        isCall,
        lastMessageAt,
      });
    }

    // Sort by last message time (most recent first), then by username
    followingWithMessages.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
      }
      if (a.lastMessageAt && !b.lastMessageAt) return -1;
      if (!a.lastMessageAt && b.lastMessageAt) return 1;
      return a.username.localeCompare(b.username);
    });

    // Apply pagination
    const skip = page * limit;
    const paginatedItems = followingWithMessages.slice(skip, skip + limit);
    const totalItemsOnPage = paginatedItems.length;
    const totalAllFollowing = followingWithMessages.length;
    const totalPages = Math.ceil(totalAllFollowing / limit);
    const isLastPage = page >= totalPages - 1;

    return {
      success: true,
      statusCode: 200,
      message: "OK",
      data: {
        items: paginatedItems,
        metadata: {
          page,
          limit,
          total: totalItemsOnPage,
          is_last_page: isLastPage,
        },
      },
    };
  }

  /**
   * Cache user profile in Redis
   * This should be called when user authenticates or profile is updated
   */
  async cacheUserProfile(
    userDehiveId: string,
    profile: Partial<UserProfile>,
  ): Promise<void> {
    try {
      const cacheKey = `user_profile:${userDehiveId}`;
      const cacheData = {
        _id: userDehiveId,
        username: profile.username || `User_${userDehiveId}`,
        display_name: profile.display_name || `User_${userDehiveId}`,
        avatar_ipfs_hash: profile.avatar_ipfs_hash || undefined,
        bio: profile.bio || null,
        is_verified:
          (profile as { is_verified?: boolean }).is_verified || false,
      };

      // Cache for 1 hour (3600 seconds)
      await this.redis.setex(cacheKey, 3600, JSON.stringify(cacheData));
      this.logger.log(`Cached user profile for ${userDehiveId}`);
    } catch (error) {
      this.logger.error(
        `Error caching user profile for ${userDehiveId}:`,
        error,
      );
    }
  }

  async getUserProfile(userDehiveId: string): Promise<Partial<UserProfile>> {
    try {
      // First check cache for any previously fetched profile
      const cacheKey = `user_profile:${userDehiveId}`;
      const cachedData = await this.redis.get(cacheKey);

      if (cachedData) {
        const profile = JSON.parse(cachedData);
        this.logger.log(
          `Retrieved cached profile for ${userDehiveId} in WebSocket`,
        );
        return profile;
      }

      this.logger.log(
        `No cached profile found for ${userDehiveId}, using fallback in WebSocket`,
      );
      return {
        _id: userDehiveId,
        username: `User_${userDehiveId}`,
        display_name: `User_${userDehiveId}`,
        avatar_ipfs_hash: undefined,
      };
    } catch (error) {
      this.logger.error(
        `Error getting user profile for ${userDehiveId}:`,
        error,
      );
      return {
        _id: userDehiveId,
        username: `User_${userDehiveId}`,
        display_name: `User_${userDehiveId}`,
        avatar_ipfs_hash: undefined,
      };
    }
  }

  /**
   * Get user profile from decode API with session ID
   * This method should be called when we have session ID (e.g., from HTTP requests)
   */
  async getUserProfileFromDecode(
    userDehiveId: string,
    sessionId: string,
    fingerprintHash: string,
  ): Promise<Partial<UserProfile> | null> {
    try {
      // Try to get from decode API using session ID (no cache check)
      this.logger.log(
        `Fetching profile for ${userDehiveId} from decode API using session ${sessionId}`,
      );
      const profile = await this.decodeApiClient.getUserProfile(
        sessionId,
        fingerprintHash,
        userDehiveId,
      );

      if (profile) {
        // Cache the profile for future use
        await this.cacheUserProfile(userDehiveId, profile);
        this.logger.log(
          `Successfully fetched and cached profile for ${userDehiveId}:`,
          profile,
        );
        return profile;
      }

      // If decode API fails, return null to force fallback in calling method
      this.logger.warn(
        `Failed to get profile from decode API for ${userDehiveId}`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Error getting user profile from decode API for ${userDehiveId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Emit conversation update to both users in the conversation
   * This updates the conversation list with status and last message time
   */
  async emitConversationUpdate(
    senderId: string,
    receiverId: string,
    conversationId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Starting conversation update for sender ${senderId} and receiver ${receiverId}`,
      );

      // Get the conversation
      const conversation = await this.conversationModel
        .findById(conversationId)
        .lean();

      if (!conversation) {
        this.logger.warn(`Conversation ${conversationId} not found`);
        return;
      }

      // Get last message timestamp
      const lastMessage = await this.messageModel
        .findOne({ conversationId: new Types.ObjectId(conversationId) })
        .sort({ createdAt: -1 })
        .lean();

      // Calculate status (message sent within last 5 minutes = "online", otherwise "offline")
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const lastMessageDate = lastMessage
        ? new Date((lastMessage as unknown as { createdAt: Date }).createdAt)
        : new Date();
      const status: "online" | "offline" =
        lastMessageDate > fiveMinutesAgo ? "online" : "offline";

      // Create simplified event data
      const conversationUpdate: ConversationUpdateEvent = {
        type: "conversation_update",
        data: {
          conversationId: String(conversation._id),
          status,
          isCall: false, // This is always false for direct messages
          lastMessageAt: lastMessageDate.toISOString(),
        },
      };

      // Emit to specific users (no subscription needed)
      const server = (this as { wsServer?: unknown }).wsServer;
      if (server && typeof server === "object" && server !== null) {
        const wsServer = server as {
          to: (room: string) => {
            emit: (event: string, data: unknown) => void;
          };
        };

        this.logger.log(
          `Emitting conversation_update to sender ${senderId} and receiver ${receiverId}:`,
          conversationUpdate,
        );

        // Production: emit the object payload (default behavior for frontend)
        wsServer
          .to(`user:${senderId}`)
          .emit("conversation_update", conversationUpdate);
        wsServer
          .to(`user:${receiverId}`)
          .emit("conversation_update", conversationUpdate);

        // Debugging (Insomnia): emit pretty JSON string to inspect (commented)
        // const jsonUpdate = JSON.stringify(conversationUpdate, null, 2);
        // wsServer
        //   .to(`user:${senderId}`)
        //   .emit("conversation_update", jsonUpdate);
        // wsServer
        //   .to(`user:${receiverId}`)
        //   .emit("conversation_update", jsonUpdate);

        this.logger.log(
          `Emitted conversation updates to sender ${senderId} and receiver ${receiverId}`,
        );
      } else {
        this.logger.warn(
          "WebSocket server not available for conversation updates",
        );
      }
    } catch (error) {
      this.logger.error(`Error emitting conversation update: ${error.message}`);
    }
  }

  /**
   * Set WebSocket server reference for emitting events
   * This will be called by the gateway during initialization
   */
  setWebSocketServer(server: unknown): void {
    (this as { wsServer?: unknown }).wsServer = server;
  }

  /**
   * Get users in a conversation
   */
  async getConversationUsers(
    currentUser: AuthenticatedUser,
    dto: GetConversationUsersDto,
  ): Promise<ConversationUsersResponse> {
    const { conversationId } = dto;

    // Validate conversation ID
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException("Invalid conversation ID");
    }

    // Get conversation
    const conversation = await this.conversationModel
      .findById(conversationId)
      .lean();

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    // Check if current user is a participant
    const currentUserId = currentUser._id;
    const isParticipant = [
      conversation.userA.toString(),
      conversation.userB.toString(),
    ].includes(currentUserId);

    if (!isParticipant) {
      throw new BadRequestException(
        "You are not a participant of this conversation",
      );
    }

    // Get the other user (not current user)
    const otherUserId =
      conversation.userA.toString() === currentUserId
        ? conversation.userB.toString()
        : conversation.userA.toString();

    // Get user profile for the other user only
    const sessionId = currentUser.session_id;
    const fingerprintHash = currentUser.fingerprint_hash;

    const otherUserProfile = await this.getUserProfileWithDecode(
      otherUserId,
      sessionId,
      fingerprintHash,
    );

    // Get user status from Redis cache (set by user-status service)
    const userStatus = await this.getUserStatusFromRedis(otherUserId);

    // Return only the other user's information
    const otherUser: ConversationUser = {
      id: otherUserId,
      displayname: otherUserProfile.display_name || `User_${otherUserId}`,
      username: otherUserProfile.username || `User_${otherUserId}`,
      avatar_ipfs_hash: otherUserProfile.avatar_ipfs_hash || undefined,
      status: userStatus,
    };

    return {
      success: true,
      statusCode: 200,
      message: "OK",
      data: {
        user: otherUser,
        conversationId,
      },
    };
  }

  /**
   * Get user profile with Decode API fallback
   */
  private async getUserProfileWithDecode(
    userDehiveId: string,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<Partial<UserProfile>> {
    try {
      // Try to get from Decode API if session info is available
      if (sessionId && fingerprintHash) {
        const profile = await this.getUserProfileFromDecode(
          userDehiveId,
          sessionId,
          fingerprintHash,
        );
        if (profile) {
          return profile;
        }
      }

      // Fallback to cached profile or default
      return await this.getUserProfile(userDehiveId);
    } catch (error) {
      this.logger.error(
        `Error getting user profile for ${userDehiveId}:`,
        error,
      );
      return {
        _id: userDehiveId,
        username: `User_${userDehiveId}`,
        display_name: `User_${userDehiveId}`,
        avatar_ipfs_hash: undefined,
      };
    }
  }
}

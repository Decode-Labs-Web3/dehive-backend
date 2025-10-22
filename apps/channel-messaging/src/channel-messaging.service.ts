import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { AuthServiceClient } from "./auth-service.client";
import { DecodeApiClient } from "../clients/decode-api.client";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";
import { UserProfile } from "../interfaces/user-profile.interface";
import { randomUUID } from "crypto";
import {
  ChannelMessage,
  ChannelMessageDocument,
} from "../schemas/channel-message.schema";
import { CreateMessageDto } from "../dto/create-message.dto";
import { AttachmentDto } from "../dto/attachment.dto";
import { GetMessagesDto } from "../dto/get-messages.dto";
import { Upload, UploadDocument } from "../schemas/upload.schema";
import { UploadInitDto, UploadResponseDto } from "../dto/channel-upload.dto";
import { AttachmentType } from "../enum/enum";
import sharp from "sharp";
import * as childProcess from "child_process";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import {
  UserDehiveServer,
  UserDehiveServerDocument,
} from "../../user-dehive-server/schemas/user-dehive-server.schema";
import {
  UserDehive,
  UserDehiveDocument,
} from "../../user-dehive-server/schemas/user-dehive.schema";
import { Channel, ChannelDocument } from "../../server/schemas/channel.schema";

@Injectable()
export class MessagingService {
  constructor(
    @InjectModel(ChannelMessage.name)
    private readonly channelMessageModel: Model<ChannelMessageDocument>,
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(Upload.name)
    private readonly uploadModel: Model<UploadDocument>,
    @InjectModel(UserDehiveServer.name)
    private readonly userDehiveServerModel: Model<UserDehiveServerDocument>,
    @InjectModel(UserDehive.name)
    private readonly userDehiveModel: Model<UserDehiveDocument>,
    private readonly configService: ConfigService,
    private readonly authClient: AuthServiceClient,
    private readonly decodeClient: DecodeApiClient,
    @InjectRedis() private readonly redis: Redis,
  ) {}

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
        `Image exceeds size limit (${limits.image} bytes)`,
      );
    if (type === AttachmentType.VIDEO && size > limits.video)
      throw new BadRequestException(
        `Video exceeds size limit (${limits.video} bytes)`,
      );
    if (
      type !== AttachmentType.IMAGE &&
      type !== AttachmentType.VIDEO &&
      size > limits.file
    )
      throw new BadRequestException(
        `File exceeds size limit (${limits.file} bytes)`,
      );
  }

  async handleUpload(
    file: unknown,
    body: UploadInitDto,
    userId?: string,
  ): Promise<UploadResponseDto> {
    if (!file || typeof file !== "object")
      throw new BadRequestException("File is required");

    type UploadedFileLike = {
      mimetype?: string;
      size?: number;
      originalname?: string;
      buffer?: Buffer;
    };
    const uploaded = file as UploadedFileLike;

    const mime: string = uploaded.mimetype || "application/octet-stream";
    const size: number = uploaded.size ?? 0;
    this.validateUploadSize(mime, size);

    if (!body.serverId) {
      throw new BadRequestException("serverId is required");
    }
    if (!Types.ObjectId.isValid(body.serverId)) {
      throw new BadRequestException("Invalid serverId");
    }
    if (!body.channelId) {
      throw new BadRequestException("channelId is required");
    }
    if (!Types.ObjectId.isValid(body.channelId)) {
      throw new BadRequestException("Invalid channelId");
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid or missing user_dehive_id");
    }
    const isMember = await this.userDehiveServerModel.exists({
      user_dehive_id: userId,
      server_id: new Types.ObjectId(body.serverId),
    });
    if (!isMember) {
      throw new BadRequestException("User is not a member of this server");
    }

    // Validate channel exists and user has access
    const channel = await this.channelModel.findById(body.channelId);
    if (!channel) {
      throw new NotFoundException("Channel not found");
    }

    const storage = (
      this.configService.get<string>("STORAGE") || "local"
    ).toLowerCase();
    const cdnBase =
      this.configService.get<string>("CDN_BASE_URL") ||
      "http://localhost:4003/uploads";

    let fileUrl = "";
    const originalName: string = uploaded.originalname || "upload.bin";
    const ext = path.extname(originalName) || "";
    const safeName = `${randomUUID()}${ext}`;

    if (storage === "local") {
      const uploadDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });
      const dest = path.join(uploadDir, safeName);
      const buffer: Buffer = Buffer.isBuffer(uploaded.buffer)
        ? uploaded.buffer
        : Buffer.from("");
      fs.writeFileSync(dest, buffer);
      fileUrl = `${cdnBase.replace(/\/$/, "")}/${safeName}`;
    } else {
      throw new BadRequestException("S3/MinIO not implemented yet");
    }

    const type = this.detectAttachmentType(mime);

    let width: number | undefined;
    let height: number | undefined;
    let durationMs: number | undefined;
    let thumbnailUrl: string | undefined;

    try {
      if (type === AttachmentType.IMAGE) {
        const inputBuffer: Buffer =
          (uploaded.buffer as Buffer) || Buffer.alloc(0);
        const metadata = await sharp(inputBuffer).metadata();
        width = metadata.width;
        height = metadata.height;
      } else if (
        type === AttachmentType.VIDEO ||
        type === AttachmentType.AUDIO
      ) {
        const probeMeta = ffprobePath as unknown as { path?: string } | string;
        const probeBin =
          (typeof probeMeta === "object" && probeMeta?.path) ||
          (typeof probeMeta === "string" ? probeMeta : "ffprobe");
        const tmpFilePath = path.resolve(process.cwd(), "uploads", safeName);
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
          const info = JSON.parse(String(probe.stdout)) as {
            streams?: Array<{
              width?: number;
              height?: number;
              codec_type?: string;
              duration?: string;
            }>;
            format?: { duration?: string };
          };
          const videoStream = info.streams?.find(
            (s) => s.codec_type === "video",
          );
          if (videoStream) {
            width = videoStream.width;
            height = videoStream.height;
          }
          const dur =
            (videoStream?.duration && parseFloat(videoStream.duration)) ||
            (info.format?.duration && parseFloat(info.format.duration)) ||
            undefined;
          if (dur && !Number.isNaN(dur)) durationMs = Math.round(dur * 1000);

          if (type === AttachmentType.VIDEO) {
            const thumbName = `${safeName.replace(ext, "")}_thumb.jpg`;
            const thumbPath = path.resolve(process.cwd(), "uploads", thumbName);
            const ffmpegBin = (ffmpegPath as unknown as string) || "ffmpeg";
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
    } catch {
      // Best-effort; ignore metadata/thumbnail failures
    }

    const doc = await this.uploadModel.create({
      ownerId:
        userId && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : new Types.ObjectId(),
      serverId: body.serverId ? new Types.ObjectId(body.serverId) : undefined,
      channelId: new Types.ObjectId(body.channelId),
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
      uploadId: String(doc._id),
      type,
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

  async createMessage(
    createMessageDto: CreateMessageDto,
    senderId: string,
  ): Promise<unknown> {
    let attachments: AttachmentDto[] = [];

    if (
      Array.isArray(createMessageDto.uploadIds) &&
      createMessageDto.uploadIds.length > 0
    ) {
      const validIds = createMessageDto.uploadIds.filter((id) =>
        Types.ObjectId.isValid(id),
      );
      if (validIds.length !== createMessageDto.uploadIds.length) {
        throw new BadRequestException("One or more uploadIds are invalid");
      }
      const uploadObjectIds = validIds.map((id) => new Types.ObjectId(id));
      const uploads = await this.uploadModel
        .find({
          _id: { $in: uploadObjectIds },
          ownerId: new Types.ObjectId(senderId),
        })
        .lean();
      if (uploads.length !== uploadObjectIds.length) {
        throw new BadRequestException(
          "You can only attach files that you uploaded",
        );
      }
      attachments = uploads.map((u) => ({
        type: u.type as unknown as AttachmentDto["type"],
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

    // Validate channel exists
    const channel = await this.channelModel.findById(
      createMessageDto.channelId,
    );
    if (!channel) {
      throw new BadRequestException("Invalid channelId");
    }

    // Validate replyTo if provided
    let replyToMessageId: Types.ObjectId | undefined;
    if (createMessageDto.replyTo) {
      if (!Types.ObjectId.isValid(createMessageDto.replyTo)) {
        throw new BadRequestException("Invalid replyTo message id");
      }

      // Check if the message being replied to exists and is in the same channel
      const replyToMessage = await this.channelMessageModel
        .findById(createMessageDto.replyTo)
        .lean();
      if (!replyToMessage) {
        throw new NotFoundException("Message being replied to not found");
      }

      if (String(replyToMessage.channelId) !== createMessageDto.channelId) {
        throw new BadRequestException(
          "Cannot reply to a message from a different channel",
        );
      }

      replyToMessageId = new Types.ObjectId(createMessageDto.replyTo);
    }

    const newMessage = new this.channelMessageModel({
      content: createMessageDto.content,
      attachments,
      senderId: new Types.ObjectId(senderId),
      channelId: new Types.ObjectId(createMessageDto.channelId),
      replyTo: replyToMessageId || null,
    });

    const savedMessage = await newMessage.save();

    // Populate the replyTo field to match the format returned by getMessagesByChannelId
    const populatedMessage = await this.channelMessageModel
      .findById(savedMessage._id)
      .populate("replyTo", "content senderId createdAt")
      .lean();

    // Ensure replyTo field is properly formatted (null if no reply)
    const formattedMessage = {
      ...populatedMessage,
      replyTo: populatedMessage?.replyTo || null,
    };

    return formattedMessage;
  }

  async getMessagesByChannelId(
    channelId: string,
    getMessagesDto: GetMessagesDto,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<{
    items: unknown[];
    metadata: {
      page: number;
      limit: number;
      total: number;
      is_last_page: boolean;
    };
  }> {
    const { page = 0, limit = 10 } = getMessagesDto;
    const skip = page * limit;

    if (!Types.ObjectId.isValid(channelId)) {
      throw new BadRequestException("Invalid channelId");
    }

    // 1. Get messages with UserDehive populated and replyTo populated
    const [messages, total] = await Promise.all([
      this.channelMessageModel
        .find({ channelId: new Types.ObjectId(channelId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate<{
          senderId: { _id: Types.ObjectId };
        }>({
          path: "senderId",
          model: "UserDehive",
          select: "_id",
        })
        .populate("replyTo", "content senderId createdAt")
        .lean(),
      this.channelMessageModel.countDocuments({
        channelId: new Types.ObjectId(channelId),
      }),
    ]);

    if (!messages || messages.length === 0) {
      return {
        items: [],
        metadata: {
          page,
          limit,
          total: 0,
          is_last_page: true,
        },
      };
    }

    // 2. Extract user IDs from senderId (which is UserDehive _id)
    const userIds = messages
      .map((m) => {
        const sender = m.senderId as {
          _id: Types.ObjectId;
        };
        return sender?._id?.toString();
      })
      .filter((id): id is string => Boolean(id));

    // 3. Batch get profiles from decode service (with cache)
    console.log("[CHANNEL-MESSAGING] Debug getMessagesByConversationId:", {
      userIds,
      sessionId,
      fingerprintHash,
      hasSessionId: !!sessionId,
      hasFingerprintHash: !!fingerprintHash,
    });

    const profiles = await this.decodeClient.batchGetProfiles(
      userIds,
      sessionId,
      fingerprintHash,
    );

    console.log("[CHANNEL-MESSAGING] Profiles received:", {
      requestedUserIds: userIds,
      receivedProfiles: Object.keys(profiles),
      profiles: profiles,
    });

    // Debug avatar data specifically
    Object.keys(profiles).forEach((userId) => {
      const profile = profiles[userId];
      console.log(`[CHANNEL-MESSAGING] Profile for ${userId}:`, {
        username: profile?.username,
        display_name: profile?.display_name,
        avatar: profile?.avatar,
        fullProfile: profile,
      });
    });

    // 4. Map messages with user profiles
    const items = messages.map((msg) => {
      const sender = msg.senderId as {
        _id: Types.ObjectId;
      };
      const userId = sender?._id?.toString() || "";
      const profile = profiles[userId];

      return {
        _id: msg._id,
        channelId: msg.channelId,
        sender: {
          dehive_id: sender?._id?.toString() || "",
          username: profile?.username || `User_${userId}`,
          display_name: profile?.display_name || `User_${userId}`,
          avatar_ipfs_hash:
            profile?.avatar_ipfs_hash || profile?.avatar || null,
        },
        content: msg.content,
        attachments: msg.attachments || [],
        isEdited: msg.isEdited || false,
        editedAt: msg.editedAt || null,
        isDeleted: msg.isDeleted || false,
        replyTo: msg.replyTo || null,
        createdAt: (msg as { createdAt?: Date }).createdAt,
        updatedAt: (msg as { updatedAt?: Date }).updatedAt,
      };
    });

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

  async editMessage(
    messageId: string,
    editorUserDehiveId: string,
    newContent: string,
  ) {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException("Invalid message id");
    }
    if (!Types.ObjectId.isValid(editorUserDehiveId)) {
      throw new BadRequestException("Invalid user id");
    }
    if (typeof newContent !== "string") {
      throw new BadRequestException("Content must be a string");
    }
    const msg = await this.channelMessageModel.findById(messageId);
    if (!msg) throw new NotFoundException("Message not found");
    if (String(msg.senderId) !== editorUserDehiveId) {
      throw new BadRequestException("You can only edit your own message");
    }
    msg.content = newContent;
    msg.isEdited = true;
    (msg as unknown as { editedAt?: Date }).editedAt = new Date();
    await msg.save();

    // Populate the replyTo field to match the format returned by getMessagesByConversationId
    const populatedMessage = await this.channelMessageModel
      .findById(msg._id)
      .populate("replyTo", "content senderId createdAt")
      .lean();

    // Ensure replyTo field is properly formatted (null if no reply)
    const formattedMessage = {
      ...populatedMessage,
      replyTo: populatedMessage?.replyTo || null,
    };

    return formattedMessage;
  }

  async deleteMessage(messageId: string, requesterUserDehiveId: string) {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException("Invalid message id");
    }
    if (!Types.ObjectId.isValid(requesterUserDehiveId)) {
      throw new BadRequestException("Invalid user id");
    }
    const msg = await this.channelMessageModel.findById(messageId);
    if (!msg) throw new NotFoundException("Message not found");
    if (String(msg.senderId) !== requesterUserDehiveId) {
      throw new BadRequestException("You can only delete your own message");
    }
    (msg as unknown as { isDeleted?: boolean }).isDeleted = true;
    msg.content = "[deleted]";
    (msg as unknown as { attachments?: unknown[] }).attachments = [];
    await msg.save();

    // Populate the replyTo field to match the format returned by getMessagesByChannelId
    const populatedMessage = await this.channelMessageModel
      .findById(msg._id)
      .populate("replyTo", "content senderId createdAt")
      .lean();

    // Ensure replyTo field is properly formatted (null if no reply)
    const formattedMessage = {
      ...populatedMessage,
      replyTo: populatedMessage?.replyTo || null,
    };

    return formattedMessage;
  }
  async listUploads(params: {
    serverId: string;
    userId: string;
    type?: AttachmentType;
    page: number;
    limit: number;
  }) {
    const { serverId, userId, type, page, limit } = params;
    if (!serverId || !Types.ObjectId.isValid(serverId)) {
      throw new BadRequestException("Invalid serverId");
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid user_dehive_id");
    }

    const membership = await this.userDehiveServerModel.exists({
      user_dehive_id: userId, // userId is now _id from controller
      server_id: new Types.ObjectId(serverId),
    });

    if (!membership) {
      throw new BadRequestException("User is not a member of this server");
    }

    const query: Record<string, unknown> = {
      serverId: new Types.ObjectId(serverId),
    };
    query.ownerId = new Types.ObjectId(userId);
    if (type) {
      const allowed = new Set<AttachmentType>([
        AttachmentType.IMAGE,
        AttachmentType.VIDEO,
        AttachmentType.AUDIO,
        AttachmentType.FILE,
      ]);
      if (!allowed.has(type)) {
        throw new BadRequestException("Invalid type");
      }
      query.type = type;
    }

    const skip = page * limit;
    const [items, total] = await Promise.all([
      this.uploadModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.uploadModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);
    const isLastPage = page >= totalPages - 1;

    return {
      items: items.map((u) => ({
        _id: u._id,
        ownerId: u.ownerId,
        serverId: u.serverId,
        type: u.type,
        url: u.url,
        name: u.name,
        size: u.size,
        mimeType: u.mimeType,
        width: u.width,
        height: u.height,
        durationMs: u.durationMs,
        thumbnailUrl: u.thumbnailUrl,
        createdAt: (u as unknown as { createdAt?: Date })?.createdAt,
      })),
      metadata: {
        page,
        limit,
        total: items.length,
        is_last_page: isLastPage,
      },
    };
  }

  async getUserProfile(userDehiveId: string): Promise<Partial<UserProfile>> {
    try {
      // First check cache for any previously fetched profile
      const cacheKey = `user_profile:${userDehiveId}`;
      const cachedData = await this.redis.get(cacheKey);

      if (cachedData) {
        const profile = JSON.parse(cachedData);
        console.log(
          `[CHANNEL-MESSAGING] Retrieved cached profile for ${userDehiveId} in WebSocket`,
        );
        return profile;
      }

      // Fallback to basic profile if no cache
      console.log(
        `[CHANNEL-MESSAGING] No cached profile found for ${userDehiveId}, using fallback in WebSocket`,
      );
      return {
        user_id: userDehiveId,
        user_dehive_id: userDehiveId,
        username: `User_${userDehiveId}`,
        display_name: `User_${userDehiveId}`,
        avatar: null,
        avatar_ipfs_hash: null,
      };
    } catch (error) {
      console.error(
        `[CHANNEL-MESSAGING] Error getting user profile for ${userDehiveId}:`,
        error,
      );
      return {
        user_id: userDehiveId,
        user_dehive_id: userDehiveId,
        username: `User_${userDehiveId}`,
        display_name: `User_${userDehiveId}`,
        avatar: null,
        avatar_ipfs_hash: null,
      };
    }
  }
}

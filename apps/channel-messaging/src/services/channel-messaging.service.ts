import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { AuthServiceClient } from "../auth-service.client";
import { DecodeApiClient } from "../../clients/decode-api.client";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";
import { UserProfile } from "../../interfaces/user-profile.interface";
import { randomUUID } from "crypto";
import {
  ChannelMessage,
  ChannelMessageDocument,
} from "../../schemas/channel-message.schema";
import { CreateMessageDto } from "../../dto/create-message.dto";
import { AttachmentDto } from "../../dto/attachment.dto";
import { GetMessagesDto } from "../../dto/get-messages.dto";
import { Upload, UploadDocument } from "../../schemas/upload.schema";
import { UploadInitDto, UploadResponseDto } from "../../dto/channel-upload.dto";
import { AttachmentType } from "../../enum/enum";
import * as sharp from "sharp";
import * as childProcess from "child_process";
import * as ffmpegPath from "ffmpeg-static";
import * as ffprobePath from "ffprobe-static";
import {
  UserDehiveServer,
  UserDehiveServerDocument,
} from "../../../user-dehive-server/schemas/user-dehive-server.schema";
import {
  UserDehive,
  UserDehiveDocument,
} from "../../../user-dehive-server/schemas/user-dehive.schema";
import {
  Channel,
  ChannelDocument,
} from "../../../server/schemas/channel.schema";
import { IPFSService } from "./ipfs.service";
import { ChannelMessagingCacheService } from "./redis-cache.service";

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
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
    private readonly ipfsService: IPFSService,
    private readonly cacheService: ChannelMessagingCacheService,
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

    let ipfsHash: string | undefined;
    const originalName: string = uploaded.originalname || "upload.bin";
    const ext = path.extname(originalName) || "";
    const safeName = `${randomUUID()}${ext}`;
    const uploadDir = path.resolve(process.cwd(), "uploads");

    if (storage === "ipfs") {
      // Upload to IPFS
      this.logger.log(`Uploading file to IPFS: ${originalName}`);
      const buffer: Buffer = Buffer.isBuffer(uploaded.buffer)
        ? uploaded.buffer
        : Buffer.from("");

      const ipfsResult = await this.ipfsService.uploadFile(buffer, safeName);

      if (!ipfsResult) {
        this.logger.warn("IPFS upload failed, falling back to local storage");
        // Fallback to local storage
        if (!fs.existsSync(uploadDir))
          fs.mkdirSync(uploadDir, { recursive: true });
        const dest = path.join(uploadDir, safeName);
        fs.writeFileSync(dest, buffer);
      } else {
        ipfsHash = `ipfs://${ipfsResult.hash}`;
        this.logger.log(`File uploaded to IPFS: ${ipfsHash}`);
      }
    } else {
      // Local storage
      if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });
      const dest = path.join(uploadDir, safeName);
      const buffer: Buffer = Buffer.isBuffer(uploaded.buffer)
        ? uploaded.buffer
        : Buffer.from("");
      fs.writeFileSync(dest, buffer);
    }

    const type = this.detectAttachmentType(mime);
    let width: number | undefined,
      height: number | undefined,
      durationMs: number | undefined;

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
            childProcess.spawnSync(
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
            // Thumbnail generated locally but URL not stored
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
      ipfsHash,
      name: originalName,
      size,
      mimeType: mime,
      width,
      height,
      durationMs,
    });

    return {
      uploadId: String(doc._id),
      type,
      ipfsHash: doc.ipfsHash,
      name: doc.name,
      size: doc.size,
      mimeType: doc.mimeType,
      width: doc.width,
      height: doc.height,
      durationMs: doc.durationMs,
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
        ipfsHash: u.ipfsHash,
        name: u.name,
        size: u.size,
        mimeType: u.mimeType,
        width: u.width,
        height: u.height,
        durationMs: u.durationMs,
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

    // Invalidate cache for page 0 (first page where new message appears)
    await this.cacheService
      .invalidateChannelPageCache(createMessageDto.channelId, 0)
      .catch((err) =>
        this.logger.error(
          `Failed to invalidate cache after creating message: ${err.message}`,
        ),
      );

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

    if (!Types.ObjectId.isValid(channelId)) {
      throw new BadRequestException("Invalid channelId");
    }

    this.logger.log(
      `📥 [CACHE] Request channel messages: channel=${channelId}, page=${page}, limit=${limit}`,
    );

    try {
      // 1. Try to get from cache (with stale-while-revalidate)
      const cachedResult = await this.cacheService.getCachedMessages(
        channelId,
        page,
      );

      if (cachedResult) {
        if (cachedResult.isStale) {
          // Return stale data immediately + refresh in background
          this.refreshMessagesInBackground(
            channelId,
            page,
            limit,
            sessionId,
            fingerprintHash,
          ).catch((err) =>
            this.logger.error(
              `Failed to refresh channel messages cache in background: ${err.message}`,
            ),
          );

          return cachedResult.data;
        }

        // Fresh cache - return immediately
        this.logger.log(
          `✅ Returning fresh cached messages for channel ${channelId} page ${page}`,
        );
        return cachedResult.data;
      }

      // 2. Cache MISS → Try to acquire lock
      const lockAcquired = await this.cacheService.acquireLock(channelId, page);

      if (lockAcquired) {
        try {
          // Double-check cache (maybe another request just cached it)
          const doubleCheck = await this.cacheService.getCachedMessages(
            channelId,
            page,
          );
          if (doubleCheck && !doubleCheck.isStale) {
            return doubleCheck.data;
          }

          // Fetch from DB and cache
          const result = await this.fetchAndCacheMessages(
            channelId,
            page,
            limit,
            sessionId,
            fingerprintHash,
          );
          return result;
        } finally {
          // Always release lock
          await this.cacheService.releaseLock(channelId, page);
        }
      } else {
        // Lock is held by another request → Wait for cache
        const waitedCache = await this.cacheService.waitForCache(
          channelId,
          page,
        );

        if (waitedCache) {
          return waitedCache;
        }

        // Timeout waiting → Fetch directly (fallback)
        this.logger.warn(
          `Timeout waiting for cache, fetching directly: channel ${channelId} page ${page}`,
        );
        const result = await this.fetchAndCacheMessages(
          channelId,
          page,
          limit,
          sessionId,
          fingerprintHash,
        );
        return result;
      }
    } catch (error) {
      // Redis error → Fallback to MongoDB
      this.logger.error(`Cache error, falling back to DB: ${error.message}`);
      return this.fetchMessagesFromDB(
        channelId,
        page,
        limit,
        sessionId,
        fingerprintHash,
      );
    }
  }

  /**
   * Fetch messages from MongoDB and cache the result
   */
  private async fetchAndCacheMessages(
    channelId: string,
    page: number,
    limit: number,
    sessionId?: string,
    fingerprintHash?: string,
  ) {
    this.logger.log(
      `🔄 [CACHE] Fetching from MongoDB and caching: channel=${channelId}, page=${page}`,
    );

    const result = await this.fetchMessagesFromDB(
      channelId,
      page,
      limit,
      sessionId,
      fingerprintHash,
    );

    // Cache result (fire and forget - don't wait)
    this.cacheService
      .setCachedMessages(channelId, page, {
        items: result.items,
        metadata: result.metadata,
      })
      .catch((err) =>
        this.logger.error(`Failed to cache channel messages: ${err.message}`),
      );

    return result;
  }

  /**
   * Fetch messages from DB without caching (core logic)
   */
  private async fetchMessagesFromDB(
    channelId: string,
    page: number,
    limit: number,
    sessionId?: string,
    fingerprintHash?: string,
  ) {
    const skip = page * limit;

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
    this.logger.debug(
      "[CHANNEL-MESSAGING] Debug getMessagesByConversationId: userIds, session/fingerprint flags",
      {
        userIds,
        hasSessionId: !!sessionId,
        hasFingerprintHash: !!fingerprintHash,
      },
    );

    const profiles = await this.decodeClient.batchGetProfiles(
      userIds,
      sessionId,
      fingerprintHash,
    );

    this.logger.debug("[CHANNEL-MESSAGING] Profiles received", {
      requestedUserIds: userIds,
      receivedProfiles: Object.keys(profiles || {}),
    });

    // Debug avatar data specifically
    Object.keys(profiles || {}).forEach((userId) => {
      const profile = (profiles as Record<string, Partial<UserProfile>>)[
        userId
      ];
      this.logger.debug(`[CHANNEL-MESSAGING] Profile for ${userId}`, {
        username: profile?.username,
        display_name: profile?.display_name,
        avatar: profile?.avatar,
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
          wallets: profile?.wallets || [],
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

    const totalPages = Math.ceil(total / limit) || 1;
    const isLastPage = page >= totalPages - 1;

    return {
      items,
      metadata: {
        page,
        limit,
        total,
        is_last_page: isLastPage,
      },
    };
  }

  /**
   * Refresh cache in background (non-blocking)
   */
  private async refreshMessagesInBackground(
    channelId: string,
    page: number,
    limit: number,
    sessionId?: string,
    fingerprintHash?: string,
  ): Promise<void> {
    this.logger.log(
      `🔄 Refreshing channel messages cache in background: channel ${channelId} page ${page}`,
    );
    await this.fetchAndCacheMessages(
      channelId,
      page,
      limit,
      sessionId,
      fingerprintHash,
    );
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

    // Invalidate all pages cache for this channel
    await this.cacheService
      .invalidateChannelCache(String(msg.channelId))
      .catch((err) =>
        this.logger.error(
          `Failed to invalidate cache after editing message: ${err.message}`,
        ),
      );

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

    // Invalidate all pages cache for this channel
    await this.cacheService
      .invalidateChannelCache(String(msg.channelId))
      .catch((err) =>
        this.logger.error(
          `Failed to invalidate cache after deleting message: ${err.message}`,
        ),
      );

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

  /**
   * List messages relative to an anchor message (point-of-view) in a channel.
   * direction: 'up' => older messages (createdAt < anchor) returned in descending order
   *            'down' => newer messages (createdAt > anchor) returned in ascending order
   */
  async listMessagesFromAnchor(
    selfId: string,
    channelId: string,
    anchorMessageId: string,
    direction: "up" | "down",
    page = 0,
    limit = 10,
    sessionId?: string,
    fingerprintHash?: string,
  ) {
    if (!Types.ObjectId.isValid(anchorMessageId))
      throw new BadRequestException("Invalid message id");
    if (!Types.ObjectId.isValid(channelId))
      throw new BadRequestException("Invalid channel id");
    if (direction !== "up" && direction !== "down")
      throw new BadRequestException("direction must be 'up' or 'down'");

    // Find anchor and ensure it belongs to requested channel
    const anchor = (await this.channelMessageModel
      .findById(anchorMessageId)
      .lean()) as unknown as {
      createdAt: Date;
      _id: Types.ObjectId;
      channelId: Types.ObjectId;
      senderId?: unknown;
      content?: string;
      attachments?: unknown[];
      isEdited?: boolean;
      isDeleted?: boolean;
      replyTo?: unknown | null;
      updatedAt?: Date;
      __v?: number;
    };

    if (!anchor) throw new BadRequestException("Anchor message not found");
    if (String(anchor.channelId) !== String(channelId))
      throw new BadRequestException("Anchor does not belong to the channel");

    const skip = page * limit;

    // Build comparator similar to direct messaging
    let queryComparator: Record<string, unknown>;
    let sortOrder: { [key: string]: 1 | -1 };

    if (direction === "up") {
      queryComparator = {
        $or: [
          { createdAt: { $lt: anchor.createdAt } },
          { createdAt: anchor.createdAt, _id: { $lt: anchor._id } },
        ],
      };
      sortOrder = { createdAt: -1, _id: -1 };
    } else {
      queryComparator = {
        $or: [
          { createdAt: { $gt: anchor.createdAt } },
          { createdAt: anchor.createdAt, _id: { $gt: anchor._id } },
        ],
      };
      sortOrder = { createdAt: 1, _id: 1 };
    }

    // total messages in channel
    const total = await this.channelMessageModel.countDocuments({
      channelId: new Types.ObjectId(channelId),
    });

    // total messages in requested direction
    const directionTotal = await this.channelMessageModel.countDocuments({
      channelId: new Types.ObjectId(channelId),
      ...queryComparator,
    });

    const rawItems = await this.channelMessageModel
      .find({
        channelId: new Types.ObjectId(channelId),
        ...queryComparator,
      })
      .populate("replyTo", "content senderId createdAt")
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .lean();

    // Collect user ids to fetch profiles
    const userIds = rawItems
      .map((it: unknown) => {
        const obj = it as { senderId?: unknown };
        return obj.senderId ? String(obj.senderId) : undefined;
      })
      .filter((id: string | undefined): id is string => Boolean(id));

    // Ensure anchor sender is included for anchor formatting
    const anchorSenderId = anchor.senderId
      ? String(anchor.senderId)
      : undefined;
    if (anchorSenderId && !userIds.includes(anchorSenderId)) {
      userIds.push(anchorSenderId);
    }

    // Batch fetch profiles
    let profiles: Record<string, Partial<UserProfile>> = {};
    try {
      profiles = await this.decodeClient.batchGetProfiles(
        userIds,
        sessionId,
        fingerprintHash,
      );
    } catch (err) {
      // If decode fails, continue with empty profiles (fallback to default)
      this.logger.warn(`[CHANNEL] batchGetProfiles failed: ${String(err)}`);
      profiles = {};
    }

    const fetchedItems = rawItems.map((item: unknown) => {
      const it = item as Record<string, unknown>;
      const userId = it["senderId"] ? String(it["senderId"]) : "";
      const profile = profiles[userId] || null;
      return {
        _id: it["_id"],
        channelId: it["channelId"],
        sender: {
          dehive_id: userId,
          username: (profile && profile.username) || `User_${userId}`,
          display_name: (profile && profile.display_name) || `User_${userId}`,
          avatar_ipfs_hash:
            (profile && (profile.avatar_ipfs_hash || profile.avatar)) || null,
          wallets: (profile && profile.wallets) || [],
        },
        content: it["content"],
        attachments: (it["attachments"] as unknown[]) || [],
        isEdited: (it["isEdited"] as unknown as boolean) || false,
        isDeleted: (it["isDeleted"] as unknown as boolean) || false,
        replyTo: it["replyTo"] || null,
        createdAt: it["createdAt"],
        updatedAt: it["updatedAt"],
      };
    });

    // Build items array; include anchor for 'up' page 0
    // For 'up' direction we want the anchor to appear at the BOTTOM
    // because frontend renders top->bottom. So reverse the fetched
    // items (oldest -> newest) and then append the anchor as the last
    // element for page 0.
    let items: unknown[] = [];
    if (page === 0 && direction === "up") {
      const anchorProfile =
        (anchorSenderId && profiles[anchorSenderId]) || null;
      const anchorItem = {
        _id: anchor._id,
        channelId: anchor.channelId,
        sender: {
          dehive_id: anchorSenderId || "",
          username:
            (anchorProfile && anchorProfile.username) ||
            `User_${anchorSenderId || ""}`,
          display_name:
            (anchorProfile && anchorProfile.display_name) ||
            `User_${anchorSenderId || ""}`,
          avatar_ipfs_hash:
            (anchorProfile &&
              (anchorProfile.avatar_ipfs_hash || anchorProfile.avatar)) ||
            null,
          wallets: (anchorProfile && anchorProfile.wallets) || [],
        },
        content: anchor.content || null,
        attachments: anchor.attachments || [],
        isEdited: anchor.isEdited || false,
        isDeleted: anchor.isDeleted || false,
        replyTo: anchor.replyTo || null,
        createdAt: anchor.createdAt,
        updatedAt: anchor.updatedAt,
      };

      // fetchedItems are returned sorted newest->oldest for 'up' (createdAt -1)
      // Reverse so the array becomes oldest->newest, then put anchor last.
      const reversed = Array.isArray(fetchedItems)
        ? [...fetchedItems].reverse()
        : fetchedItems;

      if (Array.isArray(reversed)) {
        items = [...reversed, anchorItem];
      } else {
        items = [anchorItem];
      }
    } else {
      items = fetchedItems;
    }

    const totalDirectionPages = Math.ceil(directionTotal / limit) || 1;
    const isLastPage = page >= totalDirectionPages - 1;

    return {
      items,
      metadata: {
        page,
        limit,
        total,
        is_last_page: isLastPage,
      },
    };
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
        ipfsHash: u.ipfsHash,
        name: u.name,
        size: u.size,
        mimeType: u.mimeType,
        width: u.width,
        height: u.height,
        durationMs: u.durationMs,
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
      // Check cache for profile (must be cached by HTTP API calls BEFORE WebSocket usage)
      const cacheKey = `user_profile:${userDehiveId}`;
      const cachedData = await this.redis.get(cacheKey);

      if (cachedData) {
        const profile = JSON.parse(cachedData);
        this.logger.debug(
          `[CHANNEL-MESSAGING] Retrieved cached profile for ${userDehiveId} in WebSocket`,
        );
        return profile;
      }

      // No fallback - throw error if profile not cached
      // This forces HTTP API to be called first to cache user profiles
      const error = new Error(
        `User profile not cached for ${userDehiveId}. HTTP API must be called first to cache user profiles before WebSocket usage.`,
      );
      this.logger.error(`[CHANNEL-MESSAGING] CRITICAL ERROR: ${error.message}`);
      throw error;
    } catch (error) {
      this.logger.error(
        `[CHANNEL-MESSAGING] Error getting user profile for ${userDehiveId}: ${String(error)}`,
      );
      throw error;
    }
  }
}

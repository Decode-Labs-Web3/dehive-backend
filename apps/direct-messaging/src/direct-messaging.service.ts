/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DirectConversation,
  DirectConversationDocument,
} from '../schemas/direct-conversation.schema';
import {
  DirectMessage,
  DirectMessageDocument,
} from '../schemas/direct-message.schema';
import { CreateOrGetConversationDto } from '../dto/create-or-get-conversation.dto.ts';
import {
  DirectUploadInitDto,
  DirectUploadResponseDto,
} from '../dto/direct-upload.dto';
import { ListDirectMessagesDto } from '../dto/list-direct-messages.dto';
import { SendDirectMessageDto } from '../dto/send-direct-message.dto';
import {
  DirectUpload,
  DirectUploadDocument,
} from '../schemas/direct-upload.schema';
import { AttachmentType } from '../enum/enum';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import * as childProcess from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import { ConfigService } from '@nestjs/config';
import { ListDirectUploadsDto } from '../dto/list-direct-upload.dto';

@Injectable()
export class DirectMessagingService {
  constructor(
    @InjectModel(DirectConversation.name)
    private readonly conversationModel: Model<DirectConversationDocument>,
    @InjectModel(DirectMessage.name)
    private readonly messageModel: Model<DirectMessageDocument>,
    @InjectModel(DirectUpload.name)
    private readonly directuploadModel: Model<DirectUploadDocument>,
    private readonly configService: ConfigService,
  ) {}

  private detectAttachmentType(mime: string): AttachmentType {
    if (mime.startsWith('image/')) return AttachmentType.IMAGE;
    if (mime.startsWith('video/')) return AttachmentType.VIDEO;
    if (mime.startsWith('audio/')) return AttachmentType.AUDIO;
    return AttachmentType.FILE;
  }

  private getLimits() {
    const toBytes = (mb: string, def: number) =>
      (parseInt(mb || '', 10) || def) * 1024 * 1024;
    return {
      image: toBytes(
        this.configService.get<string>('MAX_IMAGE_MB') ?? '10',
        10,
      ),
      video: toBytes(
        this.configService.get<string>('MAX_VIDEO_MB') ?? '100',
        100,
      ),
      file: toBytes(this.configService.get<string>('MAX_FILE_MB') ?? '25', 25),
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

  private participantsFilter(a: string, b: string) {
    return {
      $or: [
        { userA: new Types.ObjectId(a), userB: new Types.ObjectId(b) },
        { userA: new Types.ObjectId(b), userB: new Types.ObjectId(a) },
      ],
    } as const;
  }

  async createOrGetConversation(
    selfId: string,
    dto: CreateOrGetConversationDto,
  ) {
    if (
      !Types.ObjectId.isValid(selfId) ||
      !Types.ObjectId.isValid(dto.otherUserDehiveId)
    ) {
      throw new BadRequestException('Invalid participant id');
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
    if (!file || typeof file !== 'object') {
      throw new BadRequestException('File is required');
    }
    type UploadedFileLike = {
      mimetype?: string;
      size?: number;
      originalname?: string;
      buffer?: Buffer;
    };
    const uploaded = file as UploadedFileLike;

    if (!selfId || !Types.ObjectId.isValid(selfId)) {
      throw new BadRequestException('Invalid or missing user_dehive_id');
    }
    if (!body.conversationId || !Types.ObjectId.isValid(body.conversationId)) {
      throw new BadRequestException('Invalid conversationId');
    }

    const conv = await this.conversationModel
      .findById(body.conversationId)
      .lean();
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }
    const isParticipant = [
      conv.userA.toString(),
      conv.userB.toString(),
    ].includes(selfId);
    if (!isParticipant) {
      throw new BadRequestException(
        'You are not a participant of this conversation',
      );
    }

    const mime = uploaded.mimetype || 'application/octet-stream';
    const size = uploaded.size ?? 0;
    this.validateUploadSize(mime, size);

    const storage = (
      this.configService.get<string>('STORAGE') || 'local'
    ).toLowerCase();
    const port =
      this.configService.get<number>('DIRECT_MESSAGING_PORT') || 4004;
    const cdnBase =
      this.configService.get<string>('CDN_BASE_URL_DM') ||
      `http://localhost:${port}/uploads`;

    let fileUrl = '';
    const originalName = uploaded.originalname || 'upload.bin';
    const ext = path.extname(originalName) || '';
    const safeName = `${randomUUID()}${ext}`;
    const uploadDir = path.resolve(process.cwd(), 'uploads');

    if (storage === 'local') {
      if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });
      const dest = path.join(uploadDir, safeName);
      const buffer: Buffer = Buffer.isBuffer(uploaded.buffer)
        ? uploaded.buffer
        : Buffer.from('');
      fs.writeFileSync(dest, buffer);
      fileUrl = `${cdnBase.replace(/\/$/, '')}/${safeName}`;
    } else {
      throw new BadRequestException('S3/MinIO storage is not implemented yet');
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
          (typeof ffprobePath === 'object' && 'path' in ffprobePath
            ? (ffprobePath as { path: string }).path
            : undefined) || 'ffprobe';
        const probe = childProcess.spawnSync(
          probeBin,
          [
            '-v',
            'error',
            '-print_format',
            'json',
            '-show_format',
            '-show_streams',
            tmpFilePath,
          ],
          { encoding: 'utf-8' },
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
            ? info.streams.find((s) => s && s.codec_type === 'video')
            : undefined;

          if (videoStream) {
            width =
              typeof videoStream.width === 'number'
                ? videoStream.width
                : undefined;
            height =
              typeof videoStream.height === 'number'
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
          if (typeof dur === 'number' && !Number.isNaN(dur))
            durationMs = Math.round(dur * 1000);

          if (type === AttachmentType.VIDEO) {
            const thumbName = `${path.parse(safeName).name}_thumb.jpg`;
            const thumbPath = path.join(uploadDir, thumbName);
            const ffmpegBin = ffmpegPath || 'ffmpeg';
            const ffmpeg = childProcess.spawnSync(
              ffmpegBin,
              [
                '-i',
                tmpFilePath,
                '-ss',
                '00:00:00.000',
                '-vframes',
                '1',
                '-vf',
                'scale=640:-1',
                thumbPath,
                '-y',
              ],
              { encoding: 'utf-8' },
            );
            if (ffmpeg.status === 0) {
              thumbnailUrl = `${cdnBase.replace(/\/$/, '')}/${thumbName}`;
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
      throw new BadRequestException('Invalid sender id');
    }
    if (!Types.ObjectId.isValid(dto.conversationId)) {
      throw new BadRequestException('Invalid conversation id');
    }
    const conv = await this.conversationModel
      .findById(dto.conversationId)
      .lean();
    if (!conv) throw new NotFoundException('Conversation not found');
    const isParticipant = [conv.userA, conv.userB]
      .map((x) => String(x))
      .includes(selfId);
    if (!isParticipant) throw new BadRequestException('Not a participant');

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
        throw new BadRequestException('You can only attach your own uploads');
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

    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(dto.conversationId),
      senderId: new Types.ObjectId(selfId),
      content: dto.content,
      attachments,
    });
    return message;
  }

  async listMessages(
    selfId: string,
    conversationId: string,
    dto: ListDirectMessagesDto,
  ) {
    if (!Types.ObjectId.isValid(selfId))
      throw new BadRequestException('Invalid self id');
    if (!Types.ObjectId.isValid(conversationId))
      throw new BadRequestException('Invalid conversation id');

    const conv = await this.conversationModel.findById(conversationId).lean();
    if (!conv) throw new NotFoundException('Conversation not found');
    const isParticipant = [conv.userA, conv.userB]
      .map((x) => String(x))
      .includes(selfId);
    if (!isParticipant) throw new BadRequestException('Not a participant');

    const page = dto.page || 1;
    const limit = dto.limit || 50;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.messageModel
        .find({ conversationId: new Types.ObjectId(conversationId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.messageModel.countDocuments({
        conversationId: new Types.ObjectId(conversationId),
      }),
    ]);

    return { page, limit, total, items };
  }

  async editMessage(selfId: string, messageId: string, content: string) {
    if (!Types.ObjectId.isValid(selfId))
      throw new BadRequestException('Invalid self id');
    if (!Types.ObjectId.isValid(messageId))
      throw new BadRequestException('Invalid message id');
    if (typeof content !== 'string')
      throw new BadRequestException('Content must be a string');

    const message = await this.messageModel.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');
    if (String(message.senderId) !== selfId)
      throw new BadRequestException('You can only edit your own message');
    if (message.isDeleted)
      throw new BadRequestException('Cannot edit a deleted message');

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();
    return message.toJSON();
  }

  async deleteMessage(selfId: string, messageId: string) {
    if (!Types.ObjectId.isValid(selfId))
      throw new BadRequestException('Invalid self id');
    if (!Types.ObjectId.isValid(messageId))
      throw new BadRequestException('Invalid message id');

    const message = await this.messageModel.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');
    if (String(message.senderId) !== selfId)
      throw new BadRequestException('You can only delete your own message');
    if (message.isDeleted) return message.toJSON();

    message.isDeleted = true;
    message.content = '[deleted]';
    (message as unknown as { attachments?: unknown[] }).attachments = [];
    await message.save();
    return message.toJSON();
  }

  async listUploads(selfId: string, dto: ListDirectUploadsDto) {
    if (!selfId || !Types.ObjectId.isValid(selfId)) {
      throw new BadRequestException('Invalid user id');
    }

    const page = dto.page > 0 ? dto.page : 1;
    const limit = dto.limit > 0 ? Math.min(dto.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
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

    return { page, limit, total, items };
  }
}

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectMessagingService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const direct_conversation_schema_1 = require("../schemas/direct-conversation.schema");
const direct_message_schema_1 = require("../schemas/direct-message.schema");
const direct_upload_schema_1 = require("../schemas/direct-upload.schema");
const enum_1 = require("../enum/enum");
const fs = require("fs");
const path = require("path");
const crypto_1 = require("crypto");
const sharp_1 = require("sharp");
const childProcess = require("child_process");
const ffmpeg_static_1 = require("ffmpeg-static");
const ffprobe_static_1 = require("ffprobe-static");
const config_1 = require("@nestjs/config");
let DirectMessagingService = class DirectMessagingService {
    conversationModel;
    messageModel;
    directuploadModel;
    configService;
    constructor(conversationModel, messageModel, directuploadModel, configService) {
        this.conversationModel = conversationModel;
        this.messageModel = messageModel;
        this.directuploadModel = directuploadModel;
        this.configService = configService;
    }
    detectAttachmentType(mime) {
        if (mime.startsWith('image/'))
            return enum_1.AttachmentType.IMAGE;
        if (mime.startsWith('video/'))
            return enum_1.AttachmentType.VIDEO;
        if (mime.startsWith('audio/'))
            return enum_1.AttachmentType.AUDIO;
        return enum_1.AttachmentType.FILE;
    }
    getLimits() {
        const toBytes = (mb, def) => (parseInt(mb || '', 10) || def) * 1024 * 1024;
        return {
            image: toBytes(this.configService.get('MAX_IMAGE_MB') ?? '10', 10),
            video: toBytes(this.configService.get('MAX_VIDEO_MB') ?? '100', 100),
            file: toBytes(this.configService.get('MAX_FILE_MB') ?? '25', 25),
        };
    }
    validateUploadSize(mime, size) {
        const type = this.detectAttachmentType(mime);
        const limits = this.getLimits();
        if (type === enum_1.AttachmentType.IMAGE && size > limits.image)
            throw new common_1.BadRequestException(`Image exceeds size limit (${limits.image / 1024 / 1024}MB)`);
        if (type === enum_1.AttachmentType.VIDEO && size > limits.video)
            throw new common_1.BadRequestException(`Video exceeds size limit (${limits.video / 1024 / 1024}MB)`);
        if (type !== enum_1.AttachmentType.IMAGE &&
            type !== enum_1.AttachmentType.VIDEO &&
            size > limits.file)
            throw new common_1.BadRequestException(`File exceeds size limit (${limits.file / 1024 / 1024}MB)`);
    }
    participantsFilter(a, b) {
        return {
            $or: [
                { userA: new mongoose_2.Types.ObjectId(a), userB: new mongoose_2.Types.ObjectId(b) },
                { userA: new mongoose_2.Types.ObjectId(b), userB: new mongoose_2.Types.ObjectId(a) },
            ],
        };
    }
    async createOrGetConversation(selfId, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(selfId) ||
            !mongoose_2.Types.ObjectId.isValid(dto.otherUserDehiveId)) {
            throw new common_1.BadRequestException('Invalid participant id');
        }
        const existing = await this.conversationModel.findOne({
            $or: [
                {
                    userA: new mongoose_2.Types.ObjectId(selfId),
                    userB: new mongoose_2.Types.ObjectId(dto.otherUserDehiveId),
                },
                {
                    userA: new mongoose_2.Types.ObjectId(dto.otherUserDehiveId),
                    userB: new mongoose_2.Types.ObjectId(selfId),
                },
            ],
        });
        if (existing)
            return existing;
        const doc = await this.conversationModel.create({
            userA: new mongoose_2.Types.ObjectId(selfId),
            userB: new mongoose_2.Types.ObjectId(dto.otherUserDehiveId),
        });
        return doc;
    }
    async handleUpload(selfId, file, body) {
        if (!file || typeof file !== 'object') {
            throw new common_1.BadRequestException('File is required');
        }
        const uploaded = file;
        if (!selfId || !mongoose_2.Types.ObjectId.isValid(selfId)) {
            throw new common_1.BadRequestException('Invalid or missing user_dehive_id');
        }
        if (!body.conversationId || !mongoose_2.Types.ObjectId.isValid(body.conversationId)) {
            throw new common_1.BadRequestException('Invalid conversationId');
        }
        const conv = await this.conversationModel
            .findById(body.conversationId)
            .lean();
        if (!conv) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const isParticipant = [
            conv.userA.toString(),
            conv.userB.toString(),
        ].includes(selfId);
        if (!isParticipant) {
            throw new common_1.BadRequestException('You are not a participant of this conversation');
        }
        const mime = uploaded.mimetype || 'application/octet-stream';
        const size = uploaded.size ?? 0;
        this.validateUploadSize(mime, size);
        const storage = (this.configService.get('STORAGE') || 'local').toLowerCase();
        const port = this.configService.get('DIRECT_MESSAGING_PORT') || 4004;
        const cdnBase = this.configService.get('CDN_BASE_URL_DM') ||
            `http://localhost:${port}/uploads`;
        let fileUrl = '';
        const originalName = uploaded.originalname || 'upload.bin';
        const ext = path.extname(originalName) || '';
        const safeName = `${(0, crypto_1.randomUUID)()}${ext}`;
        const uploadDir = path.resolve(process.cwd(), 'uploads');
        if (storage === 'local') {
            if (!fs.existsSync(uploadDir))
                fs.mkdirSync(uploadDir, { recursive: true });
            const dest = path.join(uploadDir, safeName);
            const buffer = Buffer.isBuffer(uploaded.buffer)
                ? uploaded.buffer
                : Buffer.from('');
            fs.writeFileSync(dest, buffer);
            fileUrl = `${cdnBase.replace(/\/$/, '')}/${safeName}`;
        }
        else {
            throw new common_1.BadRequestException('S3/MinIO storage is not implemented yet');
        }
        const type = this.detectAttachmentType(mime);
        let width, height, durationMs, thumbnailUrl;
        try {
            if (type === enum_1.AttachmentType.IMAGE) {
                const metadata = await (0, sharp_1.default)(uploaded.buffer).metadata();
                width = metadata.width;
                height = metadata.height;
            }
            else if (type === enum_1.AttachmentType.VIDEO ||
                type === enum_1.AttachmentType.AUDIO) {
                const tmpFilePath = path.join(uploadDir, safeName);
                const probeBin = (typeof ffprobe_static_1.default === 'object' && 'path' in ffprobe_static_1.default
                    ? ffprobe_static_1.default.path
                    : undefined) || 'ffprobe';
                const probe = childProcess.spawnSync(probeBin, [
                    '-v',
                    'error',
                    '-print_format',
                    'json',
                    '-show_format',
                    '-show_streams',
                    tmpFilePath,
                ], { encoding: 'utf-8' });
                if (probe.status === 0 && probe.stdout) {
                    const info = JSON.parse(probe.stdout);
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
                    let dur;
                    if (videoStream?.duration &&
                        !Number.isNaN(Number(videoStream.duration))) {
                        dur = parseFloat(videoStream.duration);
                    }
                    else if (info.format?.duration &&
                        !Number.isNaN(Number(info.format.duration))) {
                        dur = parseFloat(info.format.duration);
                    }
                    if (typeof dur === 'number' && !Number.isNaN(dur))
                        durationMs = Math.round(dur * 1000);
                    if (type === enum_1.AttachmentType.VIDEO) {
                        const thumbName = `${path.parse(safeName).name}_thumb.jpg`;
                        const thumbPath = path.join(uploadDir, thumbName);
                        const ffmpegBin = ffmpeg_static_1.default || 'ffmpeg';
                        const ffmpeg = childProcess.spawnSync(ffmpegBin, [
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
                        ], { encoding: 'utf-8' });
                        if (ffmpeg.status === 0) {
                            thumbnailUrl = `${cdnBase.replace(/\/$/, '')}/${thumbName}`;
                        }
                    }
                }
            }
        }
        catch (err) {
            console.error(`[DirectMessaging] Failed to process media metadata for ${safeName}:`, err);
        }
        const doc = await this.directuploadModel.create({
            ownerId: new mongoose_2.Types.ObjectId(selfId),
            conversationId: new mongoose_2.Types.ObjectId(body.conversationId),
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
            uploadId: doc._id.toString(),
            type: doc.type,
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
    async sendMessage(selfId, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(selfId)) {
            throw new common_1.BadRequestException('Invalid sender id');
        }
        if (!mongoose_2.Types.ObjectId.isValid(dto.conversationId)) {
            throw new common_1.BadRequestException('Invalid conversation id');
        }
        const conv = await this.conversationModel
            .findById(dto.conversationId)
            .lean();
        if (!conv)
            throw new common_1.NotFoundException('Conversation not found');
        const isParticipant = [conv.userA, conv.userB]
            .map((x) => String(x))
            .includes(selfId);
        if (!isParticipant)
            throw new common_1.BadRequestException('Not a participant');
        let attachments = [];
        if (Array.isArray(dto.uploadIds) && dto.uploadIds.length > 0) {
            const ids = dto.uploadIds.map((id) => new mongoose_2.Types.ObjectId(id));
            const uploads = await this.directuploadModel
                .find({ _id: { $in: ids }, ownerId: new mongoose_2.Types.ObjectId(selfId) })
                .lean();
            if (uploads.length !== ids.length) {
                throw new common_1.BadRequestException('You can only attach your own uploads');
            }
            attachments = uploads.map((u) => ({
                type: u.type,
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
            conversationId: new mongoose_2.Types.ObjectId(dto.conversationId),
            senderId: new mongoose_2.Types.ObjectId(selfId),
            content: dto.content,
            attachments,
        });
        return message;
    }
    async listMessages(selfId, conversationId, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(selfId))
            throw new common_1.BadRequestException('Invalid self id');
        if (!mongoose_2.Types.ObjectId.isValid(conversationId))
            throw new common_1.BadRequestException('Invalid conversation id');
        const conv = await this.conversationModel.findById(conversationId).lean();
        if (!conv)
            throw new common_1.NotFoundException('Conversation not found');
        const isParticipant = [conv.userA, conv.userB]
            .map((x) => String(x))
            .includes(selfId);
        if (!isParticipant)
            throw new common_1.BadRequestException('Not a participant');
        const page = dto.page || 1;
        const limit = dto.limit || 50;
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.messageModel
                .find({ conversationId: new mongoose_2.Types.ObjectId(conversationId) })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.messageModel.countDocuments({
                conversationId: new mongoose_2.Types.ObjectId(conversationId),
            }),
        ]);
        return { page, limit, total, items };
    }
    async editMessage(selfId, messageId, content) {
        if (!mongoose_2.Types.ObjectId.isValid(selfId))
            throw new common_1.BadRequestException('Invalid self id');
        if (!mongoose_2.Types.ObjectId.isValid(messageId))
            throw new common_1.BadRequestException('Invalid message id');
        if (typeof content !== 'string')
            throw new common_1.BadRequestException('Content must be a string');
        const message = await this.messageModel.findById(messageId);
        if (!message)
            throw new common_1.NotFoundException('Message not found');
        if (String(message.senderId) !== selfId)
            throw new common_1.BadRequestException('You can only edit your own message');
        if (message.isDeleted)
            throw new common_1.BadRequestException('Cannot edit a deleted message');
        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();
        return message.toJSON();
    }
    async deleteMessage(selfId, messageId) {
        if (!mongoose_2.Types.ObjectId.isValid(selfId))
            throw new common_1.BadRequestException('Invalid self id');
        if (!mongoose_2.Types.ObjectId.isValid(messageId))
            throw new common_1.BadRequestException('Invalid message id');
        const message = await this.messageModel.findById(messageId);
        if (!message)
            throw new common_1.NotFoundException('Message not found');
        if (String(message.senderId) !== selfId)
            throw new common_1.BadRequestException('You can only delete your own message');
        if (message.isDeleted)
            return message.toJSON();
        message.isDeleted = true;
        message.content = '[deleted]';
        message.attachments = [];
        await message.save();
        return message.toJSON();
    }
    async listUploads(selfId, dto) {
        if (!selfId || !mongoose_2.Types.ObjectId.isValid(selfId)) {
            throw new common_1.BadRequestException('Invalid user id');
        }
        const page = dto.page > 0 ? dto.page : 1;
        const limit = dto.limit > 0 ? Math.min(dto.limit, 100) : 50;
        const skip = (page - 1) * limit;
        const query = {
            ownerId: new mongoose_2.Types.ObjectId(selfId),
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
};
exports.DirectMessagingService = DirectMessagingService;
exports.DirectMessagingService = DirectMessagingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(direct_conversation_schema_1.DirectConversation.name)),
    __param(1, (0, mongoose_1.InjectModel)(direct_message_schema_1.DirectMessage.name)),
    __param(2, (0, mongoose_1.InjectModel)(direct_upload_schema_1.DirectUpload.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService])
], DirectMessagingService);
//# sourceMappingURL=direct-messaging.service.js.map
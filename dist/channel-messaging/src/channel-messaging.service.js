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
exports.MessagingService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const path = require("path");
const auth_service_client_1 = require("./auth-service.client");
const crypto_1 = require("crypto");
const channel_message_schema_1 = require("../schemas/channel-message.schema");
const channel_conversation_schema_1 = require("../schemas/channel-conversation.schema");
const upload_schema_1 = require("../schemas/upload.schema");
const enum_1 = require("../enum/enum");
const sharp_1 = require("sharp");
const childProcess = require("child_process");
const ffmpeg_static_1 = require("ffmpeg-static");
const ffprobe_static_1 = require("ffprobe-static");
const user_dehive_server_schema_1 = require("../../user-dehive-server/schemas/user-dehive-server.schema");
const user_dehive_schema_1 = require("../../user-dehive-server/schemas/user-dehive.schema");
let MessagingService = class MessagingService {
    channelMessageModel;
    channelConversationModel;
    uploadModel;
    userDehiveServerModel;
    userDehiveModel;
    configService;
    authClient;
    constructor(channelMessageModel, channelConversationModel, uploadModel, userDehiveServerModel, userDehiveModel, configService, authClient) {
        this.channelMessageModel = channelMessageModel;
        this.channelConversationModel = channelConversationModel;
        this.uploadModel = uploadModel;
        this.userDehiveServerModel = userDehiveServerModel;
        this.userDehiveModel = userDehiveModel;
        this.configService = configService;
        this.authClient = authClient;
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
            throw new common_1.BadRequestException(`Image exceeds size limit (${limits.image} bytes)`);
        if (type === enum_1.AttachmentType.VIDEO && size > limits.video)
            throw new common_1.BadRequestException(`Video exceeds size limit (${limits.video} bytes)`);
        if (type !== enum_1.AttachmentType.IMAGE &&
            type !== enum_1.AttachmentType.VIDEO &&
            size > limits.file)
            throw new common_1.BadRequestException(`File exceeds size limit (${limits.file} bytes)`);
    }
    async handleUpload(file, body, userId) {
        if (!file || typeof file !== 'object')
            throw new common_1.BadRequestException('File is required');
        const uploaded = file;
        const mime = uploaded.mimetype || 'application/octet-stream';
        const size = uploaded.size ?? 0;
        this.validateUploadSize(mime, size);
        if (!body.serverId) {
            throw new common_1.BadRequestException('serverId is required');
        }
        if (!mongoose_2.Types.ObjectId.isValid(body.serverId)) {
            throw new common_1.BadRequestException('Invalid serverId');
        }
        if (!body.conversationId) {
            throw new common_1.BadRequestException('conversationId is required');
        }
        if (!mongoose_2.Types.ObjectId.isValid(body.conversationId)) {
            throw new common_1.BadRequestException('Invalid conversationId');
        }
        if (!userId || !mongoose_2.Types.ObjectId.isValid(userId)) {
            throw new common_1.BadRequestException('Invalid or missing user_dehive_id');
        }
        const isMember = await this.userDehiveServerModel.exists({
            user_dehive_id: new mongoose_2.Types.ObjectId(userId),
            server_id: new mongoose_2.Types.ObjectId(body.serverId),
        });
        if (!isMember) {
            throw new common_1.BadRequestException('User is not a member of this server');
        }
        const conversation = await this.channelConversationModel.findById(body.conversationId);
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const storage = (this.configService.get('STORAGE') || 'local').toLowerCase();
        const cdnBase = this.configService.get('CDN_BASE_URL') ||
            'http://localhost:4003/uploads';
        let fileUrl = '';
        const originalName = uploaded.originalname || 'upload.bin';
        const ext = path.extname(originalName) || '';
        const safeName = `${(0, crypto_1.randomUUID)()}${ext}`;
        if (storage === 'local') {
            const uploadDir = path.resolve(process.cwd(), 'uploads');
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
            throw new common_1.BadRequestException('S3/MinIO not implemented yet');
        }
        const type = this.detectAttachmentType(mime);
        let width;
        let height;
        let durationMs;
        let thumbnailUrl;
        try {
            if (type === enum_1.AttachmentType.IMAGE) {
                const inputBuffer = uploaded.buffer || Buffer.alloc(0);
                const metadata = await (0, sharp_1.default)(inputBuffer).metadata();
                width = metadata.width;
                height = metadata.height;
            }
            else if (type === enum_1.AttachmentType.VIDEO ||
                type === enum_1.AttachmentType.AUDIO) {
                const probeMeta = ffprobe_static_1.default;
                const probeBin = (typeof probeMeta === 'object' && probeMeta?.path) ||
                    (typeof probeMeta === 'string' ? probeMeta : 'ffprobe');
                const tmpFilePath = path.resolve(process.cwd(), 'uploads', safeName);
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
                    const info = JSON.parse(String(probe.stdout));
                    const videoStream = info.streams?.find((s) => s.codec_type === 'video');
                    if (videoStream) {
                        width = videoStream.width;
                        height = videoStream.height;
                    }
                    const dur = (videoStream?.duration && parseFloat(videoStream.duration)) ||
                        (info.format?.duration && parseFloat(info.format.duration)) ||
                        undefined;
                    if (dur && !Number.isNaN(dur))
                        durationMs = Math.round(dur * 1000);
                    if (type === enum_1.AttachmentType.VIDEO) {
                        const thumbName = `${safeName.replace(ext, '')}_thumb.jpg`;
                        const thumbPath = path.resolve(process.cwd(), 'uploads', thumbName);
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
        catch {
        }
        const doc = await this.uploadModel.create({
            ownerId: userId && mongoose_2.Types.ObjectId.isValid(userId)
                ? new mongoose_2.Types.ObjectId(userId)
                : new mongoose_2.Types.ObjectId(),
            serverId: body.serverId ? new mongoose_2.Types.ObjectId(body.serverId) : undefined,
            channelId: conversation.channelId,
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
    async createMessage(createMessageDto, senderId) {
        let attachments = [];
        if (Array.isArray(createMessageDto.uploadIds) &&
            createMessageDto.uploadIds.length > 0) {
            const validIds = createMessageDto.uploadIds.filter((id) => mongoose_2.Types.ObjectId.isValid(id));
            if (validIds.length !== createMessageDto.uploadIds.length) {
                throw new common_1.BadRequestException('One or more uploadIds are invalid');
            }
            const uploadObjectIds = validIds.map((id) => new mongoose_2.Types.ObjectId(id));
            const uploads = await this.uploadModel
                .find({
                _id: { $in: uploadObjectIds },
                ownerId: new mongoose_2.Types.ObjectId(senderId),
            })
                .lean();
            if (uploads.length !== uploadObjectIds.length) {
                throw new common_1.BadRequestException('You can only attach files that you uploaded');
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
        const conversation = await this.channelConversationModel.findById(createMessageDto.conversationId);
        if (!conversation) {
            throw new common_1.BadRequestException('Invalid conversationId');
        }
        const newMessage = new this.channelMessageModel({
            content: createMessageDto.content,
            attachments,
            senderId: new mongoose_2.Types.ObjectId(senderId),
            channelId: conversation.channelId,
            conversationId: conversation._id,
        });
        return newMessage.save();
    }
    async getOrCreateConversationByChannelId(channelId) {
        if (!mongoose_2.Types.ObjectId.isValid(channelId)) {
            throw new common_1.BadRequestException('Invalid channelId');
        }
        const conversation = await this.channelConversationModel.findOneAndUpdate({ channelId: new mongoose_2.Types.ObjectId(channelId) }, {
            $setOnInsert: {
                channelId: new mongoose_2.Types.ObjectId(channelId),
            },
        }, { upsert: true, new: true });
        return conversation;
    }
    async getMessagesByConversationId(conversationId, getMessagesDto) {
        const { page = 1, limit = 50 } = getMessagesDto;
        const skip = (page - 1) * limit;
        if (!mongoose_2.Types.ObjectId.isValid(conversationId)) {
            throw new common_1.BadRequestException('Invalid conversationId');
        }
        const messages = await this.channelMessageModel
            .find({ conversationId: new mongoose_2.Types.ObjectId(conversationId) })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
            path: 'senderId',
            model: 'UserDehive',
            select: '_id',
        })
            .lean();
        if (!messages || messages.length === 0) {
            return [];
        }
        const userIds = messages
            .map((m) => {
            const sender = m.senderId;
            return sender?._id?.toString();
        })
            .filter((id) => Boolean(id));
        const profiles = await this.authClient.batchGetProfiles(userIds);
        return messages.map((msg) => {
            const sender = msg.senderId;
            const userId = sender?._id?.toString() || '';
            const profile = profiles[userId] || {
                username: 'Unknown User',
                display_name: 'Unknown User',
                avatar: null,
            };
            return {
                _id: msg._id,
                content: msg.content,
                conversationId: msg.conversationId,
                channelId: msg.channelId,
                senderId: sender?._id,
                sender: {
                    user_id: userId,
                    user_dehive_id: sender?._id?.toString() || '',
                    username: profile.username,
                    display_name: profile.display_name || profile.username,
                    avatar: profile.avatar,
                },
                attachments: msg.attachments,
                isEdited: msg.isEdited,
                editedAt: msg.editedAt,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt,
            };
        });
    }
    async editMessage(messageId, editorUserDehiveId, newContent) {
        if (!mongoose_2.Types.ObjectId.isValid(messageId)) {
            throw new common_1.BadRequestException('Invalid message id');
        }
        if (!mongoose_2.Types.ObjectId.isValid(editorUserDehiveId)) {
            throw new common_1.BadRequestException('Invalid user id');
        }
        if (typeof newContent !== 'string') {
            throw new common_1.BadRequestException('Content must be a string');
        }
        const msg = await this.channelMessageModel.findById(messageId);
        if (!msg)
            throw new common_1.NotFoundException('Message not found');
        if (String(msg.senderId) !== editorUserDehiveId) {
            throw new common_1.BadRequestException('You can only edit your own message');
        }
        msg.content = newContent;
        msg.isEdited = true;
        msg.editedAt = new Date();
        await msg.save();
        return msg;
    }
    async deleteMessage(messageId, requesterUserDehiveId) {
        if (!mongoose_2.Types.ObjectId.isValid(messageId)) {
            throw new common_1.BadRequestException('Invalid message id');
        }
        if (!mongoose_2.Types.ObjectId.isValid(requesterUserDehiveId)) {
            throw new common_1.BadRequestException('Invalid user id');
        }
        const msg = await this.channelMessageModel.findById(messageId);
        if (!msg)
            throw new common_1.NotFoundException('Message not found');
        if (String(msg.senderId) !== requesterUserDehiveId) {
            throw new common_1.BadRequestException('You can only delete your own message');
        }
        msg.isDeleted = true;
        msg.content = '[deleted]';
        msg.attachments = [];
        await msg.save();
        return msg;
    }
    async listUploads(params) {
        const { serverId, userId, type, page, limit } = params;
        if (!serverId || !mongoose_2.Types.ObjectId.isValid(serverId)) {
            throw new common_1.BadRequestException('Invalid serverId');
        }
        if (!userId || !mongoose_2.Types.ObjectId.isValid(userId)) {
            throw new common_1.BadRequestException('Invalid user_dehive_id');
        }
        const membership = await this.userDehiveServerModel.exists({
            user_dehive_id: new mongoose_2.Types.ObjectId(userId),
            server_id: new mongoose_2.Types.ObjectId(serverId),
        });
        if (!membership) {
            throw new common_1.BadRequestException('User is not a member of this server');
        }
        const query = {
            serverId: new mongoose_2.Types.ObjectId(serverId),
        };
        query.ownerId = new mongoose_2.Types.ObjectId(userId);
        if (type) {
            const allowed = new Set([
                enum_1.AttachmentType.IMAGE,
                enum_1.AttachmentType.VIDEO,
                enum_1.AttachmentType.AUDIO,
                enum_1.AttachmentType.FILE,
            ]);
            if (!allowed.has(type)) {
                throw new common_1.BadRequestException('Invalid type');
            }
            query.type = type;
        }
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.uploadModel
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.uploadModel.countDocuments(query),
        ]);
        return {
            page,
            limit,
            total,
            items: items.map((u) => ({
                _id: u._id,
                type: u.type,
                url: u.url,
                name: u.name,
                size: u.size,
                mimeType: u.mimeType,
                width: u.width,
                height: u.height,
                durationMs: u.durationMs,
                thumbnailUrl: u.thumbnailUrl,
                createdAt: u?.createdAt,
            })),
        };
    }
};
exports.MessagingService = MessagingService;
exports.MessagingService = MessagingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(channel_message_schema_1.ChannelMessage.name)),
    __param(1, (0, mongoose_1.InjectModel)(channel_conversation_schema_1.ChannelConversation.name)),
    __param(2, (0, mongoose_1.InjectModel)(upload_schema_1.Upload.name)),
    __param(3, (0, mongoose_1.InjectModel)(user_dehive_server_schema_1.UserDehiveServer.name)),
    __param(4, (0, mongoose_1.InjectModel)(user_dehive_schema_1.UserDehive.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        auth_service_client_1.AuthServiceClient])
], MessagingService);
//# sourceMappingURL=channel-messaging.service.js.map
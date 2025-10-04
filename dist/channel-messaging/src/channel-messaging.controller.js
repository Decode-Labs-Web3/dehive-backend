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
exports.MessagingController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const channel_messaging_service_1 = require("./channel-messaging.service");
const get_messages_dto_1 = require("../dto/get-messages.dto");
const channel_upload_dto_1 = require("../dto/channel-upload.dto");
const list_channel_upload_dto_1 = require("../dto/list-channel-upload.dto");
const create_message_dto_1 = require("../dto/create-message.dto");
const auth_guard_1 = require("../common/guards/auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const common_2 = require("@nestjs/common");
let MessagingController = class MessagingController {
    messagingService;
    constructor(messagingService) {
        this.messagingService = messagingService;
    }
    async sendMessage(userId, createMessageDto) {
        const savedMessage = await this.messagingService.createMessage(createMessageDto, userId);
        return {
            success: true,
            statusCode: 201,
            message: 'Message sent successfully',
            data: savedMessage,
        };
    }
    getMessages(conversationId, query) {
        return this.messagingService
            .getMessagesByConversationId(conversationId, query)
            .then((messages) => ({
            success: true,
            statusCode: 200,
            message: 'Fetched conversation messages successfully',
            data: messages,
        }));
    }
    async upload(file, body, userId) {
        const result = await this.messagingService.handleUpload(file, body, userId);
        return {
            success: true,
            statusCode: 201,
            message: 'File uploaded successfully',
            data: result,
        };
    }
    async listUploads(userId, query) {
        const result = await this.messagingService.listUploads({
            serverId: query.serverId,
            userId,
            type: query.type,
            page: query.page,
            limit: query.limit,
        });
        return {
            success: true,
            statusCode: 200,
            message: 'Fetched uploads successfully',
            data: result,
        };
    }
};
exports.MessagingController = MessagingController;
__decorate([
    (0, common_1.Post)('send'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message to a channel conversation' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiBody)({ type: create_message_dto_1.CreateMessageDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Message sent successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or missing fields.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'User is not allowed to post in this channel (future implementation).',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Conversation not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_message_dto_1.CreateMessageDto]),
    __metadata("design:returntype", Promise)
], MessagingController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('conversation/:conversationId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get paginated messages for a conversation' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({
        name: 'conversationId',
        description: 'The ID of the channel conversation to retrieve messages from',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns a list of messages.' }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'No messages found for the channel.',
    }),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, get_messages_dto_1.GetMessagesDto]),
    __metadata("design:returntype", void 0)
], MessagingController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('files/upload'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a file and return metadata' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                serverId: { type: 'string', description: 'Server ID (MongoId)' },
                conversationId: {
                    type: 'string',
                    description: ' Channel Conversation ID (MongoId)',
                },
            },
            required: ['file', 'serverId', 'conversationId'],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'File uploaded successfully.',
        type: channel_upload_dto_1.UploadResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Missing header, invalid/missing serverId, not a member, or size/type exceeds limits.',
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, channel_upload_dto_1.UploadInitDto, String]),
    __metadata("design:returntype", Promise)
], MessagingController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)('files/list'),
    (0, swagger_1.ApiOperation)({ summary: 'List previously uploaded files (gallery)' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns paginated uploads.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid query or header.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Not allowed.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, list_channel_upload_dto_1.ListUploadsDto]),
    __metadata("design:returntype", Promise)
], MessagingController.prototype, "listUploads", null);
exports.MessagingController = MessagingController = __decorate([
    (0, swagger_1.ApiTags)('Channel Messages'),
    (0, common_1.Controller)('messages'),
    (0, common_2.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [channel_messaging_service_1.MessagingService])
], MessagingController);
//# sourceMappingURL=channel-messaging.controller.js.map
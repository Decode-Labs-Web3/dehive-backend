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
exports.DirectMessagingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const direct_messaging_service_1 = require("./direct-messaging.service");
const create_or_get_conversation_dto_ts_1 = require("../dto/create-or-get-conversation.dto.ts");
const direct_upload_dto_1 = require("../dto/direct-upload.dto");
const list_direct_messages_dto_1 = require("../dto/list-direct-messages.dto");
const list_direct_upload_dto_1 = require("../dto/list-direct-upload.dto");
const send_direct_message_dto_1 = require("../dto/send-direct-message.dto");
const auth_guard_1 = require("../common/guards/auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let DirectMessagingController = class DirectMessagingController {
    service;
    constructor(service) {
        this.service = service;
    }
    async sendMessage(selfId, body) {
        const newMessage = await this.service.sendMessage(selfId, body);
        return {
            success: true,
            statusCode: 201,
            message: 'Message sent successfully',
            data: newMessage,
        };
    }
    async createOrGet(selfId, body) {
        const conv = await this.service.createOrGetConversation(selfId, body);
        return { success: true, statusCode: 200, message: 'OK', data: conv };
    }
    async list(selfId, conversationId, query) {
        const data = await this.service.listMessages(selfId, conversationId, query);
        return { success: true, statusCode: 200, message: 'OK', data };
    }
    async uploadFile(file, body, selfId) {
        const result = await this.service.handleUpload(selfId, file, body);
        return {
            success: true,
            statusCode: 201,
            message: 'File uploaded successfully',
            data: result,
        };
    }
    async listUploads(selfId, query) {
        const data = await this.service.listUploads(selfId, query);
        return { success: true, statusCode: 200, message: 'OK', data };
    }
};
exports.DirectMessagingController = DirectMessagingController;
__decorate([
    (0, common_1.Post)('send'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message to a direct conversation' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'The session ID of the authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiBody)({ type: send_direct_message_dto_1.SendDirectMessageDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Message sent successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or missing fields.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'User is not a participant of this conversation.',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Conversation not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, send_direct_message_dto_1.SendDirectMessageDto]),
    __metadata("design:returntype", Promise)
], DirectMessagingController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('conversation'),
    (0, swagger_1.ApiOperation)({ summary: 'Create or get a 1:1 conversation' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_or_get_conversation_dto_ts_1.CreateOrGetConversationDto]),
    __metadata("design:returntype", Promise)
], DirectMessagingController.prototype, "createOrGet", null);
__decorate([
    (0, common_1.Get)('messages/:conversationId'),
    (0, swagger_1.ApiOperation)({ summary: 'List messages in a conversation' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'conversationId' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('conversationId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, list_direct_messages_dto_1.ListDirectMessagesDto]),
    __metadata("design:returntype", Promise)
], DirectMessagingController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('files/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a file to a direct conversation' }),
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
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'The file to upload.',
                },
                conversationId: {
                    type: 'string',
                    description: 'The ID of the direct conversation the file belongs to.',
                },
            },
            required: ['file', 'conversationId'],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'File uploaded successfully and metadata returned.',
        type: direct_upload_dto_1.DirectUploadResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Bad request, missing file, invalid ID, or file size exceeds limit.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'User is not a participant of the conversation.',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Conversation not found.' }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, direct_upload_dto_1.DirectUploadInitDto, String]),
    __metadata("design:returntype", Promise)
], DirectMessagingController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Get)('files/list'),
    (0, swagger_1.ApiOperation)({ summary: 'List files uploaded by the current user in DMs' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Successfully returned a list of uploaded files.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid user ID or pagination parameters.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, list_direct_upload_dto_1.ListDirectUploadsDto]),
    __metadata("design:returntype", Promise)
], DirectMessagingController.prototype, "listUploads", null);
exports.DirectMessagingController = DirectMessagingController = __decorate([
    (0, swagger_1.ApiTags)('Direct Messages'),
    (0, common_1.Controller)('dm'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [direct_messaging_service_1.DirectMessagingService])
], DirectMessagingController);
//# sourceMappingURL=direct-messaging.controller.js.map
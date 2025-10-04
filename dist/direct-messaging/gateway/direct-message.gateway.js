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
exports.DmGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const mongoose_1 = require("mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const direct_messaging_service_1 = require("../src/direct-messaging.service");
const send_direct_message_dto_1 = require("../dto/send-direct-message.dto");
const user_dehive_schema_1 = require("../../user-dehive-server/schemas/user-dehive.schema");
const direct_conversation_schema_1 = require("../schemas/direct-conversation.schema");
let DmGateway = class DmGateway {
    service;
    userDehiveModel;
    conversationModel;
    server;
    meta = new WeakMap();
    constructor(service, userDehiveModel, conversationModel) {
        this.service = service;
        this.userDehiveModel = userDehiveModel;
        this.conversationModel = conversationModel;
    }
    send(client, event, data) {
        client.emit(event, data);
    }
    handleConnection(client) {
        console.log('[DM-WS] Client connected. Awaiting identity.');
        this.meta.set(client, {});
    }
    handleDisconnect(client) {
        const meta = this.meta.get(client);
        if (meta?.userDehiveId) {
            console.log(`[DM-WS] User ${meta.userDehiveId} disconnected.`);
        }
        this.meta.delete(client);
    }
    async handleIdentity(userDehiveId, client) {
        if (!userDehiveId || !mongoose_1.Types.ObjectId.isValid(userDehiveId)) {
            return this.send(client, 'error', { message: 'Invalid userDehiveId' });
        }
        const exists = await this.userDehiveModel.exists({
            _id: new mongoose_1.Types.ObjectId(userDehiveId),
        });
        if (!exists) {
            return this.send(client, 'error', { message: 'User not found' });
        }
        const meta = this.meta.get(client);
        if (meta) {
            meta.userDehiveId = userDehiveId;
            void client.join(`user:${userDehiveId}`);
            console.log(`[DM-WS] User identified as ${userDehiveId}`);
            this.send(client, 'identityConfirmed', { userDehiveId });
        }
    }
    async handleSendMessage(data, client) {
        const meta = this.meta.get(client);
        const selfId = meta?.userDehiveId;
        if (!selfId) {
            return this.send(client, 'error', { message: 'Please identify first' });
        }
        try {
            if (typeof data.content !== 'string') {
                return this.send(client, 'error', {
                    message: 'Content must be a string (0-2000 chars).',
                });
            }
            if (String(data.content ?? '').length > 2000) {
                return this.send(client, 'error', {
                    message: 'Content must not exceed 2000 characters.',
                });
            }
            if (!Array.isArray(data.uploadIds)) {
                return this.send(client, 'error', {
                    message: 'uploadIds is required and must be an array',
                });
            }
            if (data.uploadIds.length > 0) {
                const allValid = data.uploadIds.every((id) => {
                    return typeof id === 'string' && mongoose_1.Types.ObjectId.isValid(id);
                });
                if (!allValid) {
                    return this.send(client, 'error', {
                        message: 'One or more uploadIds are invalid',
                    });
                }
            }
            const savedMessage = await this.service.sendMessage(selfId, data);
            const conv = await this.conversationModel
                .findById(data.conversationId)
                .lean();
            if (!conv) {
                return this.send(client, 'error', {
                    message: 'Conversation not found',
                });
            }
            const recipientId = String(conv.userA) === selfId ? String(conv.userB) : String(conv.userA);
            const messageToBroadcast = {
                _id: savedMessage._id,
                conversationId: savedMessage.conversationId,
                senderId: savedMessage.senderId,
                content: savedMessage.content,
                attachments: savedMessage.attachments,
                createdAt: savedMessage.get('createdAt'),
            };
            this.server
                .to(`user:${recipientId}`)
                .to(`user:${selfId}`)
                .emit('newMessage', messageToBroadcast);
        }
        catch (error) {
            console.error('[DM-WS] Error handling message:', error);
            this.send(client, 'error', {
                message: 'Failed to send message',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async handleEditMessage(data, client) {
        const meta = this.meta.get(client);
        const selfId = meta?.userDehiveId;
        if (!selfId)
            return this.send(client, 'error', { message: 'Please identify first' });
        try {
            const updated = await this.service.editMessage(selfId, data?.messageId, data?.content ?? '');
            const conv = await this.conversationModel
                .findById(updated.conversationId)
                .lean();
            if (!conv)
                return;
            const recipientId = String(conv.userA) === selfId ? String(conv.userB) : String(conv.userA);
            const payload = {
                _id: updated._id,
                messageId: updated._id,
                conversationId: updated.conversationId,
                content: updated.content,
                isEdited: true,
                editedAt: updated.editedAt,
            };
            this.server
                .to(`user:${recipientId}`)
                .to(`user:${selfId}`)
                .emit('messageEdited', payload);
        }
        catch (error) {
            this.send(client, 'error', {
                message: 'Failed to edit message',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async handleDeleteMessage(data, client) {
        const meta = this.meta.get(client);
        const selfId = meta?.userDehiveId;
        if (!selfId)
            return this.send(client, 'error', { message: 'Please identify first' });
        try {
            const updated = await this.service.deleteMessage(selfId, data?.messageId);
            const conv = await this.conversationModel
                .findById(updated.conversationId)
                .lean();
            if (!conv)
                return;
            const recipientId = String(conv.userA) === selfId ? String(conv.userB) : String(conv.userA);
            const payload = {
                _id: updated._id,
                messageId: updated._id,
                conversationId: updated.conversationId,
                isDeleted: true,
            };
            this.server
                .to(`user:${recipientId}`)
                .to(`user:${selfId}`)
                .emit('messageDeleted', payload);
        }
        catch (error) {
            this.send(client, 'error', {
                message: 'Failed to delete message',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
};
exports.DmGateway = DmGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], DmGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('identity'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], DmGateway.prototype, "handleIdentity", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_direct_message_dto_1.SendDirectMessageDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], DmGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('editMessage'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], DmGateway.prototype, "handleEditMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('deleteMessage'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], DmGateway.prototype, "handleDeleteMessage", null);
exports.DmGateway = DmGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
    }),
    __param(1, (0, mongoose_2.InjectModel)(user_dehive_schema_1.UserDehive.name)),
    __param(2, (0, mongoose_2.InjectModel)(direct_conversation_schema_1.DirectConversation.name)),
    __metadata("design:paramtypes", [direct_messaging_service_1.DirectMessagingService,
        mongoose_1.Model,
        mongoose_1.Model])
], DmGateway);
//# sourceMappingURL=direct-message.gateway.js.map
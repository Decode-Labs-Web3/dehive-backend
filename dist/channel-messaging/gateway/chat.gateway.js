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
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const create_message_dto_1 = require("../dto/create-message.dto");
const channel_messaging_service_1 = require("../src/channel-messaging.service");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_dehive_schema_1 = require("../../user-dehive-server/schemas/user-dehive.schema");
const server_schema_1 = require("../../server/schemas/server.schema");
const category_schema_1 = require("../../server/schemas/category.schema");
const channel_schema_1 = require("../../server/schemas/channel.schema");
const user_dehive_server_schema_1 = require("../../user-dehive-server/schemas/user-dehive-server.schema");
const channel_conversation_schema_1 = require("../schemas/channel-conversation.schema");
let ChatGateway = class ChatGateway {
    messagingService;
    userDehiveModel;
    serverModel;
    categoryModel;
    channelModel;
    userDehiveServerModel;
    channelConversationModel;
    server;
    constructor(messagingService, userDehiveModel, serverModel, categoryModel, channelModel, userDehiveServerModel, channelConversationModel) {
        this.messagingService = messagingService;
        this.userDehiveModel = userDehiveModel;
        this.serverModel = serverModel;
        this.categoryModel = categoryModel;
        this.channelModel = channelModel;
        this.userDehiveServerModel = userDehiveServerModel;
        this.channelConversationModel = channelConversationModel;
    }
    meta = new WeakMap();
    send(client, event, data) {
        client.emit(event, data);
    }
    handleConnection(client) {
        console.log('[WebSocket] Client connected. Awaiting identity.');
        this.meta.set(client, {});
    }
    handleDisconnect(client) {
        console.log('[WebSocket] Client disconnected.');
        const meta = this.meta.get(client);
        if (meta)
            this.meta.delete(client);
    }
    async handleIdentity(userDehiveId, client) {
        if (!userDehiveId || typeof userDehiveId !== 'string') {
            return this.send(client, 'error', {
                message: 'Invalid identity payload. Please send a string userDehiveId.',
            });
        }
        const meta = this.meta.get(client);
        if (!meta)
            return;
        if (!mongoose_2.Types.ObjectId.isValid(userDehiveId)) {
            return this.send(client, 'error', {
                message: 'Invalid userDehiveId format.',
            });
        }
        const exists = await this.userDehiveModel.exists({
            _id: new mongoose_2.Types.ObjectId(userDehiveId),
        });
        if (!exists) {
            return this.send(client, 'error', {
                message: 'UserDehive not found.',
            });
        }
        console.log(`[WebSocket] Client is identifying as UserDehive ID: ${userDehiveId}`);
        meta.userDehiveId = userDehiveId;
        this.send(client, 'identityConfirmed', `You are now identified as ${userDehiveId}`);
    }
    async handleJoinChannel(data, client) {
        const meta = this.meta.get(client);
        if (!meta?.userDehiveId) {
            return this.send(client, 'error', {
                message: 'Please identify yourself first by sending an "identity" event.',
            });
        }
        const { serverId, categoryId, channelId } = data;
        if (!serverId ||
            !categoryId ||
            !channelId ||
            !mongoose_2.Types.ObjectId.isValid(serverId) ||
            !mongoose_2.Types.ObjectId.isValid(categoryId) ||
            !mongoose_2.Types.ObjectId.isValid(channelId)) {
            return this.send(client, 'error', {
                message: 'Invalid payload. serverId, categoryId, and channelId are required and must be valid ObjectIds.',
            });
        }
        try {
            const isMember = await this.userDehiveServerModel.findOne({
                user_dehive_id: new mongoose_2.Types.ObjectId(meta.userDehiveId),
                server_id: new mongoose_2.Types.ObjectId(serverId),
            });
            if (!isMember) {
                return this.send(client, 'error', {
                    message: 'Access denied. You are not a member of this server.',
                });
            }
            const channel = await this.channelModel.findById(channelId);
            if (!channel || channel.category_id.toString() !== categoryId) {
                return this.send(client, 'error', {
                    message: 'Channel not found or does not belong to the specified category.',
                });
            }
            const category = await this.categoryModel.findById(categoryId);
            if (!category || category.server_id.toString() !== serverId) {
                return this.send(client, 'error', {
                    message: 'Category not found or does not belong to the specified server.',
                });
            }
            const conversation = await this.channelConversationModel.findOneAndUpdate({ channelId: new mongoose_2.Types.ObjectId(channelId) }, { $setOnInsert: { channel_id: new mongoose_2.Types.ObjectId(channelId) } }, { upsert: true, new: true, runValidators: true });
            const conversationId = String(conversation._id);
            await client.join(conversationId);
            this.send(client, 'joinedChannel', {
                conversationId,
                message: 'Joined channel room successfully',
            });
        }
        catch (error) {
            console.error('[WebSocket] Error handling joinChannel:', error);
            this.send(client, 'error', {
                message: 'Failed to join channel.',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
    handleJoinConversation(payload, client) {
        const meta = this.meta.get(client);
        if (!meta?.userDehiveId) {
            return this.send(client, 'error', {
                message: 'Please identify yourself first by sending an "identity" event.',
            });
        }
        let conversationId = '';
        if (typeof payload === 'string') {
            conversationId = payload;
        }
        else if (payload && typeof payload === 'object') {
            conversationId = payload.conversationId;
        }
        if (!mongoose_2.Types.ObjectId.isValid(conversationId)) {
            return this.send(client, 'error', {
                message: 'Invalid conversationId.',
            });
        }
        console.log(`[WebSocket] User ${meta.userDehiveId} joined conversation room: ${conversationId}`);
        void client.join(conversationId);
        this.send(client, 'joinedConversation', {
            conversationId,
            message: `You have successfully joined conversation ${conversationId}`,
        });
    }
    async handleMessage(data, client) {
        const meta = this.meta.get(client);
        if (!meta?.userDehiveId) {
            return this.send(client, 'error', {
                message: 'Please identify yourself before sending a message.',
            });
        }
        try {
            if (!data || typeof data !== 'object') {
                return this.send(client, 'error', {
                    message: 'Invalid payload.',
                });
            }
            const convId = data.conversationId;
            if (!convId || !mongoose_2.Types.ObjectId.isValid(convId)) {
                return this.send(client, 'error', {
                    message: 'Invalid conversationId.',
                });
            }
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
                    return typeof id === 'string' && mongoose_2.Types.ObjectId.isValid(id);
                });
                if (!allValid) {
                    return this.send(client, 'error', {
                        message: 'One or more uploadIds are invalid',
                    });
                }
            }
            console.log(`[WebSocket] Received message from User ${meta.userDehiveId} for conversation ${convId}`);
            const savedMessage = await this.messagingService.createMessage(data, meta.userDehiveId);
            const populatedMessage = await savedMessage.populate({
                path: 'senderId',
                model: 'UserDehive',
                populate: {
                    path: 'user_id',
                    model: 'User',
                    select: 'username',
                },
            });
            const messageToBroadcast = {
                _id: populatedMessage._id,
                sender: {
                    dehive_id: populatedMessage.senderId._id,
                    username: 'User',
                },
                content: populatedMessage.content,
                attachments: populatedMessage.attachments,
                conversationId: populatedMessage.conversationId?.toString?.(),
                createdAt: populatedMessage.createdAt,
                isEdited: populatedMessage.isEdited,
            };
            this.server
                .to(String(data.conversationId))
                .emit('newMessage', messageToBroadcast);
        }
        catch (error) {
            console.error('[WebSocket] Error handling message:', error);
            this.send(client, 'error', {
                message: 'Failed to send message.',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async handleEditMessage(data, client) {
        const meta = this.meta.get(client);
        if (!meta?.userDehiveId) {
            return this.send(client, 'error', {
                message: 'Please identify yourself before editing.',
            });
        }
        try {
            const updated = await this.messagingService.editMessage(data.messageId, meta.userDehiveId, data.content);
            const payload = {
                _id: updated._id,
                content: updated.content,
                isEdited: true,
                editedAt: updated.editedAt,
                conversationId: updated.conversationId.toString(),
            };
            this.server
                .to(String(payload.conversationId))
                .emit('messageEdited', payload);
        }
        catch (error) {
            this.send(client, 'error', {
                message: 'Failed to edit message.',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async handleDeleteMessage(data, client) {
        const meta = this.meta.get(client);
        if (!meta?.userDehiveId) {
            return this.send(client, 'error', {
                message: 'Please identify yourself before deleting.',
            });
        }
        try {
            const updated = await this.messagingService.deleteMessage(data.messageId, meta.userDehiveId);
            const payload = {
                _id: updated._id,
                isDeleted: true,
                conversationId: updated.conversationId.toString(),
            };
            this.server
                .to(String(payload.conversationId))
                .emit('messageDeleted', payload);
        }
        catch (error) {
            this.send(client, 'error', {
                message: 'Failed to delete message.',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('identity'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleIdentity", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinChannel'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinChannel", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinConversation'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_message_dto_1.CreateMessageDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('editMessage'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleEditMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('deleteMessage'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleDeleteMessage", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __param(1, (0, mongoose_1.InjectModel)(user_dehive_schema_1.UserDehive.name)),
    __param(2, (0, mongoose_1.InjectModel)(server_schema_1.Server.name)),
    __param(3, (0, mongoose_1.InjectModel)(category_schema_1.Category.name)),
    __param(4, (0, mongoose_1.InjectModel)(channel_schema_1.Channel.name)),
    __param(5, (0, mongoose_1.InjectModel)(user_dehive_server_schema_1.UserDehiveServer.name)),
    __param(6, (0, mongoose_1.InjectModel)(channel_conversation_schema_1.ChannelConversation.name)),
    __metadata("design:paramtypes", [channel_messaging_service_1.MessagingService,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map
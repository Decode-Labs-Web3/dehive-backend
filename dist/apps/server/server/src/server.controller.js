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
exports.ServerController = void 0;
const common_1 = require("@nestjs/common");
const server_service_1 = require("./server.service");
const create_server_dto_1 = require("../dto/create-server.dto");
const update_server_dto_1 = require("../dto/update-server.dto");
const create_category_dto_1 = require("../dto/create-category.dto");
const create_channel_dto_1 = require("../dto/create-channel.dto");
const update_category_dto_1 = require("../dto/update-category.dto");
const update_channel_dto_1 = require("../dto/update-channel.dto");
const swagger_1 = require("@nestjs/swagger");
const auth_guard_1 = require("../common/guards/auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let ServerController = class ServerController {
    serverService;
    constructor(serverService) {
        this.serverService = serverService;
    }
    createServer(createServerDto, ownerId) {
        console.log('🎯 [CONTROLLER] createServer called');
        console.log('🎯 [CONTROLLER] ownerId:', ownerId);
        console.log('🎯 [CONTROLLER] ownerId type:', typeof ownerId);
        console.log('🎯 [CONTROLLER] createServerDto:', createServerDto);
        return this.serverService.createServer(createServerDto, ownerId);
    }
    findAllServers(actorId) {
        return this.serverService.findAllServers(actorId);
    }
    findServerById(id) {
        return this.serverService.findServerById(id);
    }
    updateServer(id, updateServerDto, actorId) {
        return this.serverService.updateServer(id, updateServerDto, actorId);
    }
    removeServer(id, actorId) {
        return this.serverService.removeServer(id, actorId);
    }
    createCategory(serverId, createCategoryDto, actorId) {
        return this.serverService.createCategory(serverId, actorId, createCategoryDto);
    }
    findAllCategoriesInServer(serverId) {
        return this.serverService.findAllCategoriesInServer(serverId);
    }
    updateCategory(categoryId, updateCategoryDto, actorId) {
        return this.serverService.updateCategory(categoryId, actorId, updateCategoryDto);
    }
    removeCategory(categoryId, actorId) {
        return this.serverService.removeCategory(categoryId, actorId);
    }
    createChannel(serverId, categoryId, createChannelDto, actorId) {
        return this.serverService.createChannel(serverId, categoryId, actorId, createChannelDto);
    }
    findChannelById(channelId) {
        return this.serverService.findChannelById(channelId);
    }
    updateChannel(channelId, updateChannelDto, actorId) {
        return this.serverService.updateChannel(channelId, actorId, updateChannelDto);
    }
    removeChannel(channelId, actorId) {
        return this.serverService.removeChannel(channelId, actorId);
    }
};
exports.ServerController = ServerController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new server' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Server created successfully.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_server_dto_1.CreateServerDto, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "createServer", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all servers joined by the user',
        description: 'Retrieves a list of servers that the authenticated user is a member of.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns a list of joined servers.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "findAllServers", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single server by ID' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'The ID of the server' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the server details.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "findServerById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a server' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'The ID of the server to update' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_server_dto_1.UpdateServerDto, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "updateServer", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a server' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'The ID of the server to delete' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "removeServer", null);
__decorate([
    (0, common_1.Post)(':serverId/categories'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new category' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'serverId', description: 'The ID of the server' }),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_category_dto_1.CreateCategoryDto, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Get)(':serverId/categories'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all categories in a server' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'serverId', description: 'The ID of the server' }),
    __param(0, (0, common_1.Param)('serverId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "findAllCategoriesInServer", null);
__decorate([
    (0, common_1.Patch)('categories/:categoryId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a category' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({
        name: 'categoryId',
        description: 'The ID of the category to update',
    }),
    __param(0, (0, common_1.Param)('categoryId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_category_dto_1.UpdateCategoryDto, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:categoryId'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a category' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({
        name: 'categoryId',
        description: 'The ID of the category to delete',
    }),
    __param(0, (0, common_1.Param)('categoryId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "removeCategory", null);
__decorate([
    (0, common_1.Post)(':serverId/categories/:categoryId/channels'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new channel' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'serverId', description: 'The ID of the server' }),
    (0, swagger_1.ApiParam)({ name: 'categoryId', description: 'The ID of the category' }),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, common_1.Param)('categoryId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_channel_dto_1.CreateChannelDto, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "createChannel", null);
__decorate([
    (0, common_1.Get)('channels/:channelId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single channel by ID' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'channelId', description: 'The ID of the channel' }),
    __param(0, (0, common_1.Param)('channelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "findChannelById", null);
__decorate([
    (0, common_1.Patch)('channels/:channelId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a channel' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({
        name: 'channelId',
        description: 'The ID of the channel to update',
    }),
    __param(0, (0, common_1.Param)('channelId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_channel_dto_1.UpdateChannelDto, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "updateChannel", null);
__decorate([
    (0, common_1.Delete)('channels/:channelId'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a channel' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({
        name: 'channelId',
        description: 'The ID of the channel to delete',
    }),
    __param(0, (0, common_1.Param)('channelId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "removeChannel", null);
exports.ServerController = ServerController = __decorate([
    (0, swagger_1.ApiTags)('Servers, Categories & Channels'),
    (0, common_1.Controller)('servers'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [server_service_1.ServerService])
], ServerController);
//# sourceMappingURL=server.controller.js.map
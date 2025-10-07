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
exports.UserDehiveServerController = void 0;
const common_1 = require("@nestjs/common");
const user_dehive_server_service_1 = require("./user-dehive-server.service");
const assign_role_dto_1 = require("../dto/assign-role.dto");
const transfer_ownership_dto_1 = require("../dto/transfer-ownership.dto");
const generate_invite_dto_1 = require("../dto/generate-invite.dto");
const join_server_dto_1 = require("../dto/join-server.dto");
const kick_ban_dto_1 = require("../dto/kick-ban.dto");
const unban_dto_1 = require("../dto/unban.dto");
const update_notification_dto_1 = require("../dto/update-notification.dto");
const get_server_members_dto_1 = require("../dto/get-server-members.dto");
const auth_guard_1 = require("../common/guards/auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
let UserDehiveServerController = class UserDehiveServerController {
    service;
    constructor(service) {
        this.service = service;
    }
    joinServer(dto, _id) {
        return this.service.joinServer(dto, _id);
    }
    leaveServer(serverId, _id) {
        const dto = {
            server_id: serverId,
        };
        return this.service.leaveServer(dto, _id);
    }
    generateInvite(dto, actorBaseId) {
        return this.service.generateInvite(dto, actorBaseId);
    }
    useInvite(code, actorBaseId) {
        return this.service.useInvite(code, actorBaseId);
    }
    kickMember(dto, actorBaseId) {
        return this.service.kickOrBan(dto, 'kick', actorBaseId);
    }
    banMember(dto, actorBaseId) {
        return this.service.kickOrBan(dto, 'ban', actorBaseId);
    }
    unbanMember(dto, actorBaseId) {
        return this.service.unbanMember(dto, actorBaseId);
    }
    assignRole(dto, actorBaseId) {
        return this.service.assignRole(dto, actorBaseId);
    }
    transferOwnership(dto, currentOwnerId) {
        return this.service.transferOwnership(dto, currentOwnerId);
    }
    updateNotification(dto, actorBaseId) {
        return this.service.updateNotification(dto, actorBaseId);
    }
    getMembersInServer(params, user) {
        return this.service.getMembersInServer(params.serverId, user);
    }
    getEnrichedUserProfile(targetUserId, currentUser) {
        return this.service.getEnrichedUserProfile(targetUserId, currentUser);
    }
};
exports.UserDehiveServerController = UserDehiveServerController;
__decorate([
    (0, common_1.Post)('join'),
    (0, swagger_1.ApiOperation)({
        summary: 'Join a server',
        description: 'Allows a user to become a member of a server.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Successfully joined the server.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Bad Request (e.g., already a member).',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (e.g., user is banned).',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Server or Dehive Profile not found.',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [join_server_dto_1.JoinServerDto, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "joinServer", null);
__decorate([
    (0, common_1.Delete)('server/:serverId/leave'),
    (0, swagger_1.ApiOperation)({
        summary: 'Leave a server',
        description: 'Allows a user to leave a server they are a member of.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'serverId', description: 'The ID of the server to leave' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Successfully left the server.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (e.g., owner cannot leave).',
    }),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "leaveServer", null);
__decorate([
    (0, common_1.Post)('invite/generate'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate an invite link',
        description: 'Generates a new invite link for a server.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Invite link created successfully.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (e.g., user is not a member).',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_invite_dto_1.GenerateInviteDto, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "generateInvite", null);
__decorate([
    (0, common_1.Post)('invite/use/:code'),
    (0, swagger_1.ApiOperation)({
        summary: 'Use an invite link',
        description: 'Allows a user to join a server using an invite code.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'code', description: 'The unique invite code' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Successfully joined the server via invite.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Invite link is invalid or has expired.',
    }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "useInvite", null);
__decorate([
    (0, common_1.Post)('kick'),
    (0, swagger_1.ApiOperation)({
        summary: 'Kick a member',
        description: 'Kicks a member from a server. Requires moderator or owner permissions.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User successfully kicked.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (insufficient permissions).',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [kick_ban_dto_1.KickBanDto, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "kickMember", null);
__decorate([
    (0, common_1.Post)('ban'),
    (0, swagger_1.ApiOperation)({
        summary: 'Ban a member',
        description: 'Bans a member from a server. Requires moderator or owner permissions.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User successfully banned.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (insufficient permissions).',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [kick_ban_dto_1.KickBanDto, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "banMember", null);
__decorate([
    (0, common_1.Post)('unban'),
    (0, swagger_1.ApiOperation)({
        summary: 'Unban a member',
        description: 'Unbans a previously banned member. Requires moderator or owner permissions.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User successfully unbanned.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Ban record not found.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [unban_dto_1.UnbanDto, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "unbanMember", null);
__decorate([
    (0, common_1.Patch)('role'),
    (0, swagger_1.ApiOperation)({
        summary: 'Assign a role to a member',
        description: 'Changes role of member. Requires owner permissions.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Role updated successfully.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (only owner can assign roles).',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assign_role_dto_1.AssignRoleDto, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "assignRole", null);
__decorate([
    (0, common_1.Patch)('transfer-ownership'),
    (0, swagger_1.ApiOperation)({
        summary: 'Transfer server ownership',
        description: 'Transfers ownership of server to another member. Only current owner can do this.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of current owner',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ownership transferred successfully.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (only current owner can transfer ownership).',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'New owner is not a member of this server.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Bad Request (e.g., cannot transfer to yourself).',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transfer_ownership_dto_1.TransferOwnershipDto, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "transferOwnership", null);
__decorate([
    (0, common_1.Patch)('notification'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update notification settings',
        description: 'Mutes or unmutes notifications for a user in a specific server.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Notification settings updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Membership not found.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_notification_dto_1.UpdateNotificationDto, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "updateNotification", null);
__decorate([
    (0, common_1.Get)('server/:serverId/members'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all members in a server',
        description: 'Retrieves a list of all members for a specific server.',
    }),
    (0, swagger_1.ApiHeader)({ name: 'x-session-id', required: true }),
    (0, swagger_1.ApiParam)({ name: 'serverId', description: 'The ID of the server' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns a list of members.' }),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_server_members_dto_1.GetServerMembersDto, Object]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "getMembersInServer", null);
__decorate([
    (0, common_1.Get)('profile/:userId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get enriched user profile',
        description: 'Retrieves a full user profile, including mutual servers, from the perspective of the current user.',
    }),
    (0, swagger_1.ApiHeader)({ name: 'x-session-id', required: true }),
    (0, swagger_1.ApiParam)({ name: '_id', description: 'The ID of the user profile to view' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the enriched user profile.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found.' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "getEnrichedUserProfile", null);
exports.UserDehiveServerController = UserDehiveServerController = __decorate([
    (0, swagger_1.ApiTags)('Memberships & Profiles'),
    (0, common_1.Controller)('memberships'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [user_dehive_server_service_1.UserDehiveServerService])
], UserDehiveServerController);
//# sourceMappingURL=user-dehive-server.controller.js.map
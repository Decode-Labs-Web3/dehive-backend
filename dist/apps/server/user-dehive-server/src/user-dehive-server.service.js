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
exports.UserDehiveServerService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_dehive_schema_1 = require("../schemas/user-dehive.schema");
const user_dehive_server_schema_1 = require("../schemas/user-dehive-server.schema");
const server_schema_1 = require("../schemas/server.schema");
const server_ban_schema_1 = require("../schemas/server-ban.schema");
const invite_link_schema_1 = require("../schemas/invite-link.schema");
const enum_1 = require("../enum/enum");
const auth_service_client_1 = require("./auth-service.client");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
let UserDehiveServerService = class UserDehiveServerService {
    userDehiveModel;
    userDehiveServerModel;
    serverModel;
    serverBanModel;
    inviteLinkModel;
    authClient;
    redis;
    httpService;
    constructor(userDehiveModel, userDehiveServerModel, serverModel, serverBanModel, inviteLinkModel, authClient, redis, httpService) {
        this.userDehiveModel = userDehiveModel;
        this.userDehiveServerModel = userDehiveServerModel;
        this.serverModel = serverModel;
        this.serverBanModel = serverBanModel;
        this.inviteLinkModel = inviteLinkModel;
        this.authClient = authClient;
        this.redis = redis;
        this.httpService = httpService;
    }
    async findUserDehiveProfile(userId) {
        return await this.userDehiveModel.findById(userId).lean();
    }
    async getUserDehiveIdFromSession(sessionId) {
        try {
            console.log('🔍 [GET USER DEHIVE ID] Calling auth service for session:', sessionId);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`http://localhost:4006/auth/session/check`, {
                headers: {
                    'x-session-id': sessionId,
                    'Content-Type': 'application/json',
                },
                timeout: 5000,
            }));
            console.log('🔍 [GET USER DEHIVE ID] Auth service response:', response.data);
            if (!response.data.success || !response.data.data) {
                throw new common_1.NotFoundException('Invalid session for target user');
            }
            const sessionData = response.data.data;
            const sessionToken = sessionData.session_token;
            if (!sessionToken) {
                throw new common_1.NotFoundException('No session token for target user');
            }
            const payload = sessionToken.split('.')[1];
            const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
            console.log('🔍 [GET USER DEHIVE ID] JWT payload:', decodedPayload);
            console.log('🔍 [GET USER DEHIVE ID] Available fields:', Object.keys(decodedPayload));
            const userDehiveId = decodedPayload._id ||
                decodedPayload.user_id ||
                decodedPayload.sub ||
                decodedPayload.id;
            console.log('🔍 [GET USER DEHIVE ID] Found user_dehive_id:', userDehiveId);
            if (!userDehiveId) {
                throw new common_1.NotFoundException('No user_dehive_id in target session');
            }
            return new mongoose_2.Types.ObjectId(userDehiveId);
        }
        catch (error) {
            throw new common_1.NotFoundException(`Failed to get user_dehive_id from session: ${error.message}`);
        }
    }
    async joinServer(dto, userId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        const userDehiveId = userId;
        const userDehiveProfile = await this.userDehiveModel
            .findById(userId)
            .lean();
        if (!userDehiveProfile) {
            throw new common_1.NotFoundException('UserDehive profile not found.');
        }
        const isBannedFromServer = userDehiveProfile.banned_by_servers?.includes(serverId.toString());
        const [server, isAlreadyMember] = await Promise.all([
            this.serverModel.findById(serverId).lean(),
            this.userDehiveServerModel.exists({
                user_dehive_id: userDehiveId,
                server_id: serverId,
            }),
        ]);
        if (!server)
            throw new common_1.NotFoundException(`Server not found.`);
        if (isAlreadyMember)
            throw new common_1.BadRequestException('User is already a member.');
        if (isBannedFromServer)
            throw new common_1.ForbiddenException('You are banned from this server.');
        const session = await this.serverModel.db.startSession();
        session.startTransaction();
        try {
            const newMembership = new this.userDehiveServerModel({
                user_dehive_id: userDehiveId,
                server_id: serverId,
            });
            await newMembership.save({ session });
            await this.userDehiveModel.findByIdAndUpdate(userDehiveId, { $inc: { server_count: 1 } }, { session });
            await this.serverModel.findByIdAndUpdate(serverId, { $inc: { member_count: 1 } }, { session });
            await session.commitTransaction();
            await this.invalidateMemberListCache(dto.server_id);
            return { message: 'Successfully joined server.' };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Failed to join server.');
        }
        finally {
            void session.endSession();
        }
    }
    async leaveServer(dto, userId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        const userDehive = await this.findUserDehiveProfile(userId);
        if (!userDehive) {
            throw new common_1.NotFoundException('UserDehive profile not found.');
        }
        const userDehiveId = userId;
        const membership = await this.userDehiveServerModel.findOne({
            user_dehive_id: userDehiveId,
            server_id: serverId,
        });
        if (!membership)
            throw new common_1.BadRequestException('User is not a member of this server.');
        if (membership.role === enum_1.ServerRole.OWNER)
            throw new common_1.ForbiddenException('Server owner cannot leave. Transfer ownership first.');
        const session = await this.userDehiveServerModel.db.startSession();
        session.startTransaction();
        try {
            await this.userDehiveServerModel
                .deleteOne({ _id: membership._id })
                .session(session);
            await this.userDehiveModel.findByIdAndUpdate(userDehiveId, { $inc: { server_count: -1 } }, { session });
            await this.serverModel.findByIdAndUpdate(serverId, { $inc: { member_count: -1 } }, { session });
            await session.commitTransaction();
            await this.invalidateMemberListCache(dto.server_id);
            return { message: 'Successfully left server.' };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Failed to leave server.');
        }
        finally {
            void session.endSession();
        }
    }
    async generateInvite(dto, actorBaseId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        const actorDehiveProfile = await this.userDehiveModel
            .findById(actorBaseId)
            .select('_id')
            .lean();
        if (!actorDehiveProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for actor.`);
        const actorDehiveId = actorDehiveProfile._id;
        const isMember = await this.userDehiveServerModel.exists({
            server_id: serverId,
            user_dehive_id: actorBaseId,
        });
        if (!isMember)
            throw new common_1.ForbiddenException('Only server members can generate invites.');
        const { customAlphabet } = await Promise.resolve().then(() => require('nanoid'));
        const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890', 10);
        const code = nanoid();
        const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const newInvite = new this.inviteLinkModel({
            code,
            server_id: serverId,
            creator_id: actorDehiveId,
            expiredAt,
        });
        return newInvite.save();
    }
    async useInvite(code, actorBaseId) {
        const invite = await this.inviteLinkModel.findOne({ code });
        if (!invite || invite.expiredAt < new Date())
            throw new common_1.NotFoundException('Invite link is invalid or has expired.');
        return this.joinServer({
            server_id: invite.server_id.toString(),
        }, actorBaseId);
    }
    async kickOrBan(dto, action, actorBaseId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        const targetDehiveId = await this.getUserDehiveIdFromSession(dto.target_session_id);
        const actorDehiveProfile = await this.userDehiveModel
            .findById(actorBaseId)
            .select('_id')
            .lean();
        if (!actorDehiveProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for actor.`);
        const actorDehiveId = actorDehiveProfile._id;
        const [targetMembership, actorMembership] = await Promise.all([
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                user_dehive_id: targetDehiveId,
            }),
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                user_dehive_id: actorDehiveId,
            }),
        ]);
        if (!targetMembership)
            throw new common_1.NotFoundException('Target user is not a member of this server.');
        if (!actorMembership)
            throw new common_1.ForbiddenException('You are not a member of this server.');
        if (actorDehiveId.toString() === targetDehiveId.toString())
            throw new common_1.BadRequestException('You cannot perform this action on yourself.');
        const hasPermission = actorMembership.role === enum_1.ServerRole.OWNER ||
            actorMembership.role === enum_1.ServerRole.MODERATOR;
        if (!hasPermission)
            throw new common_1.ForbiddenException('You do not have permission.');
        if (targetMembership.role === enum_1.ServerRole.OWNER)
            throw new common_1.ForbiddenException('Cannot kick or ban the server owner.');
        if (targetMembership.role === enum_1.ServerRole.MODERATOR &&
            actorMembership.role !== enum_1.ServerRole.OWNER)
            throw new common_1.ForbiddenException('Moderators cannot kick or ban other moderators.');
        const session = await this.userDehiveServerModel.db.startSession();
        session.startTransaction();
        try {
            await this.userDehiveServerModel
                .deleteOne({ _id: targetMembership._id })
                .session(session);
            await this.userDehiveModel.findByIdAndUpdate(targetDehiveId, { $inc: { server_count: -1 } }, { session });
            await this.serverModel.findByIdAndUpdate(serverId, { $inc: { member_count: -1 } }, { session });
            if (action === 'ban') {
                await this.userDehiveModel.findByIdAndUpdate(targetDehiveId, {
                    $addToSet: { banned_by_servers: serverId.toString() },
                    $set: { is_banned: true },
                }, { session });
                await this.serverBanModel.create([
                    {
                        server_id: serverId,
                        user_dehive_id: targetDehiveId,
                        banned_by: actorDehiveId,
                        reason: dto.reason,
                    },
                ], { session });
            }
            await session.commitTransaction();
            await this.invalidateMemberListCache(dto.server_id);
            return { message: `User successfully ${action}ed.` };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException(`Failed to ${action} user.`);
        }
        finally {
            void session.endSession();
        }
    }
    async unbanMember(dto, actorBaseId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        const targetDehiveId = await this.getUserDehiveIdFromSession(dto.target_session_id);
        const actorDehiveProfile = await this.userDehiveModel
            .findById(actorBaseId)
            .select('_id')
            .lean();
        if (!actorDehiveProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for actor.`);
        const actorDehiveId = actorDehiveProfile._id;
        const hasPermission = await this.userDehiveServerModel.exists({
            server_id: serverId,
            user_dehive_id: actorDehiveId,
            role: { $in: [enum_1.ServerRole.OWNER, enum_1.ServerRole.MODERATOR] },
        });
        if (!hasPermission)
            throw new common_1.ForbiddenException('You do not have permission to unban members.');
        const result = await this.userDehiveModel.findByIdAndUpdate(targetDehiveId, {
            $pull: { banned_by_servers: serverId.toString() },
        });
        if (!result) {
            throw new common_1.NotFoundException('User not found.');
        }
        const updatedUser = await this.userDehiveModel.findById(targetDehiveId);
        if (updatedUser && updatedUser.banned_by_servers.length === 0) {
            await this.userDehiveModel.findByIdAndUpdate(targetDehiveId, {
                $set: { is_banned: false },
            });
        }
        await this.serverBanModel.deleteOne({
            server_id: serverId,
            user_dehive_id: targetDehiveId,
        });
        return { message: 'User successfully unbanned.' };
    }
    async assignRole(dto, actorBaseId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        const targetDehiveId = await this.getUserDehiveIdFromSession(dto.target_session_id);
        const actorDehiveProfile = await this.userDehiveModel
            .findById(actorBaseId)
            .select('_id')
            .lean();
        if (!actorDehiveProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for actor.`);
        const actorDehiveId = actorDehiveProfile._id;
        const [targetMembership, actorMembership] = await Promise.all([
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                user_dehive_id: targetDehiveId,
            }),
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                user_dehive_id: actorDehiveId,
            }),
        ]);
        if (!targetMembership)
            throw new common_1.NotFoundException('Target user is not a member of this server.');
        if (!actorMembership)
            throw new common_1.ForbiddenException('You are not a member of this server.');
        if (actorDehiveId.toString() === targetDehiveId.toString())
            throw new common_1.BadRequestException('You cannot change your own role.');
        if (actorMembership.role !== enum_1.ServerRole.OWNER)
            throw new common_1.ForbiddenException('Only the server owner can assign roles.');
        if (dto.role === enum_1.ServerRole.OWNER)
            throw new common_1.BadRequestException('Ownership can only be transferred, not assigned.');
        targetMembership.role = dto.role;
        return targetMembership.save();
    }
    async updateNotification(dto, actorBaseId) {
        const actorDehiveProfile = await this.userDehiveModel
            .findById(actorBaseId)
            .select('_id')
            .lean();
        if (!actorDehiveProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for user.`);
        const actorDehiveId = actorDehiveProfile._id;
        const result = await this.userDehiveServerModel.updateOne({
            server_id: new mongoose_2.Types.ObjectId(dto.server_id),
            user_dehive_id: actorDehiveId,
        }, { $set: { is_muted: dto.is_muted } });
        if (result.matchedCount === 0)
            throw new common_1.NotFoundException('Membership not found.');
        return { message: 'Notification settings updated successfully.' };
    }
    async getUserProfile(userId) {
        const authProfile = await this.authClient.getUserProfile(userId);
        if (!authProfile) {
            throw new common_1.NotFoundException(`User profile not found: ${userId}`);
        }
        const userDehive = await this.userDehiveModel
            .findById(userId)
            .select('bio status banner_color server_count last_login')
            .lean();
        return {
            ...authProfile,
            dehive_data: userDehive
                ? {
                    bio: userDehive.bio,
                    status: userDehive.status,
                    banner_color: userDehive.banner_color,
                    server_count: userDehive.server_count,
                    last_login: userDehive.last_login,
                }
                : {
                    bio: '',
                    status: 'offline',
                    banner_color: null,
                    server_count: 0,
                    last_login: null,
                },
        };
    }
    async getMembersInServer(serverId) {
        const cacheKey = `server_members:${serverId}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const memberships = await this.userDehiveServerModel
            .find({ server_id: new mongoose_2.Types.ObjectId(serverId) })
            .lean();
        if (memberships.length === 0) {
            return [];
        }
        const userIds = memberships.map((m) => m.user_dehive_id.toString());
        const profiles = await this.authClient.batchGetProfiles(userIds);
        const result = memberships.map((m) => {
            const userId = m.user_dehive_id.toString();
            const profile = profiles[userId] || {
                username: 'Unknown User',
                display_name: 'Unknown User',
                avatar: null,
            };
            return {
                membership_id: m._id.toString(),
                user_dehive_id: m.user_dehive_id.toString(),
                username: profile.username,
                display_name: profile.display_name || profile.username,
                avatar: profile.avatar,
                role: m.role,
                is_muted: m.is_muted,
                joined_at: m.joined_at,
            };
        });
        await this.redis.setex(cacheKey, 300, JSON.stringify(result));
        return result;
    }
    async invalidateMemberListCache(serverId) {
        await this.redis.del(`server_members:${serverId}`);
    }
    async getEnrichedUserProfile(targetUserId, viewerUserId) {
        const targetAuthProfile = await this.authClient.getUserProfile(targetUserId);
        if (!targetAuthProfile) {
            throw new common_1.NotFoundException(`User profile not found for target user ID: ${targetUserId}`);
        }
        const [targetDehiveProfile] = await Promise.all([
            this.userDehiveModel.findById(targetUserId).lean(),
            this.userDehiveModel.findById(viewerUserId).lean(),
        ]);
        const finalViewerDehiveProfile = await this.findUserDehiveProfile(viewerUserId);
        if (!finalViewerDehiveProfile) {
            throw new common_1.NotFoundException('Viewer UserDehive profile not found.');
        }
        const targetDehiveId = targetDehiveProfile?._id;
        if (!targetDehiveId) {
            return {
                ...targetAuthProfile,
                bio: '',
                status: 'offline',
                mutual_servers_count: 0,
                mutual_servers: [],
            };
        }
        const [targetServers, viewerServers] = await Promise.all([
            this.userDehiveServerModel
                .find({ user_dehive_id: targetDehiveId })
                .select('server_id')
                .populate('server_id', 'name icon')
                .lean(),
            this.userDehiveServerModel
                .find({ user_dehive_id: finalViewerDehiveProfile?._id })
                .select('server_id')
                .lean(),
        ]);
        const viewerServerIds = new Set(viewerServers.map((s) => s.server_id.toString()));
        const mutualServers = targetServers.filter((s) => {
            if (!s.server_id)
                return false;
            const serverId = typeof s.server_id === 'object'
                ?
                    s.server_id?._id?.toString()
                : String(s.server_id);
            return serverId && viewerServerIds.has(serverId);
        });
        return {
            _id: targetUserId,
            username: targetAuthProfile.username,
            display_name: targetAuthProfile.display_name || targetAuthProfile.username,
            email: targetAuthProfile.email,
            avatar: targetAuthProfile.avatar,
            bio: targetDehiveProfile?.bio || '',
            status: targetDehiveProfile?.status || 'offline',
            banner_color: targetDehiveProfile?.banner_color,
            mutual_servers_count: mutualServers.length,
            mutual_servers: mutualServers.map((s) => s.server_id),
        };
    }
};
exports.UserDehiveServerService = UserDehiveServerService;
exports.UserDehiveServerService = UserDehiveServerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_dehive_schema_1.UserDehive.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_dehive_server_schema_1.UserDehiveServer.name)),
    __param(2, (0, mongoose_1.InjectModel)(server_schema_1.Server.name)),
    __param(3, (0, mongoose_1.InjectModel)(server_ban_schema_1.ServerBan.name)),
    __param(4, (0, mongoose_1.InjectModel)(invite_link_schema_1.InviteLink.name)),
    __param(6, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        auth_service_client_1.AuthServiceClient,
        ioredis_2.Redis,
        axios_1.HttpService])
], UserDehiveServerService);
//# sourceMappingURL=user-dehive-server.service.js.map
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
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_dehive_schema_1 = require("../schemas/user-dehive.schema");
const user_dehive_server_schema_1 = require("../schemas/user-dehive-server.schema");
const server_schema_1 = require("../schemas/server.schema");
const server_ban_schema_1 = require("../schemas/server-ban.schema");
const invite_link_schema_1 = require("../schemas/invite-link.schema");
const enum_1 = require("../enum/enum");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
const decode_api_client_1 = require("../clients/decode-api.client");
let UserDehiveServerService = class UserDehiveServerService {
    userDehiveModel;
    userDehiveServerModel;
    serverModel;
    serverBanModel;
    inviteLinkModel;
    decodeApiClient;
    redis;
    constructor(userDehiveModel, userDehiveServerModel, serverModel, serverBanModel, inviteLinkModel, decodeApiClient, redis) {
        this.userDehiveModel = userDehiveModel;
        this.userDehiveServerModel = userDehiveServerModel;
        this.serverModel = serverModel;
        this.serverBanModel = serverBanModel;
        this.inviteLinkModel = inviteLinkModel;
        this.decodeApiClient = decodeApiClient;
        this.redis = redis;
    }
    async findUserDehiveProfile(userId) {
        return await this.userDehiveModel.findById(userId).lean();
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
        console.log('🎯 [KICK/BAN] target_user_dehive_id:', dto.target_user_dehive_id);
        const targetDehiveId = new mongoose_2.Types.ObjectId(dto.target_user_dehive_id);
        console.log('🎯 [KICK/BAN] targetDehiveId resolved:', targetDehiveId);
        const actorDehiveProfile = await this.userDehiveModel
            .findById(actorBaseId)
            .select('_id')
            .lean();
        if (!actorDehiveProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for actor.`);
        const actorDehiveId = actorDehiveProfile._id;
        console.log('🎯 [KICK/BAN] serverId:', serverId);
        console.log('🎯 [KICK/BAN] targetDehiveId:', targetDehiveId);
        console.log('🎯 [KICK/BAN] actorDehiveId:', actorDehiveId);
        console.log('🔍 [KICK/BAN] Querying for targetMembership with:');
        console.log('🔍 [KICK/BAN] - server_id:', serverId);
        console.log('🔍 [KICK/BAN] - user_dehive_id:', targetDehiveId);
        console.log('🔍 [KICK/BAN] - server_id type:', typeof serverId);
        console.log('🔍 [KICK/BAN] - user_dehive_id type:', typeof targetDehiveId);
        const allMemberships = await this.userDehiveServerModel.find({
            server_id: serverId,
        }).lean();
        console.log('🔍 [KICK/BAN] All memberships in server:', allMemberships.length);
        console.log('🔍 [KICK/BAN] All user_dehive_ids in server:', allMemberships.map(m => m.user_dehive_id.toString()));
        console.log('🔍 [KICK/BAN] Looking for targetDehiveId:', targetDehiveId.toString());
        console.log('🔍 [KICK/BAN] Looking for actorDehiveId:', actorDehiveId.toString());
        const [targetMembership, actorMembership] = await Promise.all([
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                $or: [
                    { user_dehive_id: targetDehiveId },
                    { user_dehive_id: targetDehiveId.toString() }
                ]
            }).lean(),
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                $or: [
                    { user_dehive_id: actorDehiveId },
                    { user_dehive_id: actorDehiveId.toString() }
                ]
            }).lean(),
        ]);
        console.log('🔍 [KICK/BAN] targetMembership found:', !!targetMembership);
        console.log('🔍 [KICK/BAN] actorMembership found:', !!actorMembership);
        if (targetMembership) {
            console.log('🔍 [KICK/BAN] targetMembership data:', JSON.stringify(targetMembership, null, 2));
        }
        if (actorMembership) {
            console.log('🔍 [KICK/BAN] actorMembership data:', JSON.stringify(actorMembership, null, 2));
        }
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
        const targetDehiveId = new mongoose_2.Types.ObjectId(dto.target_user_dehive_id);
        const actorDehiveProfile = await this.userDehiveModel
            .findById(actorBaseId)
            .select('_id')
            .lean();
        if (!actorDehiveProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for actor.`);
        const actorDehiveId = actorDehiveProfile._id;
        const hasPermission = await this.userDehiveServerModel.exists({
            server_id: serverId,
            $or: [
                { user_dehive_id: actorDehiveId },
                { user_dehive_id: actorDehiveId.toString() }
            ],
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
        const targetDehiveId = new mongoose_2.Types.ObjectId(dto.target_user_dehive_id);
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
                $or: [
                    { user_dehive_id: targetDehiveId },
                    { user_dehive_id: targetDehiveId.toString() }
                ]
            }),
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                $or: [
                    { user_dehive_id: actorDehiveId },
                    { user_dehive_id: actorDehiveId.toString() }
                ]
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
    async transferOwnership(dto, currentOwnerId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        const newOwnerDehiveId = new mongoose_2.Types.ObjectId(dto.user_dehive_id);
        const currentOwnerProfile = await this.userDehiveModel
            .findById(currentOwnerId)
            .select('_id')
            .lean();
        if (!currentOwnerProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for current owner.`);
        const currentOwnerDehiveId = currentOwnerProfile._id;
        const [currentOwnerMembership, newOwnerMembership] = await Promise.all([
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                $or: [
                    { user_dehive_id: currentOwnerDehiveId },
                    { user_dehive_id: currentOwnerDehiveId.toString() }
                ]
            }),
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                $or: [
                    { user_dehive_id: newOwnerDehiveId },
                    { user_dehive_id: newOwnerDehiveId.toString() }
                ]
            }),
        ]);
        if (!currentOwnerMembership)
            throw new common_1.ForbiddenException('You are not a member of this server.');
        if (currentOwnerMembership.role !== enum_1.ServerRole.OWNER)
            throw new common_1.ForbiddenException('Only the server owner can transfer ownership.');
        if (!newOwnerMembership)
            throw new common_1.NotFoundException('New owner is not a member of this server.');
        if (currentOwnerDehiveId.toString() === newOwnerDehiveId.toString())
            throw new common_1.BadRequestException('You cannot transfer ownership to yourself.');
        const session = await this.userDehiveServerModel.db.startSession();
        session.startTransaction();
        try {
            await this.userDehiveServerModel.updateOne({ _id: currentOwnerMembership._id }, { $set: { role: enum_1.ServerRole.MEMBER } }, { session });
            await this.userDehiveServerModel.updateOne({ _id: newOwnerMembership._id }, { $set: { role: enum_1.ServerRole.OWNER } }, { session });
            await session.commitTransaction();
            await this.invalidateMemberListCache(dto.server_id);
            return { message: 'Ownership transferred successfully.' };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Failed to transfer ownership.');
        }
        finally {
            void session.endSession();
        }
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
            $or: [
                { user_dehive_id: actorDehiveId },
                { user_dehive_id: actorDehiveId.toString() }
            ]
        }, { $set: { is_muted: dto.is_muted } });
        if (result.matchedCount === 0)
            throw new common_1.NotFoundException('Membership not found.');
        return { message: 'Notification settings updated successfully.' };
    }
    async _getEnrichedUser(userId, sessionIdOfRequester) {
        const userDecodeData = await this.decodeApiClient.getUserById(userId, sessionIdOfRequester);
        if (!userDecodeData) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found in Decode service`);
        }
        let userDehiveData = await this.userDehiveModel.findById(userId).lean();
        if (!userDehiveData) {
            const newUser = new this.userDehiveModel({ _id: userId, status: 'ACTIVE' });
            const savedDocument = await newUser.save();
            userDehiveData = savedDocument.toObject();
        }
        return this._mergeUserData(userDehiveData, userDecodeData);
    }
    _mergeUserData(dehiveData, decodeData) {
        return {
            _id: decodeData._id.toString(),
            username: decodeData.username,
            display_name: decodeData.display_name,
            avatar: decodeData.avatar_ipfs_hash,
            status: dehiveData.status,
            server_count: dehiveData.server_count,
            bio: dehiveData.bio,
            banner_color: dehiveData.banner_color,
            is_banned: dehiveData.is_banned
        };
    }
    async getMembersInServer(serverId, currentUser) {
        const cacheKey = `server_members:${serverId}`;
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const memberships = await this.userDehiveServerModel
            .find({ server_id: new mongoose_2.Types.ObjectId(serverId) })
            .lean();
        if (!memberships.length)
            return [];
        const enrichedMembersPromises = memberships.map(async (m) => {
            try {
                const userProfile = await this._getEnrichedUser(m.user_dehive_id.toString(), currentUser.session_id);
                return {
                    membership_id: m._id.toString(),
                    ...userProfile,
                    role: m.role,
                    is_muted: m.is_muted,
                    joined_at: m.joined_at,
                };
            }
            catch (error) {
                console.error(`Could not enrich member ${m.user_dehive_id}:`, error);
                return null;
            }
        });
        const finalResult = (await Promise.all(enrichedMembersPromises)).filter(Boolean);
        await this.redis.setex(cacheKey, 300, JSON.stringify(finalResult));
        return finalResult;
    }
    async getEnrichedUserProfile(targetUserId, currentUser) {
        const targetUserProfile = await this._getEnrichedUser(targetUserId, currentUser.session_id);
        console.log(`[SERVICE] getEnrichedUserProfile called with targetUserId: ${targetUserId}`);
        const [targetServers, viewerServers] = await Promise.all([
            this.userDehiveServerModel.find({ user_dehive_id: targetUserId }).select('server_id').lean(),
            this.userDehiveServerModel.find({ user_dehive_id: currentUser._id }).select('server_id').lean(),
        ]);
        const viewerServerIds = new Set(viewerServers.map(s => s.server_id.toString()));
        const mutualServers = targetServers
            .filter(s => viewerServerIds.has(s.server_id.toString()))
            .map(s => s.server_id);
        return {
            ...targetUserProfile,
            mutual_servers_count: mutualServers.length,
            mutual_servers: mutualServers,
        };
    }
    async invalidateMemberListCache(serverId) {
        await this.redis.del(`server_members:${serverId}`);
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
        decode_api_client_1.DecodeApiClient,
        ioredis_2.Redis])
], UserDehiveServerService);
//# sourceMappingURL=user-dehive-server.service.js.map
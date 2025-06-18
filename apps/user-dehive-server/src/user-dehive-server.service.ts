import { Injectable, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Status } from '../../user-dehive/constants/enum';
import { UserDehive } from '../../user-dehive/schemas/user-dehive.schema';
import { Server } from '../schemas/server.schema';
import { ServerBan } from '../schemas/server-ban.schema';
import { InviteLink } from '../schemas/invite-link.schema';
import { ServerAuditLog } from '../schemas/server-audit-log.schema';
import { UserDehiveServer, ServerRole } from '../entities/user-dehive-server.entity';
import { EventProducerService } from '../kafka/event-producer.service';
import { InviteLinkCache } from '../redis/invite-link.cache';
import { NotificationCache } from '../redis/notification.cache';
import { AuditLogAction } from '../constants/audit-log.enum';
import { JoinServerDto } from '../dto/join-server.dto';
import { LeaveServerDto } from '../dto/leave-server.dto';
import { GenerateInviteDto } from '../dto/generate-invite.dto';
import { KickBanDto } from '../dto/kick-ban.dto';
import { UnbanDto } from '../dto/unban.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';

@Injectable()
export class UserDehiveServerService {
    constructor(
        @InjectModel(UserDehiveServer.name) 
        private userDehiveServerModel: Model<UserDehiveServer>,
        @InjectModel(Server.name)
        private serverModel: Model<Server>,
        @InjectModel(ServerBan.name)
        private serverBanModel: Model<ServerBan>,
        @InjectModel(InviteLink.name)
        private inviteLinkModel: Model<InviteLink>,
        @InjectModel(ServerAuditLog.name)
        private serverAuditLogModel: Model<ServerAuditLog>,
        @InjectModel(UserDehive.name)
        private userDehiveModel: Model<UserDehive>,
        private readonly eventProducer: EventProducerService,
        private readonly inviteLinkCache: InviteLinkCache,
        private readonly notificationCache: NotificationCache,
    ) {}

    async joinServer(dto: JoinServerDto) {
        try {
            const serverId = new Types.ObjectId(dto.server_id);
            const userId = new Types.ObjectId(dto.user_dehive_id);

            // Check if server exists
            const server = await this.serverModel.findById(serverId);
            if (!server) {
                throw new NotFoundException('Server not found');
            }

            // Check if already a member
            const existingMember = await this.userDehiveModel.findOne({
                user_id: userId,
                'servers.server_id': serverId
            });

            if (existingMember) {
                throw new BadRequestException('User is already a member of this server');
            }

            // Check if user is banned
            const ban = await this.serverBanModel.findOne({
                server_id: serverId,
                user_dehive_id: userId
            });

            if (ban) {
                throw new ForbiddenException('You are banned from this server');
            }

            // Start transaction
            const session = await this.userDehiveModel.db.startSession();
            await session.withTransaction(async () => {
                // Update userDehive collection
                const userDehive = await this.userDehiveModel.findOneAndUpdate(
                    { user_id: userId },
                    {
                        $push: {
                            servers: {
                                server_id: serverId,
                                role: 'member'
                            }
                        },
                        $inc: { server_count: 1 },
                        $set: { 
                            status: Status.Online,
                            last_login: new Date()
                        }
                    },
                    { 
                        session,
                        upsert: true,
                        new: true
                    }
                );

                // Create membership record in userDehiveServer collection
                const membership = new this.userDehiveServerModel({
                    user_dehive_id: userId,
                    server_id: serverId,
                    role: ServerRole.MEMBER,
                    joined_at: new Date()
                });
                await membership.save({ session });

                // Update server member count
                await this.serverModel.findByIdAndUpdate(
                    serverId,
                    { $inc: { member_count: 1 } },
                    { session }
                );

                // Create audit log
                await this.createAuditLog(
                    serverId,
                    userId,
                    AuditLogAction.MEMBER_JOIN,
                    undefined,
                    undefined,
                    undefined,
                    session
                );
            });

            // Emit server joined event
            await this.eventProducer.emit('server.joined', {
                user_dehive_id: dto.user_dehive_id,
                server_id: dto.server_id,
            });

            return { message: 'Successfully joined server' };
        } catch (error) {
            console.error('Service joinServer error:', error);
            if (error instanceof BadRequestException || 
                error instanceof NotFoundException || 
                error instanceof ForbiddenException) {
                throw error;
            }
            throw new BadRequestException('Failed to join server');
        }
    }

    async leaveServer(dto: LeaveServerDto) {
        try {
            const serverId = new Types.ObjectId(dto.server_id);
            const userId = new Types.ObjectId(dto.user_dehive_id);

            // Check if server exists and get server info
            const server = await this.serverModel.findById(serverId);
            if (!server) {
                throw new NotFoundException('Server not found');
            }

            // Check if user is a member
            const userDehive = await this.userDehiveModel.findOne({
                user_id: userId,
                'servers.server_id': serverId
            });

            if (!userDehive) {
                throw new BadRequestException('User is not a member of this server');
            }

            // Get user's server info
            const userServerInfo = userDehive.servers.find(
                s => s.server_id.toString() === serverId.toString()
            );

            // Check if user is owner before checking server owner
            if (userServerInfo && userServerInfo.role === 'owner') {
                throw new BadRequestException('Server owner cannot leave the server');
            }

            // Start transaction
            const session = await this.userDehiveModel.db.startSession();
            try {
                await session.withTransaction(async () => {
                    // Remove server from UserDehive collection
                    const updatedUser = await this.userDehiveModel.findOneAndUpdate(
                        { user_id: userId },
                        {
                            $pull: { servers: { server_id: serverId } },
                            $inc: { server_count: -1 }
                        },
                        { 
                            session,
                            new: true
                        }
                    );

                    // Remove from UserDehiveServer collection
                    await this.userDehiveServerModel.deleteOne({
                        user_dehive_id: userId,
                        server_id: serverId
                    }).session(session);

                    // Update server member count
                    await this.serverModel.findByIdAndUpdate(
                        serverId,
                        { $inc: { member_count: -1 } },
                        { session }
                    );

                    // If user has no servers left, set status to offline
                    if (updatedUser && updatedUser.server_count === 0) {
                        await this.userDehiveModel.findOneAndUpdate(
                            { user_id: userId },
                            { $set: { status: Status.Offline } },
                            { session }
                        );
                    }

                    // Create audit log
                    await this.createAuditLog(
                        serverId,
                        userId,
                        AuditLogAction.MEMBER_LEAVE,
                        undefined,
                        undefined,
                        undefined,
                        session
                    );
                });

                // Emit server left event
                await this.eventProducer.emit('server.left', {
                    user_dehive_id: dto.user_dehive_id,
                    server_id: dto.server_id,
                });

                return { message: 'Successfully left server' };
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                await session.endSession();
            }
        } catch (error) {
            console.error('Service leaveServer error:', error);
            if (error instanceof BadRequestException || 
                error instanceof NotFoundException) {
                throw error;
            }
            if (error.name === 'BSONError' || error.name === 'BSONTypeError') {
                throw new BadRequestException('Invalid MongoDB ID format');
            }
            throw new BadRequestException('Failed to leave server');
        }
    }

    async generateInvite(dto: GenerateInviteDto) {
        try {
            const code = Math.random().toString(36).substring(2, 10);
            const expiredAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days

            const serverId = new Types.ObjectId(dto.server_id);
            const userId = new Types.ObjectId(dto.user_dehive_id);

            // Check if server exists
            const server = await this.serverModel.findById(serverId);
            if (!server) {
                throw new NotFoundException('Server not found');
            }

            // Check if user is a member of the server
            const member = await this.userDehiveServerModel.findOne({
                server_id: serverId,
                user_dehive_id: userId
            });

            if (!member) {
                throw new ForbiddenException('User is not a member of this server');
            }

            const invite = new this.inviteLinkModel({
                code,
                server_id: serverId,
                creator_id: userId,
                expiredAt
            });
            
            await invite.save();

            await this.inviteLinkCache.setInviteLink(serverId.toString(), code, expiredAt);

            // Create audit log for invite creation
            await this.createAuditLog(
                serverId,
                userId,
                AuditLogAction.INVITE_CREATE,
                undefined,
                { code, expires_at: expiredAt }
            );
            
            return { 
                inviteLink: code, 
                expiredAt,
                server_id: dto.server_id
            };
        } catch (error) {
            console.error('Service generateInvite error:', error);
            if (error instanceof NotFoundException || 
                error instanceof ForbiddenException) {
                throw error;
            }
            if (error.name === 'BSONError' || error.name === 'BSONTypeError') {
                throw new BadRequestException('Invalid MongoDB ID format');
            }
            throw new BadRequestException('Failed to generate invite link');
        }
    }

    async useInviteLink(code: string, user_dehive_id: string) {
        try {
            const server_id = await this.inviteLinkCache.getServerIdByInviteLink(code);
            
            if (!server_id) {
                throw new NotFoundException('Invite link expired or invalid');
            }

            // Check if user is banned before using invite
            const serverId = new Types.ObjectId(server_id);
            const userId = new Types.ObjectId(user_dehive_id);

            const ban = await this.serverBanModel.findOne({
                server_id: serverId,
                user_dehive_id: userId
            });

            if (ban) {
                throw new ForbiddenException('You are banned from this server');
            }

            return this.joinServer({ 
                user_dehive_id: userId, 
                server_id: serverId
            });
        } catch (error) {
            console.error('Service useInviteLink error:', error);
            if (error instanceof NotFoundException || 
                error instanceof BadRequestException ||
                error instanceof ForbiddenException) {
                throw error;
            }
            throw new BadRequestException('Failed to use invite link');
        }
    }

    async kickOrBan(dto: KickBanDto) {
        try {
            const session = await this.userDehiveModel.db.startSession();

            return await session.withTransaction(async () => {
                const serverId = new Types.ObjectId(dto.server_id);
                const targetUserId = new Types.ObjectId(dto.target_user_id);
                const moderatorId = new Types.ObjectId(dto.moderator_id);

                // Check if target member exists
                const targetMember = await this.userDehiveModel.findOne({
                    user_id: targetUserId,
                    'servers.server_id': serverId
                }).session(session);

                if (!targetMember) {
                    throw new NotFoundException('Target user not found in server');
                }

                // Check moderator's permissions
                const moderator = await this.userDehiveModel.findOne({
                    user_id: moderatorId,
                    'servers.server_id': serverId
                }).session(session);

                if (!moderator) {
                    throw new ForbiddenException('Moderator not found in server');
                }

                const moderatorServerInfo = moderator.servers.find(
                    s => s.server_id.toString() === serverId.toString()
                );

                const targetServerInfo = targetMember.servers.find(
                    s => s.server_id.toString() === serverId.toString()
                );

                if (!moderatorServerInfo || !targetServerInfo) {
                    throw new BadRequestException('Server membership not found');
                }

                // Check permissions
                if (moderatorServerInfo.role !== 'owner' && moderatorServerInfo.role !== 'moderator') {
                    throw new ForbiddenException('Only owners and moderators can kick/ban members');
                }

                // Cannot kick/ban owners or moderators unless you're the owner
                if ((targetServerInfo.role === 'owner' || targetServerInfo.role === 'moderator') 
                    && moderatorServerInfo.role !== 'owner') {
                    throw new ForbiddenException('Cannot kick/ban owners or moderators');
                }

                // Remove from UserDehive collection
                await this.userDehiveModel.findOneAndUpdate(
                    { user_id: targetUserId },
                    {
                        $pull: { servers: { server_id: serverId } },
                        $inc: { server_count: -1 }
                    },
                    { session }
                );

                // Remove from UserDehiveServer collection
                await this.userDehiveServerModel.deleteOne({
                    user_dehive_id: targetUserId,
                    server_id: serverId
                }).session(session);

                // Update server member count
                await this.serverModel.findByIdAndUpdate(
                    serverId,
                    { $inc: { member_count: -1 } },
                    { session }
                );

                // If banning, create ban record
                if (dto.action === 'ban') {
                    const ban = new this.serverBanModel({
                        server_id: serverId,
                        user_dehive_id: targetUserId,
                        banned_by: moderatorId,
                        reason: dto.reason
                    });
                    await ban.save({ session });
                }

                // Create audit log
                await this.createAuditLog(
                    serverId,
                    moderatorId,
                    dto.action === 'ban' ? AuditLogAction.MEMBER_BAN : AuditLogAction.MEMBER_KICK,
                    targetUserId,
                    { reason: dto.reason },
                    dto.reason,
                    session
                );

                // Emit appropriate event
                await this.eventProducer.emit(
                    dto.action === 'ban' ? 'server.member.banned' : 'server.member.kicked',
                    {
                        server_id: serverId.toString(),
                        user_dehive_id: targetUserId.toString(),
                        moderator_id: moderatorId.toString(),
                        reason: dto.reason
                    }
                );

                return { 
                    message: `Successfully ${dto.action === 'ban' ? 'banned' : 'kicked'} user from server`
                };
            });
        } catch (error) {
            console.error('Service kickOrBan error:', error);
            if (error instanceof NotFoundException || 
                error instanceof BadRequestException ||
                error instanceof ForbiddenException) {
                throw error;
            }
            throw new BadRequestException('Failed to kick/ban user');
        }
    }

    async updateNotification(dto: UpdateNotificationDto) {
        try {
            const existingMember = await this.userDehiveServerModel.findOne({
                user_dehive_id: dto.user_dehive_id,
                server_id: dto.server_id,
            });

            if (!existingMember) {
                throw new NotFoundException('User is not a member of this server');
            }

            await this.notificationCache.setNotificationPreference(
                dto.user_dehive_id.toString(), 
                dto.server_id.toString(), 
                dto.is_muted
            );

            // Update in database
            await this.userDehiveServerModel.updateOne(
                { 
                    user_dehive_id: dto.user_dehive_id,
                    server_id: dto.server_id 
                },
                { is_muted: dto.is_muted }
            );

            await this.eventProducer.emit('server.notification.updated', {
                user_dehive_id: dto.user_dehive_id.toString(),
                server_id: dto.server_id.toString(),
                is_muted: dto.is_muted
            });

            return { 
                message: 'Notification preferences updated successfully',
                is_muted: dto.is_muted
            };
        } catch (error) {
            console.error('Service updateNotification error:', error);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException('Failed to update notification preferences');
        }
    }

    async unban(dto: UnbanDto) {
        try {
            const session = await this.serverBanModel.db.startSession();

            return await session.withTransaction(async () => {
                const serverId = new Types.ObjectId(dto.server_id);
                const targetUserId = new Types.ObjectId(dto.target_user_id);
                const moderatorId = new Types.ObjectId(dto.moderator_id);

                // Check moderator's permissions
                const moderator = await this.userDehiveModel.findOne({
                    user_id: moderatorId,
                    'servers.server_id': serverId
                }).session(session);

                if (!moderator) {
                    throw new ForbiddenException('Moderator not found in server');
                }

                const moderatorServerInfo = moderator.servers.find(
                    s => s.server_id.toString() === serverId.toString()
                );

                if (!moderatorServerInfo || 
                    (moderatorServerInfo.role !== 'owner' && moderatorServerInfo.role !== 'moderator')) {
                    throw new ForbiddenException('Only owners and moderators can unban members');
                }

                // Check if user is actually banned
                const ban = await this.serverBanModel.findOne({
                    server_id: serverId,
                    user_dehive_id: targetUserId
                }).session(session);

                if (!ban) {
                    throw new BadRequestException('User is not banned from this server');
                }

                // Remove ban record
                await this.serverBanModel.deleteOne({
                    server_id: serverId,
                    user_dehive_id: targetUserId
                }).session(session);

                // Create audit log
                await this.createAuditLog(
                    serverId,
                    moderatorId,
                    AuditLogAction.MEMBER_UNBAN,
                    targetUserId,
                    { reason: dto.reason },
                    dto.reason,
                    session
                );

                // Emit unban event
                await this.eventProducer.emit('server.member.unbanned', {
                    server_id: serverId.toString(),
                    user_dehive_id: targetUserId.toString(),
                    moderator_id: moderatorId.toString(),
                    reason: dto.reason
                });

                return { message: 'Successfully unbanned user from server' };
            });
        } catch (error) {
            console.error('Service unban error:', error);
            if (error instanceof NotFoundException || 
                error instanceof BadRequestException ||
                error instanceof ForbiddenException) {
                throw error;
            }
            throw new BadRequestException('Failed to unban user');
        }
    }

    async updateMemberRole(
        serverId: Types.ObjectId,
        targetUserId: Types.ObjectId,
        newRole: ServerRole,
        updatedBy: Types.ObjectId,
        session?: ClientSession
    ) {
        // Check if user exists in server
        const memberRecord = await this.userDehiveModel.findOne({
            user_id: targetUserId,
            'servers.server_id': serverId
        }).session(session || null);

        if (!memberRecord) {
            throw new NotFoundException('Target user not found in server');
        }

        // Get updater's role
        const updaterRecord = await this.userDehiveModel.findOne({
            user_id: updatedBy,
            'servers.server_id': serverId
        }).session(session || null);

        if (!updaterRecord) {
            throw new NotFoundException('Moderator not found in server');
        }

        const updaterServerInfo = updaterRecord.servers.find(
            s => s.server_id.toString() === serverId.toString()
        );

        const memberServerInfo = memberRecord.servers.find(
            s => s.server_id.toString() === serverId.toString()
        );

        if (!updaterServerInfo || !memberServerInfo) {
            throw new BadRequestException('Server membership not found');
        }

        // Only OWNER can assign MODERATOR role
        // OWNER role can only be transferred by the current OWNER
        if (
            (newRole === ServerRole.MODERATOR && updaterServerInfo.role !== 'owner') ||
            (newRole === ServerRole.OWNER && 
             (updaterServerInfo.role !== 'owner' || memberServerInfo.role === 'owner'))
        ) {
            throw new ForbiddenException('Insufficient permissions to update role');
        }

        // Update target user's role
        const updatedMember = await this.userDehiveModel.findOneAndUpdate(
            {
                user_id: targetUserId,
                'servers.server_id': serverId
            },
            {
                $set: {
                    'servers.$.role': newRole
                }
            },
            { new: true, session }
        );

        if (!updatedMember) {
            throw new NotFoundException('Failed to update member role');
        }

        // Create audit log
        await this.serverAuditLogModel.create([{
            server_id: serverId,
            action: AuditLogAction.ROLE_UPDATE,
            target_user_id: targetUserId,
            performed_by: updatedBy,
            details: {
                old_role: memberServerInfo.role,
                new_role: newRole
            }
        }], { session });

        return updatedMember;
    }
    
    async validateMemberRole(
        serverId: Types.ObjectId,
        userId: Types.ObjectId,
        requiredRole: ServerRole
    ): Promise<boolean> {
        const memberRecord = await this.userDehiveModel.findOne({
            user_id: userId,
            'servers.server_id': serverId
        });

        if (!memberRecord) {
            return false;
        }

        const serverInfo = memberRecord.servers.find(
            s => s.server_id.toString() === serverId.toString()
        );

        if (!serverInfo) {
            return false;
        }

        // OWNER has all permissions
        if (serverInfo.role === 'owner') {
            return true;
        }

        // MODERATOR has all permissions except OWNER-specific ones
        if (serverInfo.role === 'moderator' && requiredRole !== 'owner') {
            return true;
        }

        // Direct role match
        return serverInfo.role === requiredRole;
    }

    private async createAuditLog(
        serverId: Types.ObjectId,
        actorId: Types.ObjectId | string,
        action: AuditLogAction,
        targetId?: Types.ObjectId | string,
        changes?: Record<string, any>,
        reason?: string,
        session?: ClientSession
    ): Promise<void> {
        const auditLog = new this.serverAuditLogModel({
            server_id: serverId,
            actor_id: actorId,
            target_id: targetId,
            action,
            changes,
            reason
        });

        await auditLog.save({ session });
    }

    async getMemberServers(userId: Types.ObjectId) {
        try {
            const userDehive = await this.userDehiveModel.findOne({
                user_id: userId
            })
            .select('servers')
            .populate({
                path: 'servers.server_id',
                select: 'name description is_private member_count'
            })
            .lean();

            if (!userDehive) {
                throw new NotFoundException('User not found');
            }

            interface PopulatedServer {
                server_id: Types.ObjectId & {
                    name: string;
                    description: string;
                    is_private: boolean;
                    member_count: number;
                };
                role: string;
            }

            const enhancedServers = (userDehive.servers || [])
                .filter((server): server is PopulatedServer => 
                    server?.server_id && 
                    typeof server.server_id === 'object' &&
                    'name' in server.server_id
                )
                .map(server => ({
                    server_id: server.server_id._id,
                    name: server.server_id.name,
                    description: server.server_id.description,
                    role: server.role,
                    is_private: server.server_id.is_private,
                    member_count: server.server_id.member_count
                }));

            return {
                servers: enhancedServers
            };
        } catch (error) {
            console.error('Get member servers error:', error);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to get member servers');
        }
    }
}
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDehive, UserDehiveDocument } from '../schemas/user-dehive.schema';
import {
  UserDehiveServer,
  UserDehiveServerDocument,
} from '../schemas/user-dehive-server.schema';
import { Server, ServerDocument } from '../schemas/server.schema';
import { ServerBan, ServerBanDocument } from '../schemas/server-ban.schema';
import { InviteLink, InviteLinkDocument } from '../schemas/invite-link.schema';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { JoinServerDto } from '../dto/join-server.dto';
import { LeaveServerDto } from '../dto/leave-server.dto';
import { GenerateInviteDto } from '../dto/generate-invite.dto';
import { KickBanDto } from '../dto/kick-ban.dto';
import { UnbanDto } from '../dto/unban.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { ServerRole } from '../enum/enum';
import { AuthServiceClient } from './auth-service.client';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class UserDehiveServerService {
  constructor(
    @InjectModel(UserDehive.name)
    private userDehiveModel: Model<UserDehiveDocument>,
    @InjectModel(UserDehiveServer.name)
    private userDehiveServerModel: Model<UserDehiveServerDocument>,
    @InjectModel(Server.name) private serverModel: Model<ServerDocument>,
    @InjectModel(ServerBan.name)
    private serverBanModel: Model<ServerBanDocument>,
    @InjectModel(InviteLink.name)
    private inviteLinkModel: Model<InviteLinkDocument>,
    private readonly authClient: AuthServiceClient,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // Helper method to find UserDehive profile (without auto-create)
  private async findUserDehiveProfile(userId: string) {
    return await this.userDehiveModel
      .findOne({ $or: [{ _id: userId }, { user_id: userId }] })
      .lean();
  }

  async joinServer(
    dto: JoinServerDto,
    userId: string,
  ): Promise<{ message: string }> {
    const serverId = new Types.ObjectId(dto.server_id);

    // 1. Ensure UserDehive profile exists (auto-create if needed)

    const userDehiveId = userId; // user_dehive_id = user_id from Decode

    const [server, isAlreadyMember, isBanned] = await Promise.all([
      this.serverModel.findById(serverId).lean(),
      this.userDehiveServerModel.exists({
        user_dehive_id: userDehiveId,
        server_id: serverId,
      }),
      this.serverBanModel.exists({
        user_dehive_id: userDehiveId,
        server_id: serverId,
      }),
    ]);

    if (!server) throw new NotFoundException(`Server not found.`);
    if (isAlreadyMember)
      throw new BadRequestException('User is already a member.');
    if (isBanned)
      throw new ForbiddenException('You are banned from this server.');
    const session = await this.serverModel.db.startSession();
    session.startTransaction();
    try {
      const newMembership = new this.userDehiveServerModel({
        user_id: new Types.ObjectId(userId),
        user_dehive_id: userDehiveId,
        server_id: serverId,
      });
      await newMembership.save({ session });
      await this.userDehiveModel.findByIdAndUpdate(
        userDehiveId,
        { $inc: { server_count: 1 } },
        { session },
      );
      await this.serverModel.findByIdAndUpdate(
        serverId,
        { $inc: { member_count: 1 } },
        { session },
      );
      await session.commitTransaction();

      // Invalidate member list cache
      await this.invalidateMemberListCache(dto.server_id);

      return { message: 'Successfully joined server.' };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException('Failed to join server.');
    } finally {
      void session.endSession();
    }
  }

  async leaveServer(
    dto: LeaveServerDto,
    userId: string,
  ): Promise<{ message: string }> {
    const serverId = new Types.ObjectId(dto.server_id);

    // Find UserDehive by user_id
    const userDehive = await this.findUserDehiveProfile(userId);

    if (!userDehive) {
      throw new NotFoundException('UserDehive profile not found.');
    }

    const userDehiveId = userId; // user_dehive_id = user_id from Decode
    const membership = await this.userDehiveServerModel.findOne({
      user_dehive_id: userDehiveId,
      server_id: serverId,
    });

    if (!membership)
      throw new BadRequestException('User is not a member of this server.');
    if (membership.role === ServerRole.OWNER)
      throw new ForbiddenException(
        'Server owner cannot leave. Transfer ownership first.',
      );

    const session = await this.userDehiveServerModel.db.startSession();
    session.startTransaction();
    try {
      await this.userDehiveServerModel
        .deleteOne({ _id: membership._id })
        .session(session);
      await this.userDehiveModel.findByIdAndUpdate(
        userDehiveId,
        { $inc: { server_count: -1 } },
        { session },
      );
      await this.serverModel.findByIdAndUpdate(
        serverId,
        { $inc: { member_count: -1 } },
        { session },
      );
      await session.commitTransaction();

      // Invalidate member list cache
      await this.invalidateMemberListCache(dto.server_id);

      return { message: 'Successfully left server.' };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException('Failed to leave server.');
    } finally {
      void session.endSession();
    }
  }

  async generateInvite(
    dto: GenerateInviteDto,
    actorBaseId: string,
  ): Promise<InviteLinkDocument> {
    const serverId = new Types.ObjectId(dto.server_id);
    const actorDehiveProfile = await this.userDehiveModel
      .findOne({ user_id: new Types.ObjectId(actorBaseId) })
      .select('_id')
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for actor.`);
    const actorDehiveId = actorDehiveProfile._id;
    const isMember = await this.userDehiveServerModel.exists({
      server_id: serverId,
      user_dehive_id: actorDehiveId,
    });
    if (!isMember)
      throw new ForbiddenException('Only server members can generate invites.');
    const { customAlphabet } = await import('nanoid');
    const nanoid = customAlphabet(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
      10,
    );
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

  async useInvite(
    code: string,
    actorBaseId: string,
  ): Promise<{ message: string }> {
    const invite = await this.inviteLinkModel.findOne({ code });
    if (!invite || invite.expiredAt < new Date())
      throw new NotFoundException('Invite link is invalid or has expired.');

    return this.joinServer(
      {
        server_id: invite.server_id.toString(),
      },
      actorBaseId,
    );
  }

  async kickOrBan(
    dto: KickBanDto,
    action: 'kick' | 'ban',
    actorBaseId: string,
  ): Promise<{ message: string }> {
    const serverId = new Types.ObjectId(dto.server_id);
    const targetDehiveId = new Types.ObjectId(dto.target_user_id);

    const actorDehiveProfile = await this.userDehiveModel
      .findOne({ user_id: new Types.ObjectId(actorBaseId) })
      .select('_id')
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for actor.`);
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
      throw new NotFoundException(
        'Target user is not a member of this server.',
      );
    if (!actorMembership)
      throw new ForbiddenException('You are not a member of this server.');
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    if (actorDehiveId.toString() === targetDehiveId.toString())
      throw new BadRequestException(
        'You cannot perform this action on yourself.',
      );
    const hasPermission =
      actorMembership.role === ServerRole.OWNER ||
      actorMembership.role === ServerRole.MODERATOR;
    if (!hasPermission)
      throw new ForbiddenException('You do not have permission.');
    if (targetMembership.role === ServerRole.OWNER)
      throw new ForbiddenException('Cannot kick or ban the server owner.');
    if (
      targetMembership.role === ServerRole.MODERATOR &&
      actorMembership.role !== ServerRole.OWNER
    )
      throw new ForbiddenException(
        'Moderators cannot kick or ban other moderators.',
      );

    const session = await this.userDehiveServerModel.db.startSession();
    session.startTransaction();
    try {
      await this.userDehiveServerModel
        .deleteOne({ _id: targetMembership._id })
        .session(session);
      await this.userDehiveModel.findByIdAndUpdate(
        targetDehiveId,
        { $inc: { server_count: -1 } },
        { session },
      );
      await this.serverModel.findByIdAndUpdate(
        serverId,
        { $inc: { member_count: -1 } },
        { session },
      );
      if (action === 'ban') {
        await this.serverBanModel.create(
          [
            {
              server_id: serverId,
              user_dehive_id: targetDehiveId,
              banned_by: actorDehiveId,
              reason: dto.reason,
            },
          ],
          { session },
        );
      }
      await session.commitTransaction();

      // Invalidate member list cache
      await this.invalidateMemberListCache(dto.server_id);

      return { message: `User successfully ${action}ed.` };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException(`Failed to ${action} user.`);
    } finally {
      void session.endSession();
    }
  }

  async unbanMember(
    dto: UnbanDto,
    actorBaseId: string,
  ): Promise<{ message: string }> {
    const serverId = new Types.ObjectId(dto.server_id);
    const targetDehiveId = new Types.ObjectId(dto.target_user_id);

    const actorDehiveProfile = await this.userDehiveModel
      .findOne({ user_id: new Types.ObjectId(actorBaseId) })
      .select('_id')
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for actor.`);
    const actorDehiveId = actorDehiveProfile._id;

    const hasPermission = await this.userDehiveServerModel.exists({
      server_id: serverId,
      user_dehive_id: actorDehiveId,
      role: { $in: [ServerRole.OWNER, ServerRole.MODERATOR] },
    });
    if (!hasPermission)
      throw new ForbiddenException(
        'You do not have permission to unban members.',
      );

    const result = await this.serverBanModel.deleteOne({
      server_id: serverId,
      user_dehive_id: targetDehiveId,
    });
    if (result.deletedCount === 0)
      throw new NotFoundException('Ban record not found for this user.');

    return { message: 'User successfully unbanned.' };
  }

  async assignRole(
    dto: AssignRoleDto,
    actorBaseId: string,
  ): Promise<UserDehiveServerDocument> {
    const serverId = new Types.ObjectId(dto.server_id);
    const targetDehiveId = new Types.ObjectId(dto.target_user_id);

    const actorDehiveProfile = await this.userDehiveModel
      .findOne({ user_id: new Types.ObjectId(actorBaseId) })
      .select('_id')
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for actor.`);
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
      throw new NotFoundException(
        'Target user is not a member of this server.',
      );
    if (!actorMembership)
      throw new ForbiddenException('You are not a member of this server.');
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    if (actorDehiveId.toString() === targetDehiveId.toString())
      throw new BadRequestException('You cannot change your own role.');
    if (actorMembership.role !== ServerRole.OWNER)
      throw new ForbiddenException('Only the server owner can assign roles.');
    if (dto.role === ServerRole.OWNER)
      throw new BadRequestException(
        'Ownership can only be transferred, not assigned.',
      );

    targetMembership.role = dto.role;
    return targetMembership.save();
  }

  async updateNotification(
    dto: UpdateNotificationDto,
    actorBaseId: string,
  ): Promise<{ message: string }> {
    const actorDehiveProfile = await this.userDehiveModel
      .findOne({ user_id: new Types.ObjectId(actorBaseId) })
      .select('_id')
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for user.`);
    const actorDehiveId = actorDehiveProfile._id;

    const result = await this.userDehiveServerModel.updateOne(
      {
        server_id: new Types.ObjectId(dto.server_id),
        user_dehive_id: actorDehiveId,
      },
      { $set: { is_muted: dto.is_muted } },
    );
    if (result.matchedCount === 0)
      throw new NotFoundException('Membership not found.');
    return { message: 'Notification settings updated successfully.' };
  }

  async getUserProfile(userId: string) {
    // 1. Fetch profile from auth service (with cache)
    const authProfile = await this.authClient.getUserProfile(userId);
    if (!authProfile) {
      throw new NotFoundException(`User profile not found: ${userId}`);
    }

    // 2. Get Dehive-specific data
    const userDehive = await this.userDehiveModel
      .findOne({ user_id: new Types.ObjectId(userId) })
      .select('bio status banner_color server_count last_login')
      .lean();

    // 3. Merge auth profile with Dehive data
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

  async getMembersInServer(serverId: string): Promise<any[]> {
    const cacheKey = `server_members:${serverId}`;

    // 1. Check cache for whole member list
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return JSON.parse(cached);
    }

    // 2. Cache miss - fetch from DB
    const memberships = await this.userDehiveServerModel
      .find({ server_id: new Types.ObjectId(serverId) })
      .lean();

    if (memberships.length === 0) {
      return [];
    }

    // 3. Extract user IDs
    const userIds = memberships.map((m) => m.user_id.toString());

    // 4. Batch get profiles from auth service (with cache)
    const profiles = await this.authClient.batchGetProfiles(userIds);

    // 5. Merge membership data with profiles
    const result = memberships.map((m) => {
      const userId = m.user_id.toString();
      const profile = profiles[userId] || {
        username: 'Unknown User',
        display_name: 'Unknown User',
        avatar: null,
      };

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        membership_id: (m._id as any).toString(),
        user_id: userId,
        user_dehive_id: m.user_dehive_id.toString(),
        username: profile.username,
        display_name: profile.display_name || profile.username,
        avatar: profile.avatar,
        role: m.role,
        is_muted: m.is_muted,
        joined_at: m.joined_at,
      };
    });

    // 6. Cache whole list for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(result));

    return result;
  }

  /**
   * Helper: Invalidate member list cache
   */
  private async invalidateMemberListCache(serverId: string): Promise<void> {
    await this.redis.del(`server_members:${serverId}`);
  }

  async getEnrichedUserProfile(targetUserId: string, viewerUserId: string) {
    // 1. Fetch target user profile from auth service (with cache)
    const targetAuthProfile =
      await this.authClient.getUserProfile(targetUserId);
    if (!targetAuthProfile) {
      throw new NotFoundException(
        `User profile not found for target user ID: ${targetUserId}`,
      );
    }

    // 2. Get Dehive profiles
    const [targetDehiveProfile] = await Promise.all([
      this.userDehiveModel
        .findOne({ user_id: new Types.ObjectId(targetUserId) })
        .lean(),
      this.userDehiveModel
        .findOne({ user_id: new Types.ObjectId(viewerUserId) })
        .lean(),
    ]);

    // Find UserDehive for viewer
    const finalViewerDehiveProfile =
      await this.findUserDehiveProfile(viewerUserId);

    if (!finalViewerDehiveProfile) {
      throw new NotFoundException('Viewer UserDehive profile not found.');
    }

    // 3. Get mutual servers
    const targetDehiveId = targetDehiveProfile?._id;
    if (!targetDehiveId) {
      // User exists in auth but not in Dehive yet
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

    const viewerServerIds = new Set(
      viewerServers.map((s) => s.server_id.toString()),
    );

    const mutualServers = targetServers.filter((s) => {
      if (!s.server_id) return false;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const serverId =
        typeof s.server_id === 'object'
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            (s.server_id as any)?._id?.toString()
          : String(s.server_id);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return serverId && viewerServerIds.has(serverId);
    });

    // 4. Merge all data
    return {
      _id: targetUserId,
      username: targetAuthProfile.username,
      display_name:
        targetAuthProfile.display_name || targetAuthProfile.username,
      email: targetAuthProfile.email,
      avatar: targetAuthProfile.avatar,
      bio: targetDehiveProfile?.bio || '',
      status: targetDehiveProfile?.status || 'offline',
      banner_color: targetDehiveProfile?.banner_color,
      mutual_servers_count: mutualServers.length,
      mutual_servers: mutualServers.map((s) => s.server_id),
    };
  }
}

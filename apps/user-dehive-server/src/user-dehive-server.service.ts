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
import { User, UserDocument } from '../../user/schemas/user.schema';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { JoinServerDto } from '../dto/join-server.dto';
import { LeaveServerDto } from '../dto/leave-server.dto';
import { GenerateInviteDto } from '../dto/generate-invite.dto';
import { KickBanDto } from '../dto/kick-ban.dto';
import { UnbanDto } from '../dto/unban.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { ServerRole } from '../constants/enum';

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
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async joinServer(dto: JoinServerDto): Promise<{ message: string }> {
    const serverId = new Types.ObjectId(dto.server_id);
    const userDehiveId = new Types.ObjectId(dto.user_dehive_id);
    const [server, dehiveProfile, isAlreadyMember, isBanned] =
      await Promise.all([
        this.serverModel.findById(serverId).lean(),
        this.userDehiveModel.findById(userDehiveId).lean(),
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
    if (!dehiveProfile)
      throw new NotFoundException(`Dehive profile not found.`);
    if (isAlreadyMember)
      throw new BadRequestException('User is already a member.');
    if (isBanned)
      throw new ForbiddenException('You are banned from this server.');
    const session = await this.serverModel.db.startSession();
    session.startTransaction();
    try {
      const newMembership = new this.userDehiveServerModel({
        user_id: dehiveProfile.user_id,
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
      return { message: 'Successfully joined server.' };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException('Failed to join server.');
    } finally {
      void session.endSession();
    }
  }

  async leaveServer(dto: LeaveServerDto): Promise<{ message: string }> {
    const serverId = new Types.ObjectId(dto.server_id);
    const userDehiveId = new Types.ObjectId(dto.user_dehive_id);
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

    const actorDehiveProfile = await this.userDehiveModel
      .findOne({ user_id: new Types.ObjectId(actorBaseId) })
      .select('_id')
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for user.`);

    return this.joinServer({
      server_id: invite.server_id.toString(),
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      user_dehive_id: actorDehiveProfile._id.toString(),
    });
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

  async getUserProfile(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).lean();
    if (!user) throw new NotFoundException(`User with ID ${userId} not found.`);
    return user;
  }

  async getMembersInServer(serverId: string): Promise<any[]> {
    const members = await this.userDehiveServerModel
      .find({ server_id: new Types.ObjectId(serverId) })
      .populate<{ user_id: UserDocument }>({
        path: 'user_id',
        model: 'User',
        select: 'username display_name',
      })
      .lean();
    return members.map((member) => {
      const baseUser = member.user_id;
      return {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        membership_id: member._id.toString(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        user_id: (baseUser as any)?._id.toString() || null,
        user_dehive_id: member.user_dehive_id.toString(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        username: (baseUser as any)?.username || 'Unknown User',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        display_name: (baseUser as any)?.display_name || 'Unknown User',
        role: member.role,
        is_muted: member.is_muted,
        joined_at: member.joined_at,
      };
    });
  }

  async getEnrichedUserProfile(targetUserId: string, viewerUserId: string) {
    const [targetDehiveProfile, viewerDehiveProfile] = await Promise.all([
      this.userDehiveModel
        .findOne({ user_id: new Types.ObjectId(targetUserId) })
        .lean(),
      this.userDehiveModel
        .findOne({ user_id: new Types.ObjectId(viewerUserId) })
        .lean(),
    ]);
    if (!targetDehiveProfile)
      throw new NotFoundException(
        `Dehive profile not found for target user ID: ${targetUserId}`,
      );
    if (!viewerDehiveProfile)
      throw new NotFoundException(
        `Dehive profile not found for viewer user ID: ${viewerUserId}`,
      );
    const baseUser = await this.userModel
      .findById(targetDehiveProfile.user_id)
      .lean();
    if (!baseUser) throw new NotFoundException(`Base user not found.`);
    const [targetServers, viewerServers] = await Promise.all([
      this.userDehiveServerModel
        .find({ user_dehive_id: targetDehiveProfile._id })
        .select('server_id')
        .populate('server_id', 'name')
        .lean(),
      this.userDehiveServerModel
        .find({ user_dehive_id: viewerDehiveProfile._id })
        .select('server_id')
        .lean(),
    ]);
    const viewerServerIds = new Set(
      viewerServers.map((s) => s.server_id.toString()),
    );
    const mutualServers = targetServers.filter(
      (s) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        s.server_id && viewerServerIds.has((s.server_id as any)._id.toString()),
    );
    return {
      _id: baseUser._id.toString(),
      username: baseUser.username,
      bio: targetDehiveProfile.bio,
      status: targetDehiveProfile.status,
      mutual_servers_count: mutualServers.length,
      mutual_servers: mutualServers.map((s) => s.server_id),
    };
  }
}

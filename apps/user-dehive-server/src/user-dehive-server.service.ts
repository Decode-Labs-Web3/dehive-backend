import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
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
import { TransferOwnershipDto } from '../dto/transfer-ownership.dto';
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
    private readonly httpService: HttpService,
  ) {}

  // Helper method to find UserDehive profile (without auto-create)
  private async findUserDehiveProfile(userId: string) {
    return await this.userDehiveModel.findById(userId).lean();
  }


  /**
   * Helper function to decode session_id and get user_dehive_id
   */
  private async getUserDehiveIdFromSession(
    sessionId: string,
  ): Promise<Types.ObjectId> {
    try {
      console.log(
        '🔍 [GET USER DEHIVE ID] Calling auth service for session:',
        sessionId,
      );
      // Call auth service to validate session and get user_dehive_id
      const response = await firstValueFrom(
        this.httpService.get<{
          success: boolean;
          data: any;
          message?: string;
        }>(`http://localhost:4006/auth/session/check`, {
          headers: {
            'x-session-id': sessionId,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }),
      );

      console.log(
        '🔍 [GET USER DEHIVE ID] Auth service response:',
        response.data,
      );

      if (!response.data.success || !response.data.data) {
        throw new NotFoundException('Invalid session for target user');
      }

      // Extract user_dehive_id from session data
      const sessionData = response.data.data;
      const sessionToken = sessionData.session_token;

      if (!sessionToken) {
        throw new NotFoundException('No session token for target user');
      }

      // Decode JWT to get _id (user_dehive_id)
      const payload = sessionToken.split('.')[1];
      const decodedPayload = JSON.parse(
        Buffer.from(payload, 'base64').toString(),
      );

      console.log('🔍 [GET USER DEHIVE ID] JWT payload:', decodedPayload);
      console.log(
        '🔍 [GET USER DEHIVE ID] Available fields:',
        Object.keys(decodedPayload),
      );
      console.log('🔍 [GET USER DEHIVE ID] Full JWT payload values:', JSON.stringify(decodedPayload, null, 2));

      // Try different possible field names
      const userDehiveId =
        decodedPayload._id ||
        decodedPayload.user_id ||
        decodedPayload.sub ||
        decodedPayload.id ||
        decodedPayload.user_dehive_id;
      console.log(
        '🔍 [GET USER DEHIVE ID] Found user_dehive_id:',
        userDehiveId,
      );

      if (!userDehiveId) {
        console.log('❌ [GET USER DEHIVE ID] No user_dehive_id found in JWT payload');
        throw new NotFoundException('No user_dehive_id in target session');
      }

      console.log('✅ [GET USER DEHIVE ID] Successfully resolved session to user_dehive_id:', userDehiveId);
      return new Types.ObjectId(userDehiveId);
    } catch (error) {
      throw new NotFoundException(
        `Failed to get user_dehive_id from session: ${error.message}`,
      );
    }
  }

  async joinServer(
    dto: JoinServerDto,
    userId: string,
  ): Promise<{ message: string }> {
    const serverId = new Types.ObjectId(dto.server_id);

    // 1. Ensure UserDehive profile exists (auto-create if needed)

    const userDehiveId = userId; // user_dehive_id = _id from AuthGuard

    // Check if user is banned from this specific server
    const userDehiveProfile = await this.userDehiveModel
      .findById(userId)
      .lean();

    if (!userDehiveProfile) {
      throw new NotFoundException('UserDehive profile not found.');
    }

    const isBannedFromServer = userDehiveProfile.banned_by_servers?.includes(
      serverId.toString(),
    );

    const [server, isAlreadyMember] = await Promise.all([
      this.serverModel.findById(serverId).lean(),
      this.userDehiveServerModel.exists({
        user_dehive_id: userDehiveId,
        server_id: serverId,
      }),
    ]);

    if (!server) throw new NotFoundException(`Server not found.`);
    if (isAlreadyMember)
      throw new BadRequestException('User is already a member.');
    if (isBannedFromServer)
      throw new ForbiddenException('You are banned from this server.');
    const session = await this.serverModel.db.startSession();
    session.startTransaction();
    try {
      const newMembership = new this.userDehiveServerModel({
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

    // Find UserDehive by _id
    const userDehive = await this.findUserDehiveProfile(userId);

    if (!userDehive) {
      throw new NotFoundException('UserDehive profile not found.');
    }

    const userDehiveId = userId; // user_dehive_id = _id from AuthGuard
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
      .findById(actorBaseId)
      .select('_id')
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for actor.`);
    const actorDehiveId = actorDehiveProfile._id;
    const isMember = await this.userDehiveServerModel.exists({
      server_id: serverId,
      user_dehive_id: actorBaseId, // Use string instead of ObjectId
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

    // Use target_user_dehive_id directly
    console.log('🎯 [KICK/BAN] target_user_dehive_id:', dto.target_user_dehive_id);
    const targetDehiveId = new Types.ObjectId(dto.target_user_dehive_id);
    console.log('🎯 [KICK/BAN] targetDehiveId resolved:', targetDehiveId);

    const actorDehiveProfile = await this.userDehiveModel
      .findById(actorBaseId)
      .select('_id')
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for actor.`);
    const actorDehiveId = actorDehiveProfile._id;

    console.log('🎯 [KICK/BAN] serverId:', serverId);
    console.log('🎯 [KICK/BAN] targetDehiveId:', targetDehiveId);
    console.log('🎯 [KICK/BAN] actorDehiveId:', actorDehiveId);

    // Debug: Check what we're querying for
    console.log('🔍 [KICK/BAN] Querying for targetMembership with:');
    console.log('🔍 [KICK/BAN] - server_id:', serverId);
    console.log('🔍 [KICK/BAN] - user_dehive_id:', targetDehiveId);
    console.log('🔍 [KICK/BAN] - server_id type:', typeof serverId);
    console.log('🔍 [KICK/BAN] - user_dehive_id type:', typeof targetDehiveId);

    // Debug: Check all memberships in this server first
    const allMemberships = await this.userDehiveServerModel.find({
      server_id: serverId,
    }).lean();
    console.log('🔍 [KICK/BAN] All memberships in server:', allMemberships.length);
    console.log('🔍 [KICK/BAN] All user_dehive_ids in server:', allMemberships.map(m => m.user_dehive_id.toString()));
    console.log('🔍 [KICK/BAN] Looking for targetDehiveId:', targetDehiveId.toString());
    console.log('🔍 [KICK/BAN] Looking for actorDehiveId:', actorDehiveId.toString());

          // Try both ObjectId and string comparison for user_dehive_id
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
        // Add server to user's banned_by_servers array
        await this.userDehiveModel.findByIdAndUpdate(
          targetDehiveId,
          {
            $addToSet: { banned_by_servers: serverId.toString() },
            $set: { is_banned: true },
          },
          { session },
        );

        // Also create ban record for audit
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

    // Use target_user_dehive_id directly
    const targetDehiveId = new Types.ObjectId(dto.target_user_dehive_id);

    const actorDehiveProfile = await this.userDehiveModel
      .findById(actorBaseId)
      .select('_id')
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for actor.`);
    const actorDehiveId = actorDehiveProfile._id;

    const hasPermission = await this.userDehiveServerModel.exists({
      server_id: serverId,
      $or: [
        { user_dehive_id: actorDehiveId },
        { user_dehive_id: actorDehiveId.toString() }
      ],
      role: { $in: [ServerRole.OWNER, ServerRole.MODERATOR] },
    });
    if (!hasPermission)
      throw new ForbiddenException(
        'You do not have permission to unban members.',
      );

    // Remove server from user's banned_by_servers array
    const result = await this.userDehiveModel.findByIdAndUpdate(
      targetDehiveId,
      {
        $pull: { banned_by_servers: serverId.toString() },
      },
    );

    if (!result) {
      throw new NotFoundException('User not found.');
    }

    // Check if user is still banned by any server
    const updatedUser = await this.userDehiveModel.findById(targetDehiveId);
    if (updatedUser && updatedUser.banned_by_servers.length === 0) {
      await this.userDehiveModel.findByIdAndUpdate(targetDehiveId, {
        $set: { is_banned: false },
      });
    }

    // Also remove from ban records for audit
    await this.serverBanModel.deleteOne({
      server_id: serverId,
      user_dehive_id: targetDehiveId,
    });

    return { message: 'User successfully unbanned.' };
  }

  async assignRole(
    dto: AssignRoleDto,
    actorBaseId: string,
  ): Promise<UserDehiveServerDocument> {
    const serverId = new Types.ObjectId(dto.server_id);

    // Use target_user_dehive_id directly
    const targetDehiveId = new Types.ObjectId(dto.target_user_dehive_id);

    const actorDehiveProfile = await this.userDehiveModel
      .findById(actorBaseId)
      .select('_id')
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for actor.`);
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

  async transferOwnership(
    dto: TransferOwnershipDto,
    currentOwnerId: string,
  ): Promise<{ message: string }> {
    const serverId = new Types.ObjectId(dto.server_id);
    const newOwnerDehiveId = new Types.ObjectId(dto.user_dehive_id);

    // Get current owner profile
    const currentOwnerProfile = await this.userDehiveModel
      .findById(currentOwnerId)
      .select('_id')
      .lean();
    if (!currentOwnerProfile)
      throw new NotFoundException(`Dehive profile not found for current owner.`);
    const currentOwnerDehiveId = currentOwnerProfile._id;

    // Find current owner and new owner memberships
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

    // Validate current owner
    if (!currentOwnerMembership)
      throw new ForbiddenException('You are not a member of this server.');
    if (currentOwnerMembership.role !== ServerRole.OWNER)
      throw new ForbiddenException('Only the server owner can transfer ownership.');

    // Validate new owner
    if (!newOwnerMembership)
      throw new NotFoundException('New owner is not a member of this server.');
    if (currentOwnerDehiveId.toString() === newOwnerDehiveId.toString())
      throw new BadRequestException('You cannot transfer ownership to yourself.');

    // Use transaction to ensure atomicity
    const session = await this.userDehiveServerModel.db.startSession();
    session.startTransaction();
    try {
      // Change current owner role to MEMBER
      await this.userDehiveServerModel.updateOne(
        { _id: currentOwnerMembership._id },
        { $set: { role: ServerRole.MEMBER } },
        { session }
      );

      // Change new owner role to OWNER
      await this.userDehiveServerModel.updateOne(
        { _id: newOwnerMembership._id },
        { $set: { role: ServerRole.OWNER } },
        { session }
      );

      await session.commitTransaction();

      // Invalidate member list cache
      await this.invalidateMemberListCache(dto.server_id);

      return { message: 'Ownership transferred successfully.' };
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException('Failed to transfer ownership.');
    } finally {
      void session.endSession();
    }
  }

  async updateNotification(
    dto: UpdateNotificationDto,
    actorBaseId: string,
  ): Promise<{ message: string }> {
    const actorDehiveProfile = await this.userDehiveModel
      .findById(actorBaseId)
      .select('_id')
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for user.`);
    const actorDehiveId = actorDehiveProfile._id;

    const result = await this.userDehiveServerModel.updateOne(
      {
        server_id: new Types.ObjectId(dto.server_id),
        $or: [
          { user_dehive_id: actorDehiveId },
          { user_dehive_id: actorDehiveId.toString() }
        ]
      },
      { $set: { is_muted: dto.is_muted } },
    );
    if (result.matchedCount === 0)
      throw new NotFoundException('Membership not found.');
    return { message: 'Notification settings updated successfully.' };
  }

  async getUserProfileBySession(targetSessionId: string, currentUser: any) {
    console.log('🎯 [GET USER PROFILE BY SESSION] targetSessionId:', targetSessionId);
    console.log('🎯 [GET USER PROFILE BY SESSION] currentUser:', currentUser);

    // 1. Decode target session_id to get user_dehive_id
    const targetUserId = await this.getUserDehiveIdFromSession(targetSessionId);
    console.log('🎯 [GET USER PROFILE BY SESSION] targetUserId from session:', targetUserId);

    // 2. Check if viewing own profile or different user
    const isOwnProfile = targetUserId.toString() === currentUser._id;
    console.log('🎯 [GET USER PROFILE BY SESSION] isOwnProfile:', isOwnProfile);

    // 3. Use currentUser data directly
    const authProfile = {
      username: currentUser.username,
      display_name: currentUser.display_name,
      avatar: currentUser.avatar,
    };

    // 4. Get Dehive-specific data
    const userDehive = await this.userDehiveModel
      .findById(targetUserId)
      .select('bio status banner_color server_count last_login')
      .lean();

    // 5. Merge auth profile with Dehive data
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

  async getUserProfileByUserDehiveId(userDehiveId: string, currentUser: any) {
    console.log('🎯 [GET USER PROFILE BY USER DEHIVE ID] userDehiveId:', userDehiveId);
    console.log('🎯 [GET USER PROFILE BY USER DEHIVE ID] currentUser:', currentUser);

    // 1. Use currentUser data directly (already contains full data from AuthGuard)
    // AuthGuard đã lấy được full data từ auth service, không cần gọi lại
    let targetUserAuthProfile: any = null;

    // Check if we're viewing the same user (currentUser is the target user)
    if (currentUser._id === userDehiveId) {
      // Use currentUser data directly (already has full data from AuthGuard)
      targetUserAuthProfile = currentUser;
    } else {
      // For different user, try to get from auth service
      try {
        const sessionId = currentUser.session_id || 'test_session_' + userDehiveId;
        const fingerprintHashed = currentUser.fingerprint_hashed || 'test_fingerprint';

        targetUserAuthProfile = await this.authClient.getUserProfile(
          userDehiveId,
          sessionId,
          fingerprintHashed
        );
      } catch (error) {
        console.error('Error getting target user auth profile:', error);
        // Fallback to currentUser data if auth service fails
        targetUserAuthProfile = currentUser;
      }
    }

    // 2. Get target user's Dehive profile
    const userDehive = await this.userDehiveModel
      .findById(userDehiveId)
      .select('bio status banner_color server_count last_login')
      .lean();

    if (!userDehive) {
      throw new NotFoundException('User profile not found');
    }

    // 3. Return full auth profile data + dehive data
    if (targetUserAuthProfile) {
      // Return full auth data from getUser + dehive data
      return {
        ...targetUserAuthProfile,
        dehive_data: {
          bio: userDehive.bio || '',
          status: userDehive.status || 'offline',
          banner_color: userDehive.banner_color,
          server_count: userDehive.server_count || 0,
          last_login: userDehive.last_login,
        },
      };
    } else {
      // Fallback to currentUser data + dehive data
      return {
        username: currentUser.username,
        display_name: currentUser.display_name,
        avatar: currentUser.avatar,
        dehive_data: {
          bio: userDehive.bio || '',
          status: userDehive.status || 'offline',
          banner_color: userDehive.banner_color,
          server_count: userDehive.server_count || 0,
          last_login: userDehive.last_login,
        },
      };
    }
  }

  async getUserProfile(userId: string, currentUser: any) {

    let targetUserAuthData = null;
    try {
      const decodeServiceUrl = process.env.DECODE_SERVICE_URL || 'http://localhost:4006';
      const response = await firstValueFrom(
        this.httpService.get(`${decodeServiceUrl}/auth/profile/${userId}`)
      );
      targetUserAuthData = response.data.data;
    } catch (error) {
      console.error('Error getting target user auth data:', error);
      targetUserAuthData = currentUser;
    }

    const authProfile = {
      username: currentUser.username,
      display_name: currentUser.display_name,
      avatar: currentUser.avatar,
    };

    const userDehive = await this.userDehiveModel
      .findById(userId)
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

  async getMembersInServer(serverId: string, currentUser: any): Promise<any[]> {
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
    const userIds = memberships.map((m) => m.user_dehive_id.toString());

    // 4. Get user profiles from auth service
    let userProfiles = new Map<string, any>();
    try {
      const sessionId = currentUser.session_id || 'test_session_' + serverId;
      const fingerprintHashed = currentUser.fingerprint_hashed || 'test_fingerprint';

      userProfiles = await this.authClient.getBatchUserProfiles(
        userIds,
        sessionId,
        fingerprintHashed
      );
    } catch (error) {
      console.error('Error getting user profiles from auth service:', error);
      // Fallback to currentUser data for all members
      userProfiles = new Map();
    }

    console.log('🔍 [GET MEMBERS] Using auth service profiles for members:', userProfiles.size);

    const result = memberships.map((m) => {
      const userId = m.user_dehive_id.toString();
      const userProfile = userProfiles.get(userId);

      console.log('🔍 [GET MEMBERS] userId:', userId, 'hasProfile:', !!userProfile);

      // Use full auth service profile if available, otherwise fallback to currentUser
      const memberProfile = userProfile || {
        username: currentUser.username,
        display_name: currentUser.display_name,
        avatar: currentUser.avatar,
      };

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        membership_id: (m._id as any).toString(),
        user_dehive_id: m.user_dehive_id.toString(),
        ...memberProfile, // Spread full auth profile data
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

  async getEnrichedUserProfile(targetSessionId: string, viewerUserId: string, currentUser: any) {

    // 1. Decode target session_id to get user_dehive_id
    const targetUserId = await this.getUserDehiveIdFromSession(targetSessionId);
    console.log('🎯 [GET ENRICHED PROFILE] targetUserId from session:', targetUserId);

    // 2. Use currentUser data for ALL profiles
    console.log('🎯 [GET ENRICHED PROFILE] Using currentUser data for ALL profiles:', currentUser);

    // 3. Use currentUser data directly
    const authProfile = {
      username: currentUser.username,
      display_name: currentUser.display_name,
      avatar: currentUser.avatar,
    };

    // 3. Get Dehive profiles
    const [targetDehiveProfile] = await Promise.all([
      this.userDehiveModel.findById(targetUserId).lean(),
      this.userDehiveModel.findById(viewerUserId).lean(),
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
        username: currentUser.username,
        display_name: currentUser.display_name,
        avatar: currentUser.avatar,
        bio: '',
        status: 'offline',
        mutual_servers_count: 0,
        mutual_servers: [],
      };
    }

    // Debug: Check if users exist in user_dehive collection
    console.log('🔍 [MUTUAL SERVERS] Checking if users exist in user_dehive collection...');
    const [targetUserExists, viewerUserExists] = await Promise.all([
      this.userDehiveModel.findById(targetDehiveId).lean(),
      this.userDehiveModel.findById(finalViewerDehiveProfile?._id).lean(),
    ]);


    const [targetServers, viewerServers] = await Promise.all([
      this.userDehiveServerModel
        .find({ user_dehive_id: targetDehiveId.toString() })
        .select('server_id')
        .populate('server_id', 'name icon')
        .lean(),
      this.userDehiveServerModel
        .find({ user_dehive_id: finalViewerDehiveProfile?._id.toString() })
        .select('server_id')
        .lean(),
    ]);


    const targetServersAlt = await this.userDehiveServerModel
      .find({ user_dehive_id: targetDehiveId.toString() })
      .select('server_id')
      .lean();
    const viewerServersAlt = await this.userDehiveServerModel
      .find({ user_dehive_id: finalViewerDehiveProfile?._id.toString() })
      .select('server_id')
      .lean();


    // Debug: Check all memberships in database
    const allMemberships = await this.userDehiveServerModel.find({}).lean();

    const viewerServerIds = new Set(
      viewerServers.map((s) => s.server_id.toString()),
    );

    console.log('🔍 [MUTUAL SERVERS] viewerServerIds:', Array.from(viewerServerIds));

    const mutualServers = targetServers.filter((s) => {
      if (!s.server_id) return false;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const serverId =
        typeof s.server_id === 'object'
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            (s.server_id as any)?._id?.toString()
          : String(s.server_id);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const isMutual = serverId && viewerServerIds.has(serverId);
      console.log('🔍 [MUTUAL SERVERS] Checking server:', serverId, 'isMutual:', isMutual);
      return isMutual;
    });

    console.log('🔍 [MUTUAL SERVERS] mutualServers count:', mutualServers.length);

    // 4. Merge all data
    return {
      _id: targetUserId,
      username: currentUser.username,
      display_name: currentUser.display_name,
      avatar: currentUser.avatar,
      bio: targetDehiveProfile?.bio || '',
      status: targetDehiveProfile?.status || 'offline',
      banner_color: targetDehiveProfile?.banner_color,
      mutual_servers_count: mutualServers.length,
      mutual_servers: mutualServers.map((s) => s.server_id),
    };
  }

  async getEnrichedUserProfileByUserDehiveId(userDehiveId: string, viewerUserId: string, currentUser: any) {
    console.log('🎯 [GET ENRICHED PROFILE BY USER DEHIVE ID] Starting enriched profile fetch...');
    console.log('🎯 [GET ENRICHED PROFILE BY USER DEHIVE ID] userDehiveId:', userDehiveId);
    console.log('🎯 [GET ENRICHED PROFILE BY USER DEHIVE ID] viewerUserId:', viewerUserId);
    console.log('🎯 [GET ENRICHED PROFILE BY USER DEHIVE ID] currentUser:', currentUser);

    // 1. Use currentUser data directly (already contains full data from AuthGuard)
    // AuthGuard đã lấy được full data từ auth service, không cần gọi lại
    let targetUserAuthProfile: any = null;

    // Check if we're viewing the same user (currentUser is the target user)
    if (currentUser._id === userDehiveId) {
      // Use currentUser data directly (already has full data from AuthGuard)
      targetUserAuthProfile = currentUser;
    } else {
      // For different user, try to get from auth service
      try {
        const sessionId = currentUser.session_id || 'test_session_' + userDehiveId;
        const fingerprintHashed = currentUser.fingerprint_hashed || 'test_fingerprint';

        targetUserAuthProfile = await this.authClient.getUserProfile(
          userDehiveId,
          sessionId,
          fingerprintHashed
        );
      } catch (error) {
        console.error('Error getting target user auth profile:', error);
        targetUserAuthProfile = currentUser;
      }
    }

    // 2. Get target user's Dehive profile
    const targetDehiveProfile = await this.userDehiveModel
      .findById(userDehiveId)
      .select('bio status banner_color')
      .lean();

    if (!targetDehiveProfile) {
      throw new NotFoundException('Target user profile not found');
    }

    // 3. Get viewer's Dehive profile for mutual servers calculation
    const finalViewerDehiveProfile = await this.findUserDehiveProfile(viewerUserId);
    if (!finalViewerDehiveProfile) {
      throw new NotFoundException('Viewer UserDehive profile not found.');
    }

    // 4. Prepare auth profile data (full data from getUser)
    const authProfile = targetUserAuthProfile || {
      username: currentUser.username,
      display_name: currentUser.display_name,
      avatar: currentUser.avatar,
    };

    // 5. Get mutual servers
    const targetDehiveId = targetDehiveProfile._id;

    // Debug: Check if users exist in user_dehive collection
    console.log('🔍 [MUTUAL SERVERS] Checking if users exist in user_dehive collection...');
    const [targetUserExists, viewerUserExists] = await Promise.all([
      this.userDehiveModel.findById(targetDehiveId).lean(),
      this.userDehiveModel.findById(finalViewerDehiveProfile?._id).lean(),
    ]);
    console.log('🔍 [MUTUAL SERVERS] targetUserExists:', !!targetUserExists);
    console.log('🔍 [MUTUAL SERVERS] viewerUserExists:', !!viewerUserExists);

    const [targetServers, viewerServers] = await Promise.all([
      this.userDehiveServerModel
        .find({ user_dehive_id: targetDehiveId.toString() })
        .select('server_id')
        .populate('server_id', 'name icon')
        .lean(),
      this.userDehiveServerModel
        .find({ user_dehive_id: finalViewerDehiveProfile?._id.toString() })
        .select('server_id')
        .lean(),
    ]);

    console.log('🔍 [MUTUAL SERVERS] targetDehiveId for query:', targetDehiveId);
    console.log('🔍 [MUTUAL SERVERS] viewerDehiveId for query:', finalViewerDehiveProfile?._id);
    console.log('🔍 [MUTUAL SERVERS] targetServers query result:', targetServers.length);
    console.log('🔍 [MUTUAL SERVERS] viewerServers query result:', viewerServers.length);
    console.log('🔍 [MUTUAL SERVERS] targetServers data:', JSON.stringify(targetServers, null, 2));
    console.log('🔍 [MUTUAL SERVERS] viewerServers data:', JSON.stringify(viewerServers, null, 2));

    // Debug: Try different query approaches for mutual servers
    console.log('🔍 [MUTUAL SERVERS] Trying alternative queries...');
    const targetServersAlt = await this.userDehiveServerModel
      .find({ user_dehive_id: targetDehiveId.toString() })
      .select('server_id')
      .lean();
    const viewerServersAlt = await this.userDehiveServerModel
      .find({ user_dehive_id: finalViewerDehiveProfile?._id.toString() })
      .select('server_id')
      .lean();
    console.log('🔍 [MUTUAL SERVERS] targetServersAlt (string):', targetServersAlt.length);
    console.log('🔍 [MUTUAL SERVERS] viewerServersAlt (string):', viewerServersAlt.length);
    console.log('🔍 [MUTUAL SERVERS] targetServersAlt data:', JSON.stringify(targetServersAlt, null, 2));
    console.log('🔍 [MUTUAL SERVERS] viewerServersAlt data:', JSON.stringify(viewerServersAlt, null, 2));

    console.log('🔍 [MUTUAL SERVERS] targetServers:', targetServers.length);
    console.log('🔍 [MUTUAL SERVERS] viewerServers:', viewerServers.length);
    console.log('🔍 [MUTUAL SERVERS] targetDehiveId:', targetDehiveId);
    console.log('🔍 [MUTUAL SERVERS] viewerDehiveId:', finalViewerDehiveProfile?._id);
    console.log('🔍 [MUTUAL SERVERS] targetServers data:', targetServers);
    console.log('🔍 [MUTUAL SERVERS] viewerServers data:', viewerServers);

    // Debug: Check all memberships in database
    const allMemberships = await this.userDehiveServerModel.find({}).lean();
    console.log('🔍 [MUTUAL SERVERS] All memberships in database:', allMemberships.length);
    console.log('🔍 [MUTUAL SERVERS] All user_dehive_ids in database:', allMemberships.map(m => m.user_dehive_id.toString()));
    console.log('🔍 [MUTUAL SERVERS] All server_ids in database:', allMemberships.map(m => m.server_id.toString()));

    const viewerServerIds = new Set(
      viewerServers.map((s) => s.server_id.toString()),
    );

    console.log('🔍 [MUTUAL SERVERS] viewerServerIds:', Array.from(viewerServerIds));

    const mutualServers = targetServers.filter((s) => {
      if (!s.server_id) return false;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const serverId =
        typeof s.server_id === 'object'
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            (s.server_id as any)?._id?.toString()
          : String(s.server_id);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const isMutual = serverId && viewerServerIds.has(serverId);
      console.log('🔍 [MUTUAL SERVERS] Checking server:', serverId, 'isMutual:', isMutual);
      return isMutual;
    });

    console.log('🔍 [MUTUAL SERVERS] mutualServers count:', mutualServers.length);

    // 6. Merge all data - return full auth data + mutual servers
    return {
      ...authProfile,
      _id: userDehiveId,
      bio: targetDehiveProfile.bio || '',
      status: targetDehiveProfile.status || 'offline',
      banner_color: targetDehiveProfile.banner_color,
      mutual_servers_count: mutualServers.length,
      mutual_servers: mutualServers.map((s) => s.server_id),
    };
  }
}

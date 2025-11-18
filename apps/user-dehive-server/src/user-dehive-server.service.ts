import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from "@nestjs/common";
import { ServerEventsGateway } from "../../server/gateway/server-events.gateway";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  UserDehive,
  UserDehiveDocument,
  UserDehiveLean,
} from "../schemas/user-dehive.schema";
import {
  UserDehiveServer,
  UserDehiveServerDocument,
} from "../schemas/user-dehive-server.schema";
import { Server, ServerDocument } from "../schemas/server.schema";
import { ServerBan, ServerBanDocument } from "../schemas/server-ban.schema";
import { InviteLink, InviteLinkDocument } from "../schemas/invite-link.schema";
import { AuditLogAction } from "../enum/enum";
import { AuditLogService } from "./audit-log.service";
import { AssignRoleDto } from "../dto/assign-role.dto";
import { TransferOwnershipDto } from "../dto/transfer-ownership.dto";
import { JoinServerDto } from "../dto/join-server.dto";
import { LeaveServerDto } from "../dto/leave-server.dto";
import { GenerateInviteDto } from "../dto/generate-invite.dto";
import { KickBanDto } from "../dto/kick-ban.dto";
import { UnbanDto } from "../dto/unban.dto";
import { UpdateNotificationDto } from "../dto/update-notification.dto";
import { UpdateBioDto } from "../dto/update-bio.dto";
import { UpdateAvatarDto } from "../dto/update-avatar.dto";
import { UpdateDisplayNameDto } from "../dto/update-display-name.dto";
import { ServerRole } from "../enum/enum";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";
import { DecodeApiClient } from "../clients/decode-api.client";
import { UserProfile } from "../interfaces/user-profile.interface";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";
import {
  BannedUser,
  BanListResponse,
} from "../interfaces/banned-user.interface";
import { NftVerificationService } from "../../server/src/services/nft-verification.service";

@Injectable()
export class UserDehiveServerService {
  private readonly logger = new Logger(UserDehiveServerService.name);
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
    private readonly auditLogService: AuditLogService,
    private readonly decodeApiClient: DecodeApiClient,
    @InjectRedis() private readonly redis: Redis,
    private readonly nftVerificationService: NftVerificationService,
    @Inject(forwardRef(() => ServerEventsGateway))
    private readonly serverEventsGateway: ServerEventsGateway,
  ) {}

  private async findUserDehiveProfile(userId: string) {
    return await this.userDehiveModel.findById(userId).lean();
  }

  // Get audit logs (ADMIN/MODERATOR ONLY)
  async getAuditLogs(
    serverId: string,
    userId: string,
    sessionId: string,
    options: { action?: AuditLogAction; page?: number; limit?: number },
  ) {
    // Check if user is admin or moderator
    const member = await this.userDehiveServerModel.findOne({
      user_dehive_id: userId,
      server_id: new Types.ObjectId(serverId),
    });

    if (
      !member ||
      (member.role !== ServerRole.OWNER && member.role !== ServerRole.MODERATOR)
    ) {
      throw new ForbiddenException(
        "Only admins and moderators can view audit logs",
      );
    }

    const query: Record<string, unknown> = {
      server_id: new Types.ObjectId(serverId),
    };
    if (options.action) {
      query.action = options.action;
    }

    const page = options.page || 0;
    const limit = options.limit || 20;
    const skip = page * limit;

    const serverAuditLogModel = this.auditLogService.getModel();

    const logs = (await serverAuditLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean()
      .exec()) as unknown as Array<{
      _id: Types.ObjectId;
      server_id: Types.ObjectId;
      actor_id: Types.ObjectId;
      target_id?: Types.ObjectId;
      action: AuditLogAction;
      changes?: Record<string, unknown>;
      reason?: string;
      createdAt: Date;
      updatedAt: Date;
    }>;

    const total = await serverAuditLogModel.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const isLastPage = page >= totalPages - 1;

    // Fetch actor details from external API and format messages
    const formattedLogs = await Promise.all(
      logs.map(async (log) => {
        const actorId = log.actor_id.toString();

        // Fetch actor profile from external API
        const actorProfile = await this.decodeApiClient.getUserById(
          actorId,
          sessionId,
        );

        const actorInfo = {
          _id: actorId,
          username: actorProfile?.username || "Unknown User",
          display_name:
            actorProfile?.display_name ||
            actorProfile?.username ||
            "Unknown User",
          avatar: actorProfile?.avatar_ipfs_hash || null,
        };

        // Fetch target profile if target_id exists (for formatted message only)
        let targetInfo;
        if (log.target_id) {
          const targetId = log.target_id.toString();
          const targetProfile = await this.decodeApiClient.getUserById(
            targetId,
            sessionId,
          );
          targetInfo = {
            username: targetProfile?.username || "Unknown User",
            display_name:
              targetProfile?.display_name ||
              targetProfile?.username ||
              "Unknown User",
          };
        }

        // Format the message based on action type
        const actorName = actorInfo.display_name || actorInfo.username;
        const targetName =
          targetInfo?.display_name || targetInfo?.username || "Unknown";
        let message = "";

        switch (log.action) {
          case AuditLogAction.MEMBER_JOIN:
            message = `${actorName} joined the server`;
            break;
          case AuditLogAction.MEMBER_LEAVE:
            message = `${actorName} left the server`;
            break;
          case AuditLogAction.MEMBER_KICK:
            message = log.reason
              ? `${actorName} kicked ${targetName} from the server. Reason: ${log.reason}`
              : `${actorName} kicked ${targetName} from the server`;
            break;
          case AuditLogAction.MEMBER_BAN:
            message = log.reason
              ? `${actorName} banned ${targetName} from the server. Reason: ${log.reason}`
              : `${actorName} banned ${targetName} from the server`;
            break;
          case AuditLogAction.MEMBER_UNBAN:
            message = `${actorName} unbanned ${targetName}`;
            break;
          case AuditLogAction.INVITE_CREATE:
            if (log.changes?.code && log.changes?.expiredAt) {
              message = `${actorName} created an invite code "${log.changes.code}" that expires at ${new Date(log.changes.expiredAt as string).toLocaleString()}`;
            } else {
              message = `${actorName} created an invite code`;
            }
            break;
          case AuditLogAction.INVITE_DELETE:
            message = log.changes?.code
              ? `${actorName} deleted invite code "${log.changes.code}"`
              : `${actorName} deleted an invite code`;
            break;
          case AuditLogAction.ROLE_UPDATE:
            if (log.changes?.old_role && log.changes?.new_role) {
              message = `${actorName} changed ${targetName}'s role from ${log.changes.old_role} to ${log.changes.new_role}`;
            } else {
              message = `${actorName} updated ${targetName}'s role`;
            }
            break;
          case AuditLogAction.SERVER_UPDATE:
            if (log.changes?.name && log.changes?.description) {
              message = `${actorName} updated the server name to "${log.changes.name}" and description to "${log.changes.description}"`;
            } else if (log.changes?.name) {
              message = `${actorName} updated the server name to "${log.changes.name}"`;
            } else if (log.changes?.description) {
              message = `${actorName} updated the server description to "${log.changes.description}"`;
            } else {
              message = `${actorName} updated server settings`;
            }
            break;
          case AuditLogAction.CATEGORY_CREATE:
            message = log.changes?.name
              ? `${actorName} created category "${log.changes.name}"`
              : `${actorName} created a category`;
            break;
          case AuditLogAction.CATEGORY_UPDATE:
            if (log.changes?.old_name && log.changes?.new_name) {
              message = `${actorName} renamed category from "${log.changes.old_name}" to "${log.changes.new_name}"`;
            } else if (log.changes?.new_name) {
              message = `${actorName} updated category name to "${log.changes.new_name}"`;
            } else {
              message = `${actorName} updated a category`;
            }
            break;
          case AuditLogAction.CATEGORY_DELETE:
            message = log.changes?.name
              ? `${actorName} deleted category "${log.changes.name}"`
              : `${actorName} deleted a category`;
            break;
          case AuditLogAction.CHANNEL_CREATE:
            if (log.changes?.name && log.changes?.type) {
              message = `${actorName} created ${log.changes.type} channel "${log.changes.name}"`;
            } else if (log.changes?.name) {
              message = `${actorName} created channel "${log.changes.name}"`;
            } else {
              message = `${actorName} created a channel`;
            }
            break;
          case AuditLogAction.CHANNEL_UPDATE:
            message = log.changes?.name
              ? `${actorName} updated channel name to "${log.changes.name}"`
              : `${actorName} updated a channel`;
            break;
          case AuditLogAction.CHANNEL_DELETE:
            if (log.changes?.name && log.changes?.type) {
              message = `${actorName} deleted ${log.changes.type} channel "${log.changes.name}"`;
            } else if (log.changes?.name) {
              message = `${actorName} deleted channel "${log.changes.name}"`;
            } else {
              message = `${actorName} deleted a channel`;
            }
            break;
          case AuditLogAction.MESSAGE_DELETE:
            if (log.changes?.channel_name) {
              message = `${actorName} deleted a message in channel "${log.changes.channel_name}"`;
            } else if (log.changes?.channel_id) {
              message = `${actorName} deleted a message in channel ${log.changes.channel_id}`;
            } else {
              message = `${actorName} deleted a message`;
            }
            break;
          default:
            message = `${actorName} performed action: ${log.action}`;
        }

        // Return log without target_id and with formatted message
        return {
          _id: log._id,
          server_id: log.server_id,
          actor: actorInfo,
          action: log.action,
          message, // Human-readable message
          reason: log.reason,
          createdAt: log.createdAt,
          updatedAt: log.updatedAt,
        };
      }),
    );

    return {
      statusCode: 200,
      success: true,
      message: "Audit logs retrieved successfully",
      data: {
        logs: formattedLogs,
        total,
        page,
        limit,
        total_pages: totalPages,
        is_last_page: isLastPage,
      },
    };
  }

  async joinServer(
    dto: JoinServerDto,
    userId: string,
    sessionId: string,
  ): Promise<{
    server_id: string;
    server_name: string;
    server?: Record<string, unknown>;
  }> {
    const serverId = new Types.ObjectId(dto.server_id);

    const userDehiveId = userId;

    const userDehiveProfile = await this.userDehiveModel
      .findById(userId)
      .lean();

    if (!userDehiveProfile) {
      throw new NotFoundException("UserDehive profile not found.");
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
    if (isAlreadyMember) {
      // User is already a member, return full server info for frontend
      const serverDoc = await this.serverModel.findById(serverId);
      const serverObj = serverDoc?.toObject ? serverDoc.toObject() : serverDoc;
      return {
        server_id: dto.server_id,
        server_name: server.name,
        server: (serverObj ?? {}) as Record<string, unknown>,
      };
    }
    if (isBannedFromServer)
      throw new ForbiddenException("You are banned from this server.");

    // ✅ NFT Gating Check
    if (server.nft_gated?.enabled) {
      // Lấy thông tin user profile để có wallet address
      const userProfile = await this.decodeApiClient.getUserById(
        userId,
        sessionId,
      );

      // Check xem user có wallet không
      if (!userProfile?.wallets || userProfile.wallets.length === 0) {
        throw new ForbiddenException(
          "You need to connect a wallet to join this NFT-gated server.",
        );
      }

      // Lấy primary wallet hoặc wallet đầu tiên
      const primaryWallet = userProfile.wallets.find(
        (w: { is_primary?: boolean }) => w.is_primary,
      );
      const walletToCheck = primaryWallet || userProfile.wallets[0];

      // Verify NFT ownership
      const nftVerification = await this.nftVerificationService.verifyNftAccess(
        (walletToCheck as { address: string }).address,
        {
          network: server.nft_gated.network,
          contract_address: server.nft_gated.contract_address,
          required_balance: server.nft_gated.required_balance,
        },
      );

      // Nếu user không có đủ NFT, reject
      if (!nftVerification.hasAccess) {
        throw new ForbiddenException(nftVerification.message);
      }
    }

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

      await this.invalidateMemberListCache(dto.server_id);

      // Create audit log
      await this.auditLogService.createLog(
        dto.server_id,
        AuditLogAction.MEMBER_JOIN,
        userDehiveId,
      );

      // Emit socket event to server members that a new member joined
      try {
        this.serverEventsGateway.notifyMemberJoined(dto.server_id, {
          userId: userDehiveId,
        });
      } catch (err) {
        // don't block join on websocket errors
        console.error(`[WebSocket] notifyMemberJoined failed: ${String(err)}`);
      }

      // ✅ Return server info for consistent response structure
      const serverDoc = await this.serverModel.findById(serverId);
      const serverObj = serverDoc?.toObject ? serverDoc.toObject() : serverDoc;
      return {
        server_id: dto.server_id,
        server_name: server.name,
        server: (serverObj ?? {}) as Record<string, unknown>,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException("Failed to join server.");
    } finally {
      void session.endSession();
    }
  }

  async leaveServer(
    dto: LeaveServerDto,
    userId: string,
  ): Promise<Record<string, never>> {
    const serverId = new Types.ObjectId(dto.server_id);

    // Find UserDehive by _id
    const userDehive = await this.findUserDehiveProfile(userId);

    if (!userDehive) {
      throw new NotFoundException("UserDehive profile not found.");
    }

    const userDehiveId = userId; // user_dehive_id = _id from AuthGuard
    const membership = await this.userDehiveServerModel.findOne({
      user_dehive_id: userDehiveId,
      server_id: serverId,
    });

    if (!membership)
      throw new BadRequestException("User is not a member of this server.");
    if (membership.role === ServerRole.OWNER)
      throw new ForbiddenException(
        "Server owner cannot leave. Transfer ownership first.",
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

      // Create audit log
      await this.auditLogService.createLog(
        dto.server_id,
        AuditLogAction.MEMBER_LEAVE,
        userDehiveId,
      );

      // Emit socket event to server members that this member left
      try {
        this.serverEventsGateway.notifyMemberLeft(dto.server_id, {
          userId: userDehiveId,
          username: "",
          displayName: "",
        });
      } catch (err) {
        // don't block leave on websocket errors
        console.error(`[WebSocket] notifyMemberLeft failed: ${String(err)}`);
      }

      return {};
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException("Failed to leave server.");
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
      .select("_id")
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for actor.`);
    const actorDehiveId = actorDehiveProfile._id;
    const isMember = await this.userDehiveServerModel.exists({
      server_id: serverId,
      user_dehive_id: actorBaseId, // Use string instead of ObjectId
    });
    if (!isMember)
      throw new ForbiddenException("Only server members can generate invites.");
    const { customAlphabet } = await import("nanoid");
    const nanoid = customAlphabet(
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
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
    const savedInvite = await newInvite.save();

    // Create audit log
    await this.auditLogService.createLog(
      dto.server_id,
      AuditLogAction.INVITE_CREATE,
      actorBaseId,
      undefined,
      { code, expiredAt },
    );

    return savedInvite;
  }

  async useInvite(
    code: string,
    actorBaseId: string,
    sessionId: string,
  ): Promise<{ server_id: string; server_name: string }> {
    const invite = await this.inviteLinkModel.findOne({ code });
    if (!invite || invite.expiredAt < new Date())
      throw new NotFoundException("Invite link is invalid or has expired.");

    return this.joinServer(
      {
        server_id: invite.server_id.toString(),
      },
      actorBaseId,
      sessionId,
    );
  }

  async kickOrBan(
    dto: KickBanDto,
    action: "kick" | "ban",
    actorBaseId: string,
  ): Promise<{ message: string }> {
    const serverId = new Types.ObjectId(dto.server_id);

    // Use target_user_dehive_id directly
    console.log(
      "🎯 [KICK/BAN] target_user_dehive_id:",
      dto.target_user_dehive_id,
    );
    const targetDehiveId = new Types.ObjectId(dto.target_user_dehive_id);
    console.log("🎯 [KICK/BAN] targetDehiveId resolved:", targetDehiveId);

    const actorDehiveProfile = await this.userDehiveModel
      .findById(actorBaseId)
      .select("_id")
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for actor.`);
    const actorDehiveId = actorDehiveProfile._id;

    console.log("🎯 [KICK/BAN] serverId:", serverId);
    console.log("🎯 [KICK/BAN] targetDehiveId:", targetDehiveId);
    console.log("🎯 [KICK/BAN] actorDehiveId:", actorDehiveId);

    // Debug: Check what we're querying for
    console.log("🔍 [KICK/BAN] Querying for targetMembership with:");
    console.log("🔍 [KICK/BAN] - server_id:", serverId);
    console.log("🔍 [KICK/BAN] - user_dehive_id:", targetDehiveId);
    console.log("🔍 [KICK/BAN] - server_id type:", typeof serverId);
    console.log("🔍 [KICK/BAN] - user_dehive_id type:", typeof targetDehiveId);

    // Debug: Check all memberships in this server first
    const allMemberships = await this.userDehiveServerModel
      .find({
        server_id: serverId,
      })
      .lean();
    console.log(
      "🔍 [KICK/BAN] All memberships in server:",
      allMemberships.length,
    );
    console.log(
      "🔍 [KICK/BAN] All user_dehive_ids in server:",
      allMemberships.map((m) => m.user_dehive_id.toString()),
    );
    console.log(
      "🔍 [KICK/BAN] Looking for targetDehiveId:",
      targetDehiveId.toString(),
    );
    console.log(
      "🔍 [KICK/BAN] Looking for actorDehiveId:",
      actorDehiveId.toString(),
    );

    // Try both ObjectId and string comparison for user_dehive_id
    const [targetMembership, actorMembership] = await Promise.all([
      this.userDehiveServerModel
        .findOne({
          server_id: serverId,
          $or: [
            { user_dehive_id: targetDehiveId },
            { user_dehive_id: targetDehiveId.toString() },
          ],
        })
        .lean(),
      this.userDehiveServerModel
        .findOne({
          server_id: serverId,
          $or: [
            { user_dehive_id: actorDehiveId },
            { user_dehive_id: actorDehiveId.toString() },
          ],
        })
        .lean(),
    ]);

    console.log("🔍 [KICK/BAN] targetMembership found:", !!targetMembership);
    console.log("🔍 [KICK/BAN] actorMembership found:", !!actorMembership);
    if (targetMembership) {
      console.log(
        "🔍 [KICK/BAN] targetMembership data:",
        JSON.stringify(targetMembership, null, 2),
      );
    }
    if (actorMembership) {
      console.log(
        "🔍 [KICK/BAN] actorMembership data:",
        JSON.stringify(actorMembership, null, 2),
      );
    }
    if (!targetMembership)
      throw new NotFoundException(
        "Target user is not a member of this server.",
      );
    if (!actorMembership)
      throw new ForbiddenException("You are not a member of this server.");

    if (actorDehiveId.toString() === targetDehiveId.toString())
      throw new BadRequestException(
        "You cannot perform this action on yourself.",
      );
    const hasPermission =
      actorMembership.role === ServerRole.OWNER ||
      actorMembership.role === ServerRole.MODERATOR;
    if (!hasPermission)
      throw new ForbiddenException("You do not have permission.");
    if (targetMembership.role === ServerRole.OWNER)
      throw new ForbiddenException("Cannot kick or ban the server owner.");
    if (
      targetMembership.role === ServerRole.MODERATOR &&
      actorMembership.role !== ServerRole.OWNER
    )
      throw new ForbiddenException(
        "Moderators cannot kick or ban other moderators.",
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
      if (action === "ban") {
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

      // Create audit log
      const auditAction =
        action === "kick"
          ? AuditLogAction.MEMBER_KICK
          : AuditLogAction.MEMBER_BAN;
      await this.auditLogService.createLog(
        dto.server_id,
        auditAction,
        actorBaseId,
        dto.target_user_dehive_id,
        undefined,
        dto.reason,
      );

      // Emit socket events for kick/ban to ensure clients are notified
      try {
        const targetIdStr = dto.target_user_dehive_id;
        if (action === "kick") {
          this.serverEventsGateway.notifyUserKicked(
            targetIdStr,
            dto.server_id,
            "",
            dto.reason,
          );
        } else {
          this.serverEventsGateway.notifyUserBanned(
            targetIdStr,
            dto.server_id,
            "",
            dto.reason,
          );
        }
      } catch (err) {
        this.logger.error(
          `[WebSocket] notifyUserKicked/notifyUserBanned failed: ${String(err)}`,
        );
      }

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
      .select("_id")
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for actor.`);
    const actorDehiveId = actorDehiveProfile._id;

    const hasPermission = await this.userDehiveServerModel.exists({
      server_id: serverId,
      $or: [
        { user_dehive_id: actorDehiveId },
        { user_dehive_id: actorDehiveId.toString() },
      ],
      role: { $in: [ServerRole.OWNER, ServerRole.MODERATOR] },
    });
    if (!hasPermission)
      throw new ForbiddenException(
        "You do not have permission to unban members.",
      );

    // Remove server from user's banned_by_servers array
    const result = await this.userDehiveModel.findByIdAndUpdate(
      targetDehiveId,
      {
        $pull: { banned_by_servers: serverId.toString() },
      },
    );

    if (!result) {
      throw new NotFoundException("User not found.");
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

    // Create audit log
    await this.auditLogService.createLog(
      dto.server_id,
      AuditLogAction.MEMBER_UNBAN,
      actorBaseId,
      dto.target_user_dehive_id,
    );

    return { message: "User successfully unbanned." };
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
      .select("_id")
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for actor.`);
    const actorDehiveId = actorDehiveProfile._id;

    const [targetMembership, actorMembership] = await Promise.all([
      this.userDehiveServerModel.findOne({
        server_id: serverId,
        $or: [
          { user_dehive_id: targetDehiveId },
          { user_dehive_id: targetDehiveId.toString() },
        ],
      }),
      this.userDehiveServerModel.findOne({
        server_id: serverId,
        $or: [
          { user_dehive_id: actorDehiveId },
          { user_dehive_id: actorDehiveId.toString() },
        ],
      }),
    ]);
    if (!targetMembership)
      throw new NotFoundException(
        "Target user is not a member of this server.",
      );
    if (!actorMembership)
      throw new ForbiddenException("You are not a member of this server.");

    if (actorDehiveId.toString() === targetDehiveId.toString())
      throw new BadRequestException("You cannot change your own role.");
    if (actorMembership.role !== ServerRole.OWNER)
      throw new ForbiddenException("Only the server owner can assign roles.");
    if (dto.role === ServerRole.OWNER)
      throw new BadRequestException(
        "Ownership can only be transferred, not assigned.",
      );

    const oldRole = targetMembership.role;
    targetMembership.role = dto.role;
    const savedMembership = await targetMembership.save();

    // Create audit log
    await this.auditLogService.createLog(
      dto.server_id,
      AuditLogAction.ROLE_UPDATE,
      actorBaseId,
      dto.target_user_dehive_id,
      { old_role: oldRole, new_role: dto.role },
    );

    return savedMembership;
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
      .select("_id")
      .lean();
    if (!currentOwnerProfile)
      throw new NotFoundException(
        `Dehive profile not found for current owner.`,
      );
    const currentOwnerDehiveId = currentOwnerProfile._id;

    // Find current owner and new owner memberships
    const [currentOwnerMembership, newOwnerMembership] = await Promise.all([
      this.userDehiveServerModel.findOne({
        server_id: serverId,
        $or: [
          { user_dehive_id: currentOwnerDehiveId },
          { user_dehive_id: currentOwnerDehiveId.toString() },
        ],
      }),
      this.userDehiveServerModel.findOne({
        server_id: serverId,
        $or: [
          { user_dehive_id: newOwnerDehiveId },
          { user_dehive_id: newOwnerDehiveId.toString() },
        ],
      }),
    ]);

    // Validate current owner
    if (!currentOwnerMembership)
      throw new ForbiddenException("You are not a member of this server.");
    if (currentOwnerMembership.role !== ServerRole.OWNER)
      throw new ForbiddenException(
        "Only the server owner can transfer ownership.",
      );

    // Validate new owner
    if (!newOwnerMembership)
      throw new NotFoundException("New owner is not a member of this server.");
    if (currentOwnerDehiveId.toString() === newOwnerDehiveId.toString())
      throw new BadRequestException(
        "You cannot transfer ownership to yourself.",
      );

    // Use transaction to ensure atomicity
    const session = await this.userDehiveServerModel.db.startSession();
    session.startTransaction();
    try {
      // Change current owner role to MEMBER
      await this.userDehiveServerModel.updateOne(
        { _id: currentOwnerMembership._id },
        { $set: { role: ServerRole.MEMBER } },
        { session },
      );

      await this.userDehiveServerModel.updateOne(
        { _id: newOwnerMembership._id },
        { $set: { role: ServerRole.OWNER } },
        { session },
      );

      // Update owner_id in server collection
      await this.serverModel.updateOne(
        { _id: serverId },
        { $set: { owner_id: newOwnerDehiveId.toString() } },
        { session },
      );

      await session.commitTransaction();

      await this.invalidateMemberListCache(dto.server_id);

      // Create audit log
      await this.auditLogService.createLog(
        dto.server_id,
        AuditLogAction.SERVER_UPDATE,
        currentOwnerId,
        dto.user_dehive_id,
        { action: "ownership_transfer" },
      );

      // Emit ownership transfer event (Level 2 + Level 1 handled in gateway)
      try {
        this.serverEventsGateway.notifyServerUpdatedOwnership(
          dto.server_id,
          newOwnerDehiveId.toString(),
        );
      } catch (err) {
        this.logger.error(
          `[WebSocket] notifyServerUpdatedOwnership failed: ${String(err)}`,
        );
      }

      return { message: "Ownership transferred successfully." };
    } catch {
      await session.abortTransaction();
      throw new BadRequestException("Failed to transfer ownership.");
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
      .select("_id")
      .lean();
    if (!actorDehiveProfile)
      throw new NotFoundException(`Dehive profile not found for user.`);
    const actorDehiveId = actorDehiveProfile._id;

    const result = await this.userDehiveServerModel.updateOne(
      {
        server_id: new Types.ObjectId(dto.server_id),
        $or: [
          { user_dehive_id: actorDehiveId },
          { user_dehive_id: actorDehiveId.toString() },
        ],
      },
      { $set: { is_muted: dto.is_muted } },
    );
    if (result.matchedCount === 0)
      throw new NotFoundException("Membership not found.");
    return { message: "Notification settings updated successfully." };
  }

  private async _getEnrichedUser(
    userId: string,
    sessionIdOfRequester: string,
  ): Promise<unknown> {
    const userDecodeData = await this.decodeApiClient.getUserById(
      userId,
      sessionIdOfRequester,
    );
    if (!userDecodeData) {
      throw new NotFoundException(
        `User with ID ${userId} not found in Decode service`,
      );
    }

    let userDehiveData: UserDehiveLean | null = await this.userDehiveModel
      .findById(userId)
      .lean<UserDehiveLean>();
    if (!userDehiveData) {
      const newUser = new this.userDehiveModel({
        _id: userId,
        status: "ACTIVE",
      });
      const savedDocument = await newUser.save();
      userDehiveData = savedDocument.toObject<UserDehiveLean>();
    }

    return this._mergeUserData(userDehiveData, userDecodeData);
  }

  private _mergeUserData(
    dehiveData: UserDehiveLean,
    decodeData: UserProfile,
  ): unknown {
    return {
      _id: decodeData._id.toString(),
      username: decodeData.username,
      display_name: decodeData.display_name,
      avatar: decodeData.avatar_ipfs_hash,
      avatar_ipfs_hash: decodeData.avatar_ipfs_hash,
      status: dehiveData.status,
      server_count: dehiveData.server_count,
      bio: decodeData.bio,
      banner_color: decodeData.banner_color || dehiveData.banner_color,
      is_banned: dehiveData.is_banned,
      last_login: decodeData.last_login,
      primary_wallet: decodeData.primary_wallet,
      following_number: decodeData.following_number,
      followers_number: decodeData.followers_number,
      is_following: decodeData.is_following,
      is_follower: decodeData.is_follower,
      is_blocked: decodeData.is_blocked,
      is_blocked_by: decodeData.is_blocked_by,
      mutual_followers_number: decodeData.mutual_followers_number,
      mutual_followers_list: decodeData.mutual_followers_list,
      is_active: decodeData.is_active,
      last_account_deactivation: decodeData.last_account_deactivation,
      dehive_role: decodeData.dehive_role,
      role_subscription: decodeData.role_subscription,
      wallets: decodeData.wallets || [],
      __v: decodeData.__v || 0,
    };
  }

  async getMembersInServer(
    serverId: string,
    currentUser: AuthenticatedUser,
  ): Promise<unknown[]> {
    const cacheKey = `server_members:${serverId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const memberships = await this.userDehiveServerModel
      .find({ server_id: new Types.ObjectId(serverId) })
      .lean();
    if (!memberships.length) return [];

    const enrichedMembersPromises = memberships.map(async (m) => {
      try {
        const userProfile = await this._getEnrichedUser(
          m.user_dehive_id.toString(),
          currentUser.session_id,
        );
        return {
          membership_id: m._id.toString(),
          ...(userProfile as Record<string, unknown>),
          role: m.role,
          is_muted: m.is_muted,
          joined_at: m.joined_at,
        };
      } catch (error) {
        console.error(`Could not enrich member ${m.user_dehive_id}:`, error);
        return null;
      }
    });

    const finalResult = (await Promise.all(enrichedMembersPromises)).filter(
      Boolean,
    );
    await this.redis.setex(cacheKey, 300, JSON.stringify(finalResult));
    return finalResult;
  }

  async getEnrichedUserProfile(
    targetUserId: string,
    currentUser: AuthenticatedUser,
  ): Promise<{
    statusCode: number;
    success: boolean;
    message: string;
    data: unknown;
  }> {
    const targetUserProfile = await this._getEnrichedUser(
      targetUserId,
      currentUser.session_id,
    );

    const [targetServers, viewerServers] = await Promise.all([
      this.userDehiveServerModel
        .find({ user_dehive_id: targetUserId })
        .select("server_id")
        .lean(),
      this.userDehiveServerModel
        .find({ user_dehive_id: currentUser._id })
        .select("server_id")
        .lean(),
    ]);

    const viewerServerIds = new Set(
      viewerServers.map((s) => s.server_id.toString()),
    );
    const mutualServerIds = targetServers
      .filter((s) => viewerServerIds.has(s.server_id.toString()))
      .map((s) => s.server_id);

    // Fetch server details to include server names
    const mutualServersWithNames = await Promise.all(
      mutualServerIds.map(async (serverId) => {
        const server = await this.serverModel
          .findById(serverId)
          .select("name")
          .lean();
        return {
          server_id: serverId.toString(),
          server_name: server?.name || "Unknown Server",
        };
      }),
    );

    const enrichedProfile = {
      ...(targetUserProfile as Record<string, unknown>),
      mutual_servers_count: mutualServersWithNames.length,
      mutual_servers: mutualServersWithNames,
    };

    return {
      statusCode: 200,
      success: true,
      message: "Operation successful",
      data: enrichedProfile,
    };
  }

  private async invalidateMemberListCache(serverId: string): Promise<void> {
    await this.redis.del(`server_members:${serverId}`);
  }

  async updateBio(
    dto: UpdateBioDto,
    userId: string,
    sessionId: string,
    fingerprintHash: string,
  ): Promise<UserProfile> {
    try {
      const accessToken =
        await this.decodeApiClient.getAccessTokenFromSession(sessionId);
      if (!accessToken) {
        throw new NotFoundException("Access token not found.");
      }

      await this.decodeApiClient.updateBio(dto, accessToken, fingerprintHash);

      // Get current user profile after update
      const currentUserProfile =
        await this.decodeApiClient.getCurrentUserProfile(
          accessToken,
          fingerprintHash,
        );

      return currentUserProfile;
    } catch (error) {
      throw new BadRequestException("Failed to update bio: " + error.message);
    }
  }

  async updateAvatar(
    dto: UpdateAvatarDto,
    userId: string,
    sessionId: string,
    fingerprintHash: string,
  ): Promise<UserProfile> {
    try {
      const accessToken =
        await this.decodeApiClient.getAccessTokenFromSession(sessionId);
      if (!accessToken) {
        throw new NotFoundException("Access token not found.");
      }

      await this.decodeApiClient.updateAvatar(
        dto,
        accessToken,
        fingerprintHash,
      );

      // Get current user profile after update
      const currentUserProfile =
        await this.decodeApiClient.getCurrentUserProfile(
          accessToken,
          fingerprintHash,
        );

      return currentUserProfile;
    } catch (error) {
      throw new BadRequestException(
        "Failed to update avatar: " + error.message,
      );
    }
  }

  async updateDisplayName(
    dto: UpdateDisplayNameDto,
    userId: string,
    sessionId: string,
    fingerprintHash: string,
  ): Promise<UserProfile> {
    try {
      const accessToken =
        await this.decodeApiClient.getAccessTokenFromSession(sessionId);
      if (!accessToken) {
        throw new NotFoundException("Access token not found.");
      }

      await this.decodeApiClient.updateDisplayName(
        dto,
        accessToken,
        fingerprintHash,
      );

      // Get current user profile after update
      const currentUserProfile =
        await this.decodeApiClient.getCurrentUserProfile(
          accessToken,
          fingerprintHash,
        );

      return currentUserProfile;
    } catch (error) {
      throw new BadRequestException(
        "Failed to update display name: " + error.message,
      );
    }
  }

  async getBanList(
    serverId: string,
    requesterId: string,
    sessionId: string,
  ): Promise<{
    statusCode: number;
    success: boolean;
    message: string;
    data: BanListResponse;
  }> {
    try {
      const serverObjectId = new Types.ObjectId(serverId);

      // Check if server exists
      const server = await this.serverModel.findById(serverObjectId);
      if (!server) {
        throw new NotFoundException("Server not found.");
      }

      // Check if requester is the owner of the server
      const requesterRole = await this.userDehiveServerModel.findOne({
        server_id: serverObjectId,
        user_dehive_id: requesterId,
        role: ServerRole.OWNER,
      });

      if (!requesterRole) {
        throw new ForbiddenException(
          "Only the server owner can view the ban list.",
        );
      }

      const bannedUsers = (await this.serverBanModel
        .find({ server_id: serverObjectId })
        .sort({ createdAt: -1 })
        .lean()) as unknown as Array<
        ServerBan & { createdAt: Date; updatedAt: Date; _id: string }
      >;

      const bannedUsersWithProfiles: BannedUser[] = [];

      for (const banEntry of bannedUsers) {
        try {
          const userProfile = await this.decodeApiClient.getUserById(
            banEntry.user_dehive_id.toString(),
            sessionId,
          );

          const bannedUser: BannedUser = {
            _id: banEntry._id.toString(),
            server_id: banEntry.server_id.toString(),
            user_dehive_id: banEntry.user_dehive_id.toString(),
            banned_by: banEntry.banned_by.toString(),
            reason: banEntry.reason,
            expires_at: banEntry.expires_at,
            createdAt: banEntry.createdAt,
            updatedAt: banEntry.updatedAt,
            is_banned: true,
            user_profile: userProfile || undefined,
          };

          bannedUsersWithProfiles.push(bannedUser);
        } catch (error) {
          console.error(
            `Error fetching user profile for ${banEntry.user_dehive_id}:`,
            error,
          );
          const bannedUser: BannedUser = {
            _id: banEntry._id.toString(),
            server_id: banEntry.server_id.toString(),
            user_dehive_id: banEntry.user_dehive_id.toString(),
            banned_by: banEntry.banned_by.toString(),
            reason: banEntry.reason,
            expires_at: banEntry.expires_at,
            createdAt: banEntry.createdAt,
            updatedAt: banEntry.updatedAt,
            is_banned: true,
            user_profile: undefined,
          };

          bannedUsersWithProfiles.push(bannedUser);
        }
      }

      const result = {
        statusCode: 200,
        success: true,
        message: "Operation successful",
        data: {
          server_id: serverId,
          total_banned: bannedUsersWithProfiles.length,
          banned_users: bannedUsersWithProfiles,
        },
      };

      return result;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException("Failed to get ban list: " + error.message);
    }
  }
}

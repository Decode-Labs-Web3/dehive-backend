import { Model } from 'mongoose';
import { UserDehiveDocument } from '../schemas/user-dehive.schema';
import { UserDehiveServerDocument } from '../schemas/user-dehive-server.schema';
import { ServerDocument } from '../schemas/server.schema';
import { ServerBanDocument } from '../schemas/server-ban.schema';
import { InviteLinkDocument } from '../schemas/invite-link.schema';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { TransferOwnershipDto } from '../dto/transfer-ownership.dto';
import { JoinServerDto } from '../dto/join-server.dto';
import { LeaveServerDto } from '../dto/leave-server.dto';
import { GenerateInviteDto } from '../dto/generate-invite.dto';
import { KickBanDto } from '../dto/kick-ban.dto';
import { UnbanDto } from '../dto/unban.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { Redis } from 'ioredis';
import { DecodeApiClient } from '../clients/decode-api.client';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
export declare class UserDehiveServerService {
    private userDehiveModel;
    private userDehiveServerModel;
    private serverModel;
    private serverBanModel;
    private inviteLinkModel;
    private readonly decodeApiClient;
    private readonly redis;
    constructor(userDehiveModel: Model<UserDehiveDocument>, userDehiveServerModel: Model<UserDehiveServerDocument>, serverModel: Model<ServerDocument>, serverBanModel: Model<ServerBanDocument>, inviteLinkModel: Model<InviteLinkDocument>, decodeApiClient: DecodeApiClient, redis: Redis);
    private findUserDehiveProfile;
    joinServer(dto: JoinServerDto, userId: string): Promise<{
        message: string;
    }>;
    leaveServer(dto: LeaveServerDto, userId: string): Promise<{
        message: string;
    }>;
    generateInvite(dto: GenerateInviteDto, actorBaseId: string): Promise<InviteLinkDocument>;
    useInvite(code: string, actorBaseId: string): Promise<{
        message: string;
    }>;
    kickOrBan(dto: KickBanDto, action: 'kick' | 'ban', actorBaseId: string): Promise<{
        message: string;
    }>;
    unbanMember(dto: UnbanDto, actorBaseId: string): Promise<{
        message: string;
    }>;
    assignRole(dto: AssignRoleDto, actorBaseId: string): Promise<UserDehiveServerDocument>;
    transferOwnership(dto: TransferOwnershipDto, currentOwnerId: string): Promise<{
        message: string;
    }>;
    updateNotification(dto: UpdateNotificationDto, actorBaseId: string): Promise<{
        message: string;
    }>;
    private _getEnrichedUser;
    private _mergeUserData;
    getMembersInServer(serverId: string, currentUser: AuthenticatedUser): Promise<any[]>;
    getEnrichedUserProfile(targetUserId: string, currentUser: AuthenticatedUser): Promise<any>;
    private invalidateMemberListCache;
}

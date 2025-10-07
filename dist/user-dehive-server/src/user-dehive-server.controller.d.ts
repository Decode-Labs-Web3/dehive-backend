import { UserDehiveServerService } from './user-dehive-server.service';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { TransferOwnershipDto } from '../dto/transfer-ownership.dto';
import { GenerateInviteDto } from '../dto/generate-invite.dto';
import { JoinServerDto } from '../dto/join-server.dto';
import { KickBanDto } from '../dto/kick-ban.dto';
import { UnbanDto } from '../dto/unban.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { GetServerMembersDto } from '../dto/get-server-members.dto';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
export declare class UserDehiveServerController {
    private readonly service;
    constructor(service: UserDehiveServerService);
    joinServer(dto: JoinServerDto, _id: string): Promise<{
        message: string;
    }>;
    leaveServer(serverId: string, _id: string): Promise<{
        message: string;
    }>;
    generateInvite(dto: GenerateInviteDto, actorBaseId: string): Promise<import("../schemas/invite-link.schema").InviteLinkDocument>;
    useInvite(code: string, actorBaseId: string): Promise<{
        message: string;
    }>;
    kickMember(dto: KickBanDto, actorBaseId: string): Promise<{
        message: string;
    }>;
    banMember(dto: KickBanDto, actorBaseId: string): Promise<{
        message: string;
    }>;
    unbanMember(dto: UnbanDto, actorBaseId: string): Promise<{
        message: string;
    }>;
    assignRole(dto: AssignRoleDto, actorBaseId: string): Promise<import("../schemas/user-dehive-server.schema").UserDehiveServerDocument>;
    transferOwnership(dto: TransferOwnershipDto, currentOwnerId: string): Promise<{
        message: string;
    }>;
    updateNotification(dto: UpdateNotificationDto, actorBaseId: string): Promise<{
        message: string;
    }>;
    getMembersInServer(params: GetServerMembersDto, user: AuthenticatedUser): Promise<any[]>;
    getEnrichedUserProfile(targetUserId: string, currentUser: AuthenticatedUser): Promise<any>;
}

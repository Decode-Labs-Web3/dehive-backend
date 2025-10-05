import { UserDehiveServerService } from './user-dehive-server.service';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { GenerateInviteDto } from '../dto/generate-invite.dto';
import { JoinServerDto } from '../dto/join-server.dto';
import { KickBanDto } from '../dto/kick-ban.dto';
import { UnbanDto } from '../dto/unban.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
export declare class UserDehiveServerController {
    private readonly service;
    constructor(service: UserDehiveServerService);
    joinServer(dto: JoinServerDto, userId: string): Promise<{
        message: string;
    }>;
    leaveServer(serverId: string, userId: string): Promise<{
        message: string;
    }>;
    getMembersInServer(serverId: string, user: any): Promise<any[]>;
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
    updateNotification(dto: UpdateNotificationDto, actorBaseId: string): Promise<{
        message: string;
    }>;
    getUserProfile(targetSessionId: string, user: any): Promise<{
        dehive_data: {
            bio: string;
            status: string;
            banner_color: string;
            server_count: number;
            last_login: Date;
        } | {
            bio: string;
            status: string;
            banner_color: null;
            server_count: number;
            last_login: null;
        };
        username: any;
        display_name: any;
        avatar: any;
        email: any;
    }>;
    getEnrichedUserProfile(targetSessionId: string, viewerUserId: string, currentUser: any): Promise<{
        bio: string;
        status: string;
        mutual_servers_count: number;
        mutual_servers: never[];
        username: any;
        display_name: any;
        avatar: any;
        email: any;
        _id?: undefined;
        banner_color?: undefined;
    } | {
        _id: import("mongoose").Types.ObjectId;
        username: any;
        display_name: any;
        email: any;
        avatar: any;
        bio: string;
        status: string;
        banner_color: string;
        mutual_servers_count: number;
        mutual_servers: import("mongoose").Types.ObjectId[];
    }>;
}

import { HttpService } from '@nestjs/axios';
import { Model, Types } from 'mongoose';
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
import { AuthServiceClient } from './auth-service.client';
import { Redis } from 'ioredis';
export declare class UserDehiveServerService {
    private userDehiveModel;
    private userDehiveServerModel;
    private serverModel;
    private serverBanModel;
    private inviteLinkModel;
    private readonly authClient;
    private readonly redis;
    private readonly httpService;
    constructor(userDehiveModel: Model<UserDehiveDocument>, userDehiveServerModel: Model<UserDehiveServerDocument>, serverModel: Model<ServerDocument>, serverBanModel: Model<ServerBanDocument>, inviteLinkModel: Model<InviteLinkDocument>, authClient: AuthServiceClient, redis: Redis, httpService: HttpService);
    private findUserDehiveProfile;
    private getUserDehiveIdFromSession;
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
    getUserProfileBySession(targetSessionId: string, currentUser: any): Promise<{
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
    }>;
    getUserProfileByUserDehiveId(userDehiveId: string, currentUser: any): Promise<any>;
    getUserProfile(userId: string, currentUser: any): Promise<{
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
    }>;
    getMembersInServer(serverId: string, currentUser: any): Promise<any[]>;
    private invalidateMemberListCache;
    getEnrichedUserProfile(targetSessionId: string, viewerUserId: string, currentUser: any): Promise<{
        username: any;
        display_name: any;
        avatar: any;
        bio: string;
        status: string;
        mutual_servers_count: number;
        mutual_servers: never[];
        _id?: undefined;
        banner_color?: undefined;
    } | {
        _id: Types.ObjectId;
        username: any;
        display_name: any;
        avatar: any;
        bio: string;
        status: string;
        banner_color: string;
        mutual_servers_count: number;
        mutual_servers: Types.ObjectId[];
    }>;
    getEnrichedUserProfileByUserDehiveId(userDehiveId: string, viewerUserId: string, currentUser: any): Promise<any>;
}

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
export interface UserProfile {
    _id: string;
    username: string;
    display_name: string;
    avatar: string;
    bio?: string;
    status?: string;
    banner_color?: string;
    server_count?: number;
    last_login?: Date;
    primary_wallet?: string;
    following_number?: number;
    followers_number?: number;
    is_following?: boolean;
    is_follower?: boolean;
    is_blocked?: boolean;
    is_blocked_by?: boolean;
    mutual_followers_number?: number;
    mutual_followers_list?: string[];
    is_active?: boolean;
    last_account_deactivation?: Date;
    dehive_role?: string;
    role_subscription?: string;
}
export declare class AuthServiceClient {
    private readonly httpService;
    private readonly redis;
    private readonly configService;
    private readonly logger;
    private readonly authServiceUrl;
    private readonly PROFILE_CACHE_PREFIX;
    private readonly PROFILE_CACHE_TTL;
    constructor(httpService: HttpService, redis: Redis, configService: ConfigService);
    getUserProfile(userDehiveId: string, sessionId: string, fingerprintHashed: string): Promise<UserProfile | null>;
    getMyProfile(sessionId: string, fingerprintHashed: string): Promise<UserProfile | null>;
    getBatchUserProfiles(userIds: string[], sessionId: string, fingerprintHashed: string): Promise<Map<string, UserProfile>>;
    clearUserCache(userDehiveId: string): Promise<void>;
    clearAllProfileCaches(): Promise<void>;
}

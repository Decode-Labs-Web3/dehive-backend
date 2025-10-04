import { HttpService } from '@nestjs/axios';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
export interface UserProfile {
    _id: string;
    username: string;
    display_name?: string;
    email: string;
    avatar?: string;
    bio?: string;
    created_at?: Date;
}
export declare class AuthServiceClient {
    private readonly httpService;
    private readonly redis;
    private readonly configService;
    private readonly logger;
    private readonly authServiceUrl;
    private readonly PROFILE_CACHE_TTL;
    private readonly PROFILE_CACHE_PREFIX;
    constructor(httpService: HttpService, redis: Redis, configService: ConfigService);
    getUserProfile(userId: string): Promise<UserProfile | null>;
    batchGetProfiles(userIds: string[]): Promise<Record<string, UserProfile>>;
}

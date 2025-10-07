import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { UserProfile } from '../interfaces/user-profile.interface';
export declare class DecodeApiClient {
    private readonly httpService;
    private readonly configService;
    private readonly redis;
    private readonly logger;
    private readonly decodeApiUrl;
    constructor(httpService: HttpService, configService: ConfigService, redis: Redis);
    getUserById(userId: string, sessionIdOfRequester: string): Promise<UserProfile | null>;
    private getAccessTokenFromSession;
}

import { HttpService } from '@nestjs/axios';
import { BaseHttpClient } from './base-http.client';
import { ConfigService } from '@nestjs/config';
import { Response } from '../../interfaces/response.interface';
import { SessionDoc } from '../../interfaces/session-doc.interface';
import { UserDecodeDoc } from '../../interfaces/user-doc.interface';
import { RedisInfrastructure } from '../redis.infrastructure';
export declare class DecodeApiClient extends BaseHttpClient {
    private readonly redisInfrastructure;
    constructor(httpService: HttpService, configService: ConfigService, redisInfrastructure: RedisInfrastructure);
    createDecodeSession(sso_token: string): Promise<Response<SessionDoc>>;
    refreshDecodeSession(refresh_token: string): Promise<Response<SessionDoc>>;
    getUser(user_id: string, session_id: string, fingerprint_hashed: string): Promise<Response<UserDecodeDoc>>;
    getMyProfile(session_id: string, fingerprint_hashed: string): Promise<Response<UserDecodeDoc>>;
    private getAccessToken;
}

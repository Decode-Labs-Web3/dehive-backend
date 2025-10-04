import { Response } from '../interfaces/response.interface';
import { DecodeApiClient } from '../infrastructure/external-services/decode-api.client';
import { RedisInfrastructure } from '../infrastructure/redis.infrastructure';
import { UserService } from './user.service';
import { RegisterService } from './register.service';
export declare class SessionService {
    private readonly decodeApiClient;
    private readonly redis;
    private readonly userService;
    private readonly registerService;
    constructor(decodeApiClient: DecodeApiClient, redis: RedisInfrastructure, userService: UserService, registerService: RegisterService);
    createDecodeSession(sso_token: string): Promise<Response>;
    checkValidSession(session_id: string): Promise<Response>;
    private storeSession;
}

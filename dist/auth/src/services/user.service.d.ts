import { DecodeApiClient } from '../infrastructure/external-services/decode-api.client';
import { Response } from '../interfaces/response.interface';
import { UserDehive } from '../schemas/user-dehive.schema';
import { Model } from 'mongoose';
import { UserDehiveDoc } from '../interfaces/user-doc.interface';
import { RedisInfrastructure } from '../infrastructure/redis.infrastructure';
export declare class UserService {
    private readonly decodeApiClient;
    private readonly userDehiveModel;
    private readonly redis;
    constructor(decodeApiClient: DecodeApiClient, userDehiveModel: Model<UserDehive>, redis: RedisInfrastructure);
    getUser(input: {
        user_dehive_id: string;
        session_id: string;
        fingerprint_hashed: string;
    }): Promise<Response<UserDehiveDoc>>;
    getMyProfile(input: {
        session_id: string;
        fingerprint_hashed: string;
    }): Promise<Response<UserDehiveDoc>>;
    userExists(user_id: string): Promise<Response<boolean>>;
    private getUserDecodeProfile;
    private getMyDecodeProfile;
}

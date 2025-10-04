import Redis from 'ioredis';
import { Types } from 'mongoose';
export declare class NotificationCache {
    private readonly redis;
    constructor(redis: Redis);
    private getKey;
    setNotificationPreference(userId: Types.ObjectId | string, serverId: Types.ObjectId | string, isMuted: boolean): Promise<void>;
    getNotificationPreference(userId: Types.ObjectId | string, serverId: Types.ObjectId | string): Promise<boolean>;
}

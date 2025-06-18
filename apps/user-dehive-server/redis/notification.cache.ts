// apps/user-dehive-server/redis/notification.cache.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Types } from 'mongoose';

@Injectable()
export class NotificationCache {
    constructor(@InjectRedis() private readonly redis: Redis) {}

    private getKey(userId: Types.ObjectId | string, serverId: Types.ObjectId | string): string {
        return `notification:${userId}:${serverId}`;
    }

    async setNotificationPreference(
        userId: Types.ObjectId | string, 
        serverId: Types.ObjectId | string, 
        isMuted: boolean
    ): Promise<void> {
        const key = this.getKey(userId.toString(), serverId.toString());
        await this.redis.set(key, isMuted ? '1' : '0');
    }

    async getNotificationPreference(
        userId: Types.ObjectId | string, 
        serverId: Types.ObjectId | string
    ): Promise<boolean> {
        const key = this.getKey(userId.toString(), serverId.toString());
        const value = await this.redis.get(key);
        return value === '1';
    }
}
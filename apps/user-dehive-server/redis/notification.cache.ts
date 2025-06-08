import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';

@Injectable()
export class NotificationCache {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async setNotificationPreference(user_dehive_id: string, server_id: string, muted: boolean) {
    const key = `notif:${user_dehive_id}:${server_id}`;
    await this.redis.set(key, muted ? '1' : '0');
  }

  async getNotificationPreference(user_dehive_id: string, server_id: string): Promise<boolean> {
    const key = `notif:${user_dehive_id}:${server_id}`;
    const val = await this.redis.get(key);
    return val === '1';
  }
}
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';

@Injectable()
export class InviteLinkCache {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async setInviteLink(server_id: string, code: string, expiredAt: Date) {
    const key = `invite:${code}`;
    await this.redis.set(
      key,
      server_id,
      'EX',
      Math.floor((expiredAt.getTime() - Date.now()) / 1000),
    );
  }

  async getServerIdByInviteLink(code: string): Promise<string | null> {
    const key = `invite:${code}`;
    return this.redis.get(key);
  }
}

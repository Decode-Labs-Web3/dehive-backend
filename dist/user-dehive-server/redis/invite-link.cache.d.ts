import type { Redis } from 'ioredis';
export declare class InviteLinkCache {
    private readonly redis;
    constructor(redis: Redis);
    setInviteLink(server_id: string, code: string, expiredAt: Date): Promise<void>;
    getServerIdByInviteLink(code: string): Promise<string | null>;
}

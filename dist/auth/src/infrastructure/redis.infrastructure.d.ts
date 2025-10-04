import { Redis } from 'ioredis';
export declare class RedisInfrastructure {
    private readonly redis;
    constructor(redis: Redis);
    set(key: string, value: any, ttl?: number): Promise<void>;
    get(key: string): Promise<any>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    ttl(key: string): Promise<number>;
    incr(key: string): Promise<number>;
    expire(key: string, ttl: number): Promise<void>;
    mdel(keys: string[]): Promise<void>;
    ping(): Promise<string>;
    getConnectionInfo(): Promise<any>;
    flushAll(): Promise<void>;
    flushDb(): Promise<void>;
}

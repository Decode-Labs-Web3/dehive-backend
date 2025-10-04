"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisInfrastructure = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
let RedisInfrastructure = class RedisInfrastructure {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    async set(key, value, ttl) {
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
        if (ttl) {
            await this.redis.setex(key, ttl, serializedValue);
        }
        else {
            await this.redis.set(key, serializedValue);
        }
    }
    async get(key) {
        const value = await this.redis.get(key);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    async del(key) {
        await this.redis.del(key);
    }
    async exists(key) {
        const result = await this.redis.exists(key);
        return result === 1;
    }
    async ttl(key) {
        return await this.redis.ttl(key);
    }
    async incr(key) {
        return await this.redis.incr(key);
    }
    async expire(key, ttl) {
        await this.redis.expire(key, ttl);
    }
    async mdel(keys) {
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
    async ping() {
        return await this.redis.ping();
    }
    async getConnectionInfo() {
        const info = await this.redis.info();
        return info;
    }
    async flushAll() {
        await this.redis.flushall();
    }
    async flushDb() {
        await this.redis.flushdb();
    }
};
exports.RedisInfrastructure = RedisInfrastructure;
exports.RedisInfrastructure = RedisInfrastructure = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [ioredis_2.Redis])
], RedisInfrastructure);
//# sourceMappingURL=redis.infrastructure.js.map
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
var AuthServiceClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthServiceClient = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
let AuthServiceClient = AuthServiceClient_1 = class AuthServiceClient {
    httpService;
    redis;
    configService;
    logger = new common_1.Logger(AuthServiceClient_1.name);
    authServiceUrl;
    PROFILE_CACHE_PREFIX = 'user_profile:';
    PROFILE_CACHE_TTL = 300;
    constructor(httpService, redis, configService) {
        this.httpService = httpService;
        this.redis = redis;
        this.configService = configService;
        this.authServiceUrl =
            this.configService.get('AUTH_SERVICE_URL') ||
                'http://localhost:4006';
    }
    async getUserProfile(userDehiveId, sessionId, fingerprintHashed) {
        const cacheKey = `${this.PROFILE_CACHE_PREFIX}${userDehiveId}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                this.logger.debug(`Cache hit for user profile: ${userDehiveId}`);
                return JSON.parse(cached);
            }
            this.logger.debug(`Cache miss for user profile: ${userDehiveId}, fetching from auth service`);
            console.log('🔍 [AUTH CLIENT] Fetching profile for userDehiveId:', userDehiveId);
            console.log('🔍 [AUTH CLIENT] Auth service URL:', this.authServiceUrl);
            console.log('🔍 [AUTH CLIENT] Full URL:', `${this.authServiceUrl}/auth/profile/${userDehiveId}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authServiceUrl}/auth/profile/${userDehiveId}`, {
                headers: {
                    'x-session-id': sessionId,
                    'x-fingerprint-hashed': fingerprintHashed,
                    'Content-Type': 'application/json',
                },
                timeout: 5000,
            }));
            console.log('🔍 [AUTH CLIENT] Response:', response.data);
            if (!response.data.success || !response.data.data) {
                this.logger.warn(`User profile not found in auth service: ${userDehiveId}`);
                return null;
            }
            const profile = response.data.data;
            await this.redis.setex(cacheKey, this.PROFILE_CACHE_TTL, JSON.stringify(profile));
            this.logger.debug(`Cached user profile: ${userDehiveId}`);
            return profile;
        }
        catch (error) {
            this.logger.error(`Failed to fetch user profile: ${userDehiveId}`, error instanceof Error ? error.stack : error);
            return null;
        }
    }
    async getMyProfile(sessionId, fingerprintHashed) {
        const cacheKey = `${this.PROFILE_CACHE_PREFIX}me:${sessionId}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                this.logger.debug(`Cache hit for my profile: ${sessionId}`);
                return JSON.parse(cached);
            }
            this.logger.debug(`Cache miss for my profile: ${sessionId}, fetching from auth service`);
            console.log('🔍 [AUTH CLIENT] Fetching my profile for sessionId:', sessionId);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authServiceUrl}/auth/profile`, {
                headers: {
                    'x-session-id': sessionId,
                    'x-fingerprint-hashed': fingerprintHashed,
                    'Content-Type': 'application/json',
                },
                timeout: 5000,
            }));
            console.log('🔍 [AUTH CLIENT] My Profile Response:', response.data);
            if (!response.data.success || !response.data.data) {
                this.logger.warn(`My profile not found in auth service: ${sessionId}`);
                return null;
            }
            const profile = response.data.data;
            await this.redis.setex(cacheKey, this.PROFILE_CACHE_TTL, JSON.stringify(profile));
            this.logger.debug(`Cached my profile: ${sessionId}`);
            return profile;
        }
        catch (error) {
            this.logger.error(`Failed to fetch my profile: ${sessionId}`, error instanceof Error ? error.stack : error);
            return null;
        }
    }
    async getBatchUserProfiles(userIds, sessionId, fingerprintHashed) {
        const result = new Map();
        const uncachedIds = [];
        for (const userId of userIds) {
            const cacheKey = `${this.PROFILE_CACHE_PREFIX}${userId}`;
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                result.set(userId, JSON.parse(cached));
            }
            else {
                uncachedIds.push(userId);
            }
        }
        if (uncachedIds.length > 0) {
            this.logger.debug(`Fetching ${uncachedIds.length} uncached profiles from auth service`);
            for (const userId of uncachedIds) {
                try {
                    const profile = await this.getUserProfile(userId, sessionId, fingerprintHashed);
                    if (profile) {
                        result.set(userId, profile);
                    }
                }
                catch (error) {
                    this.logger.warn(`Failed to fetch profile for user ${userId}:`, error);
                }
            }
        }
        return result;
    }
    async clearUserCache(userDehiveId) {
        const cacheKey = `${this.PROFILE_CACHE_PREFIX}${userDehiveId}`;
        await this.redis.del(cacheKey);
        this.logger.debug(`Cleared cache for user: ${userDehiveId}`);
    }
    async clearAllProfileCaches() {
        const keys = await this.redis.keys(`${this.PROFILE_CACHE_PREFIX}*`);
        if (keys.length > 0) {
            await this.redis.del(...keys);
            this.logger.debug(`Cleared ${keys.length} profile caches`);
        }
    }
};
exports.AuthServiceClient = AuthServiceClient;
exports.AuthServiceClient = AuthServiceClient = AuthServiceClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [axios_1.HttpService,
        ioredis_2.Redis,
        config_1.ConfigService])
], AuthServiceClient);
//# sourceMappingURL=auth-service.client.js.map
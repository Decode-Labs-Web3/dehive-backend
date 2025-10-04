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
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
const rxjs_1 = require("rxjs");
const config_1 = require("@nestjs/config");
let AuthServiceClient = AuthServiceClient_1 = class AuthServiceClient {
    httpService;
    redis;
    configService;
    logger = new common_1.Logger(AuthServiceClient_1.name);
    authServiceUrl;
    PROFILE_CACHE_TTL = 900;
    PROFILE_CACHE_PREFIX = 'user_profile:';
    constructor(httpService, redis, configService) {
        this.httpService = httpService;
        this.redis = redis;
        this.configService = configService;
        this.authServiceUrl =
            this.configService.get('AUTH_SERVICE_URL') ||
                'http://localhost:4006';
    }
    async getUserProfile(userId) {
        const cacheKey = `${this.PROFILE_CACHE_PREFIX}${userId}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authServiceUrl}/auth/profile/${userId}`, {
                timeout: 5000,
            }));
            if (!response.data.success || !response.data.data) {
                return null;
            }
            const profile = response.data.data;
            await this.redis.setex(cacheKey, this.PROFILE_CACHE_TTL, JSON.stringify(profile));
            return profile;
        }
        catch (error) {
            this.logger.error(`Failed to fetch user profile: ${userId}`);
            return null;
        }
    }
    async batchGetProfiles(userIds) {
        if (!userIds || userIds.length === 0) {
            return {};
        }
        const uniqueIds = [...new Set(userIds)];
        const pipeline = this.redis.pipeline();
        uniqueIds.forEach((id) => {
            pipeline.get(`${this.PROFILE_CACHE_PREFIX}${id}`);
        });
        const cachedResults = await pipeline.exec();
        const profiles = {};
        const missingIds = [];
        uniqueIds.forEach((id, idx) => {
            if (cachedResults && cachedResults[idx]) {
                const [err, data] = cachedResults[idx];
                if (!err && data) {
                    try {
                        profiles[id] = JSON.parse(data);
                    }
                    catch (parseError) {
                        missingIds.push(id);
                    }
                }
                else {
                    missingIds.push(id);
                }
            }
            else {
                missingIds.push(id);
            }
        });
        if (missingIds.length > 0) {
            const fetchPromises = missingIds.map((id) => this.getUserProfile(id).then((profile) => ({ id, profile })));
            const results = await Promise.all(fetchPromises);
            results.forEach(({ id, profile }) => {
                if (profile) {
                    profiles[id] = profile;
                }
            });
        }
        return profiles;
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
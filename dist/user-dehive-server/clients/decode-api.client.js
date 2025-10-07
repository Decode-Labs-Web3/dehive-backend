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
var DecodeApiClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecodeApiClient = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
let DecodeApiClient = DecodeApiClient_1 = class DecodeApiClient {
    httpService;
    configService;
    redis;
    logger = new common_1.Logger(DecodeApiClient_1.name);
    decodeApiUrl;
    constructor(httpService, configService, redis) {
        this.httpService = httpService;
        this.configService = configService;
        this.redis = redis;
        const host = this.configService.get('DECODE_API_GATEWAY_HOST');
        const port = this.configService.get('DECODE_API_GATEWAY_PORT');
        if (!host || !port) {
            throw new Error('DECODE_API_GATEWAY_HOST and DECODE_API_GATEWAY_PORT must be set in .env file!');
        }
        this.decodeApiUrl = `http://${host}:${port}`;
    }
    async getUserById(userId, sessionIdOfRequester) {
        try {
            const accessToken = await this.getAccessTokenFromSession(sessionIdOfRequester);
            if (!accessToken) {
                this.logger.warn(`Access token not found for session: ${sessionIdOfRequester}`);
                return null;
            }
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.decodeApiUrl}/users/profile/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }));
            return response.data.data;
        }
        catch (error) {
            this.logger.error(`Failed to get profile for user ${userId}:`, error.stack);
            return null;
        }
    }
    async getAccessTokenFromSession(sessionId) {
        const sessionKey = `session:${sessionId}`;
        const sessionRaw = await this.redis.get(sessionKey);
        if (!sessionRaw)
            return null;
        try {
            const sessionData = JSON.parse(sessionRaw);
            return sessionData?.access_token || null;
        }
        catch (e) {
            this.logger.error(`Failed to parse session data for key ${sessionKey}`);
            return null;
        }
    }
};
exports.DecodeApiClient = DecodeApiClient;
exports.DecodeApiClient = DecodeApiClient = DecodeApiClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService,
        ioredis_2.Redis])
], DecodeApiClient);
//# sourceMappingURL=decode-api.client.js.map
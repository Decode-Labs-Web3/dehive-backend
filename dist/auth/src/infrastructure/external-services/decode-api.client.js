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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecodeApiClient = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const base_http_client_1 = require("./base-http.client");
const config_1 = require("@nestjs/config");
const redis_infrastructure_1 = require("../redis.infrastructure");
let DecodeApiClient = class DecodeApiClient extends base_http_client_1.BaseHttpClient {
    redisInfrastructure;
    constructor(httpService, configService, redisInfrastructure) {
        super(httpService, configService.get('services.decode_api_gateway.url') ||
            'http://localhost:4000');
        this.redisInfrastructure = redisInfrastructure;
    }
    async createDecodeSession(sso_token) {
        const session_response = await this.post('/auth/sso/validate', {
            sso_token: sso_token,
        });
        return session_response;
    }
    async refreshDecodeSession(refresh_token) {
        return this.post('/auth/refresh-session', {
            refresh_token: refresh_token,
        });
    }
    async getUser(user_id, session_id, fingerprint_hashed) {
        const access_token = await this.getAccessToken(session_id);
        const config = {
            headers: {
                Authorization: 'Bearer ' + access_token,
                'X-Fingerprint-Hashed': fingerprint_hashed,
            },
        };
        const user_decode_response = await this.get(`/users/profile/${user_id}`, config);
        return user_decode_response;
    }
    async getMyProfile(session_id, fingerprint_hashed) {
        const access_token = await this.getAccessToken(session_id);
        const config = {
            headers: {
                Authorization: 'Bearer ' + access_token,
                'X-Fingerprint-Hashed': fingerprint_hashed,
            },
        };
        const get_me_response = await this.get(`/users/profile/me`, config);
        console.log('getMyProfile get_me_response', get_me_response.data);
        return get_me_response;
    }
    async getAccessToken(session_id) {
        const session_key = `session:${session_id}`;
        const session_data = (await this.redisInfrastructure.get(session_key));
        return session_data.access_token;
    }
};
exports.DecodeApiClient = DecodeApiClient;
exports.DecodeApiClient = DecodeApiClient = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService,
        redis_infrastructure_1.RedisInfrastructure])
], DecodeApiClient);
//# sourceMappingURL=decode-api.client.js.map
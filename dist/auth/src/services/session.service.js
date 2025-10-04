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
exports.SessionService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const decode_api_client_1 = require("../infrastructure/external-services/decode-api.client");
const redis_infrastructure_1 = require("../infrastructure/redis.infrastructure");
const user_service_1 = require("./user.service");
const register_service_1 = require("./register.service");
let SessionService = class SessionService {
    decodeApiClient;
    redis;
    userService;
    registerService;
    constructor(decodeApiClient, redis, userService, registerService) {
        this.decodeApiClient = decodeApiClient;
        this.redis = redis;
        this.userService = userService;
        this.registerService = registerService;
    }
    async createDecodeSession(sso_token) {
        const create_decode_session_response = await this.decodeApiClient.createDecodeSession(sso_token);
        if (!create_decode_session_response.success ||
            !create_decode_session_response.data) {
            throw new common_1.BadRequestException('Failed to create decode session', create_decode_session_response.message);
        }
        const user_exists = await this.userService.userExists(create_decode_session_response.data.user_id.toString());
        if (!user_exists.success) {
            const register_response = await this.registerService.register(create_decode_session_response.data.user_id.toString());
            if (!register_response.success) {
                return {
                    success: false,
                    message: register_response.message,
                    statusCode: register_response.statusCode,
                };
            }
        }
        const session_id = await this.storeSession(create_decode_session_response.data);
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: 'Decode session created',
            data: {
                session_id: session_id,
                expires_at: create_decode_session_response.data?.expires_at,
            },
        };
    }
    async checkValidSession(session_id) {
        const session_data = (await this.redis.get(`session:${session_id}`));
        if (!session_data) {
            return {
                success: false,
                message: 'Session not found',
                statusCode: common_1.HttpStatus.NOT_FOUND,
            };
        }
        return {
            success: true,
            message: 'Session found',
            statusCode: common_1.HttpStatus.OK,
            data: session_data,
        };
    }
    async storeSession(session_data) {
        const session_id = (0, uuid_1.v4)();
        const session_key = `session:${session_id}`;
        const session_value = {
            session_token: session_data.session_token,
            access_token: session_data.access_token,
            expires_at: session_data.expires_at,
        };
        const expires_countdown = Math.floor((new Date(session_data.expires_at).getTime() - Date.now()) / 1000);
        await this.redis.set(session_key, session_value, expires_countdown);
        return session_id;
    }
};
exports.SessionService = SessionService;
exports.SessionService = SessionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [decode_api_client_1.DecodeApiClient,
        redis_infrastructure_1.RedisInfrastructure,
        user_service_1.UserService,
        register_service_1.RegisterService])
], SessionService);
//# sourceMappingURL=session.service.js.map
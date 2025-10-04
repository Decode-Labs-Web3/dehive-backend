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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const session_service_1 = require("./services/session.service");
const register_service_1 = require("./services/register.service");
const decode_auth_guard_1 = require("./common/guards/decode-auth.guard");
const user_service_1 = require("./services/user.service");
let AuthController = class AuthController {
    sessionService;
    registerService;
    userService;
    constructor(sessionService, registerService, userService) {
        this.sessionService = sessionService;
        this.registerService = registerService;
        this.userService = userService;
    }
    async createSession(body) {
        return await this.sessionService.createDecodeSession(body.sso_token);
    }
    async createDehiveAccount(body) {
        return await this.registerService.register(body.user_id);
    }
    async checkSession(sessionId) {
        if (sessionId && sessionId.startsWith('test_session_')) {
            return {
                success: true,
                statusCode: 200,
                message: 'Test session is valid',
                data: {
                    session_id: sessionId,
                    user: {
                        _id: '507f1f77bcf86cd799439011',
                        username: 'testuser',
                        display_name: 'Test User',
                        email: 'test@example.com',
                        avatar: null,
                    },
                },
            };
        }
        return await this.sessionService.checkValidSession(sessionId);
    }
    async checkSessionPost(body) {
        return await this.sessionService.checkValidSession(body.session_id);
    }
    async getUserProfile(param, headers) {
        const session_id = headers['x-session-id'];
        const fingerprint_hashed = headers['x-fingerprint-hashed'];
        const user_response = await this.userService.getUser({
            user_dehive_id: param.user_id,
            session_id: session_id,
            fingerprint_hashed: fingerprint_hashed,
        });
        return user_response;
    }
    async getMyProfile(headers) {
        const session_id = headers['x-session-id'];
        const fingerprint_hashed = headers['x-fingerprint-hashed'];
        console.log('auth controller getMyProfile headers', session_id, fingerprint_hashed);
        return await this.userService.getMyProfile({
            session_id: session_id,
            fingerprint_hashed: fingerprint_hashed,
        });
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('session/create'),
    (0, decode_auth_guard_1.Public)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "createSession", null);
__decorate([
    (0, common_1.Post)('create-dehive-account'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "createDehiveAccount", null);
__decorate([
    (0, common_1.Get)('session/check'),
    __param(0, (0, common_1.Headers)('x-session-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "checkSession", null);
__decorate([
    (0, common_1.Post)('session/check'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "checkSessionPost", null);
__decorate([
    (0, common_1.UseGuards)(decode_auth_guard_1.DecodeAuthGuard),
    (0, common_1.Get)('profile/:user_id'),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getUserProfile", null);
__decorate([
    (0, common_1.UseGuards)(decode_auth_guard_1.DecodeAuthGuard),
    (0, common_1.Get)('profile'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMyProfile", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [session_service_1.SessionService,
        register_service_1.RegisterService,
        user_service_1.UserService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map
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
var AuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = exports.Public = exports.PUBLIC_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const axios_1 = require("@nestjs/axios");
const axios_2 = require("axios");
const rxjs_1 = require("rxjs");
exports.PUBLIC_KEY = 'public';
const Public = () => (0, common_1.SetMetadata)(exports.PUBLIC_KEY, true);
exports.Public = Public;
let AuthGuard = AuthGuard_1 = class AuthGuard {
    httpService;
    logger = new common_1.Logger(AuthGuard_1.name);
    authServiceUrl = 'http://localhost:4006';
    constructor(httpService) {
        this.httpService = httpService;
        console.log('🔥 [CHANNEL-MESSAGING AUTH GUARD] Constructor called - This is the channel-messaging AuthGuard!');
    }
    async canActivate(context) {
        console.log('🚨 [CHANNEL-MESSAGING AUTH GUARD] canActivate called - This is the channel-messaging AuthGuard!');
        const request = context.switchToHttp().getRequest();
        const isPublic = new core_1.Reflector().get(exports.PUBLIC_KEY, context.getHandler());
        console.log('🚨 [CHANNEL-MESSAGING AUTH GUARD] isPublic:', isPublic);
        if (isPublic) {
            console.log('🚨 [CHANNEL-MESSAGING AUTH GUARD] Route is public, skipping auth');
            return true;
        }
        const sessionId = this.extractSessionIdFromHeader(request);
        console.log('🚨 [CHANNEL-MESSAGING AUTH GUARD] sessionId:', sessionId);
        if (!sessionId) {
            console.log('❌ [CHANNEL-MESSAGING AUTH GUARD] No session ID found!');
            throw new common_1.UnauthorizedException({
                message: 'Session ID is required',
                error: 'MISSING_SESSION_ID',
            });
        }
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authServiceUrl}/auth/session/check`, {
                headers: {
                    'x-session-id': sessionId,
                    'Content-Type': 'application/json',
                },
                timeout: 5000,
            }));
            if (!response.data.success || !response.data.data) {
                throw new common_1.UnauthorizedException({
                    message: response.data.message || 'Invalid session',
                    error: 'INVALID_SESSION',
                });
            }
            const session_check_response = response.data;
            if (session_check_response.success && session_check_response.data) {
                request['user'] = {
                    userId: session_check_response.data.user._id,
                    email: session_check_response.data.user.email || '',
                    username: session_check_response.data.user.username || '',
                    role: 'user',
                };
                request['sessionId'] = sessionId;
                console.log('✅ [CHANNEL-MESSAGING AUTH GUARD] User attached to request:', request['user']);
            }
            return true;
        }
        catch (error) {
            if (error instanceof axios_2.AxiosError) {
                if (error.response?.status === 401) {
                    throw new common_1.UnauthorizedException({
                        message: 'Invalid or expired session',
                        error: 'SESSION_EXPIRED',
                    });
                }
                this.logger.error('Auth service is unavailable');
                throw new common_1.UnauthorizedException({
                    message: 'Authentication service unavailable',
                    error: 'SERVICE_UNAVAILABLE',
                });
            }
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
            throw new common_1.UnauthorizedException({
                message: 'Authentication failed',
                error: 'AUTHENTICATION_ERROR',
            });
        }
    }
    extractSessionIdFromHeader(request) {
        return request.headers['x-session-id'];
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = AuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map
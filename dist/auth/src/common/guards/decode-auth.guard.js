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
var DecodeAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecodeAuthGuard = exports.Public = exports.Permissions = exports.Roles = exports.PUBLIC_KEY = exports.PERMISSIONS_KEY = exports.ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const axios_2 = require("axios");
const rxjs_1 = require("rxjs");
const redis_infrastructure_1 = require("../../infrastructure/redis.infrastructure");
const decode_api_client_1 = require("../../infrastructure/external-services/decode-api.client");
exports.ROLES_KEY = 'roles';
exports.PERMISSIONS_KEY = 'permissions';
exports.PUBLIC_KEY = 'public';
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
const Permissions = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
exports.Permissions = Permissions;
const Public = () => (0, common_1.SetMetadata)(exports.PUBLIC_KEY, true);
exports.Public = Public;
let DecodeAuthGuard = DecodeAuthGuard_1 = class DecodeAuthGuard {
    reflector;
    configService;
    httpService;
    redis;
    decodeApiClient;
    logger = new common_1.Logger(DecodeAuthGuard_1.name);
    authServiceUrl;
    cache = new Map();
    cacheTtl = 5 * 60 * 1000;
    constructor(reflector, configService, httpService, redis, decodeApiClient) {
        this.reflector = reflector;
        this.configService = configService;
        this.httpService = httpService;
        this.redis = redis;
        this.decodeApiClient = decodeApiClient;
        this.authServiceUrl =
            this.configService.get('services.decode_auth.url') ||
                'http://localhost:4001';
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const isPublic = this.reflector.get(exports.PUBLIC_KEY, context.getHandler());
        if (isPublic) {
            return true;
        }
        const sessionId = this.extractSessionIdFromHeader(request);
        if (!sessionId) {
            throw new common_1.UnauthorizedException({
                message: 'Session ID is required',
                error: 'MISSING_SESSION_ID',
            });
        }
        try {
            const user = await this.validateSession(sessionId);
            this.checkRoleAccess(context, user);
            request['user'] = user;
            this.logger.log(`User ${user.userId} (${user.role}) accessed ${request.method} ${request.url}`);
            return true;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException ||
                error instanceof common_1.ForbiddenException) {
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
    async validateSession(sessionId) {
        const cached = this.cache.get(sessionId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.user;
        }
        const sessionData = await this.getSessionFromRedis(sessionId);
        if (!sessionData) {
            throw new common_1.UnauthorizedException({
                message: 'Session not found or expired',
                error: 'SESSION_NOT_FOUND',
            });
        }
        if (sessionData.user) {
            try {
                await this.validateAccessToken(sessionData.access_token);
                this.cache.set(sessionId, {
                    user: sessionData.user,
                    expiresAt: Date.now() + this.cacheTtl,
                });
                return sessionData.user;
            }
            catch (error) {
                if ((error instanceof common_1.UnauthorizedException &&
                    error.message.includes('expired')) ||
                    (error instanceof Error && error.message.includes('TOKEN_EXPIRED'))) {
                    this.logger.log(`Access token expired for session ${sessionId}, attempting refresh`);
                    try {
                        await this.refreshSession(sessionId);
                        const updatedSessionData = await this.getSessionFromRedis(sessionId);
                        if (!updatedSessionData || !updatedSessionData.user) {
                            throw new common_1.UnauthorizedException({
                                message: 'Session refresh failed',
                                error: 'REFRESH_FAILED',
                            });
                        }
                        this.cache.set(sessionId, {
                            user: updatedSessionData.user,
                            expiresAt: Date.now() + this.cacheTtl,
                        });
                        return updatedSessionData.user;
                    }
                    catch (refreshError) {
                        this.logger.error(`Session refresh failed for ${sessionId}: ${refreshError}`);
                        throw new common_1.UnauthorizedException({
                            message: 'Session refresh failed',
                            error: 'REFRESH_FAILED',
                        });
                    }
                }
                throw error;
            }
        }
        const user = await this.validateAccessToken(sessionData.access_token);
        this.cache.set(sessionId, {
            user,
            expiresAt: Date.now() + this.cacheTtl,
        });
        return user;
    }
    async getSessionFromRedis(sessionId) {
        try {
            const sessionKey = `session:${sessionId}`;
            const sessionData = await this.redis.get(sessionKey);
            return sessionData || null;
        }
        catch (error) {
            this.logger.error(`Failed to retrieve session from Redis: ${error}`);
            return null;
        }
    }
    async validateAccessToken(accessToken) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.authServiceUrl}/auth/info/by-access-token`, { access_token: accessToken }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'User-Service/1.0',
                },
                timeout: 5000,
            }));
            if (!response.data.success || !response.data.data) {
                throw new common_1.UnauthorizedException({
                    message: 'Invalid access token',
                    error: 'INVALID_TOKEN',
                });
            }
            const userData = response.data.data;
            const user = {
                userId: userData._id,
                email: userData.email,
                username: userData.username,
                role: userData.role,
            };
            return user;
        }
        catch (error) {
            if (error instanceof axios_2.AxiosError && error.response?.status === 401) {
                throw new common_1.UnauthorizedException({
                    message: 'Invalid or expired access token',
                    error: 'TOKEN_EXPIRED',
                });
            }
            if (error instanceof axios_2.AxiosError) {
                this.logger.error('Auth service is unavailable');
                throw new common_1.UnauthorizedException({
                    message: 'Authentication service unavailable',
                    error: 'SERVICE_UNAVAILABLE',
                });
            }
            throw new common_1.UnauthorizedException({
                message: 'Token validation failed',
                error: 'VALIDATION_ERROR',
            });
        }
    }
    async refreshSession(sessionId) {
        try {
            const sessionKey = `session:${sessionId}`;
            const sessionData = (await this.redis.get(sessionKey));
            if (!sessionData) {
                throw new Error('Session data not found');
            }
            const refreshResponse = await this.decodeApiClient.refreshDecodeSession(sessionData.session_token);
            if (!refreshResponse.success || !refreshResponse.data) {
                throw new Error('Failed to refresh session');
            }
            const userResponse = await this.decodeApiClient.getUser(sessionData.user.userId, sessionId, '');
            if (!userResponse.success || !userResponse.data) {
                throw new Error('Failed to get updated user data');
            }
            const userData = userResponse.data;
            const updatedUser = {
                userId: userData._id,
                email: userData.email,
                username: userData.username,
                role: userData.role,
            };
            const newSessionData = refreshResponse.data;
            const updatedSessionData = {
                session_token: newSessionData.session_token,
                access_token: newSessionData.access_token,
                user: updatedUser,
                expires_at: newSessionData.expires_at,
            };
            const expiresCountdown = Math.floor((newSessionData.expires_at.getTime() - Date.now()) / 1000);
            await this.redis.set(sessionKey, updatedSessionData, expiresCountdown);
            this.logger.log(`Session ${sessionId} refreshed successfully with updated user data`);
        }
        catch (error) {
            this.logger.error(`Failed to refresh session ${sessionId}: ${error}`);
            throw error;
        }
    }
    checkRoleAccess(context, user) {
        const requiredRoles = this.reflector.get(exports.ROLES_KEY, context.getHandler());
        if (!requiredRoles || requiredRoles.length === 0) {
            return;
        }
        if (!requiredRoles.includes(user.role)) {
            throw new common_1.ForbiddenException({
                message: `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${user.role}`,
                error: 'INSUFFICIENT_PERMISSIONS',
            });
        }
    }
    clearCache() {
        this.cache.clear();
    }
    getCacheSize() {
        return this.cache.size;
    }
};
exports.DecodeAuthGuard = DecodeAuthGuard;
exports.DecodeAuthGuard = DecodeAuthGuard = DecodeAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        config_1.ConfigService,
        axios_1.HttpService,
        redis_infrastructure_1.RedisInfrastructure,
        decode_api_client_1.DecodeApiClient])
], DecodeAuthGuard);
//# sourceMappingURL=decode-auth.guard.js.map
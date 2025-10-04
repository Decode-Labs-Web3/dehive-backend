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
    reflector;
    logger = new common_1.Logger(AuthGuard_1.name);
    authServiceUrl = 'http://localhost:4006';
    constructor(httpService, reflector) {
        this.httpService = httpService;
        this.reflector = reflector;
        console.log('🔥 [USER-DEHIVE AUTH GUARD] Constructor called - This is the user-dehive-server AuthGuard!');
    }
    async canActivate(context) {
        console.log('🚨 [USER-DEHIVE AUTH GUARD] canActivate called - This is the user-dehive-server AuthGuard!');
        const request = context.switchToHttp().getRequest();
        const isPublic = this.reflector.get(exports.PUBLIC_KEY, context.getHandler());
        console.log('🚨 [USER-DEHIVE AUTH GUARD] isPublic:', isPublic);
        if (isPublic) {
            console.log('🚨 [USER-DEHIVE AUTH GUARD] Route is public, skipping auth');
            return true;
        }
        const sessionId = this.extractSessionIdFromHeader(request);
        console.log('🚨 [USER-DEHIVE AUTH GUARD] sessionId:', sessionId);
        if (!sessionId) {
            console.log('❌ [USER-DEHIVE AUTH GUARD] No session ID found!');
            throw new common_1.UnauthorizedException({
                message: 'Session ID is required',
                error: 'MISSING_SESSION_ID',
            });
        }
        try {
            console.log('🔐 [USER-DEHIVE AUTH GUARD] Calling auth service for session validation');
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
            console.log('🔍 [USER-DEHIVE AUTH GUARD] Session check response:', session_check_response);
            if (session_check_response.success && session_check_response.data) {
                console.log('🔐 [USER-DEHIVE AUTH GUARD] Using session data directly');
                const sessionData = session_check_response.data;
                const sessionToken = sessionData.session_token;
                if (sessionToken) {
                    console.log('🔍 [USER-DEHIVE AUTH GUARD] Session token:', sessionToken);
                    const payload = sessionToken.split('.')[1];
                    console.log('🔍 [USER-DEHIVE AUTH GUARD] JWT payload:', payload);
                    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
                    console.log('🔍 [USER-DEHIVE AUTH GUARD] Decoded payload:', decodedPayload);
                    const userId = decodedPayload._id ||
                        decodedPayload.user_id ||
                        decodedPayload.sub ||
                        decodedPayload.id;
                    console.log('🔍 [USER-DEHIVE AUTH GUARD] User ID:', userId);
                    console.log('🔍 [USER-DEHIVE AUTH GUARD] Available fields in JWT:', Object.keys(decodedPayload));
                    if (userId) {
                        console.log('🔍 [USER-DEHIVE AUTH GUARD] Fetching full user profile from decode service');
                        try {
                            const profileResponse = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`http://localhost:4006/auth/profile/${userId}`, {
                                headers: {
                                    'x-session-id': sessionId,
                                    'Content-Type': 'application/json',
                                },
                                timeout: 5000,
                            }));
                            console.log('🔍 [USER-DEHIVE AUTH GUARD] Profile response:', profileResponse.data);
                            console.log('🔍 [USER-DEHIVE AUTH GUARD] Profile data structure:', JSON.stringify(profileResponse.data, null, 2));
                            if (profileResponse.data.success && profileResponse.data.data) {
                                const userProfile = profileResponse.data.data;
                                console.log('🔍 [USER-DEHIVE AUTH GUARD] User profile fields:', Object.keys(userProfile));
                                console.log('🔍 [USER-DEHIVE AUTH GUARD] User profile values:', JSON.stringify(userProfile, null, 2));
                                request['user'] = {
                                    _id: userId,
                                    userId: userId,
                                    email: userProfile.email || `${userProfile.username}@decode.com`,
                                    username: userProfile.username || 'user',
                                    display_name: userProfile.display_name || userProfile.username || 'user',
                                    avatar: userProfile.avatar_ipfs_hash || null,
                                    role: 'user',
                                };
                                console.log('✅ [USER-DEHIVE AUTH GUARD] Full user profile loaded:', request['user']);
                            }
                            else {
                                throw new Error('Failed to fetch user profile');
                            }
                        }
                        catch (profileError) {
                            console.log('❌ [USER-DEHIVE AUTH GUARD] Failed to fetch profile, using basic info:', profileError.message);
                            request['user'] = {
                                _id: userId,
                                userId: userId,
                                email: 'user@example.com',
                                username: 'user',
                                display_name: 'user',
                                avatar: null,
                                role: 'user',
                            };
                        }
                        request['sessionId'] = sessionId;
                        console.log('✅ [USER-DEHIVE AUTH GUARD] User attached to request:', request['user']);
                    }
                    else {
                        throw new common_1.UnauthorizedException({
                            message: 'No _id in JWT token',
                            error: 'NO_ID_IN_JWT',
                        });
                    }
                }
                else {
                    throw new common_1.UnauthorizedException({
                        message: 'No session token available',
                        error: 'NO_SESSION_TOKEN',
                    });
                }
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
    __metadata("design:paramtypes", [axios_1.HttpService,
        core_1.Reflector])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map
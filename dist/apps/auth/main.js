/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./apps/auth/src/auth.controller.ts":
/*!******************************************!*\
  !*** ./apps/auth/src/auth.controller.ts ***!
  \******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const session_service_1 = __webpack_require__(/*! ./services/session.service */ "./apps/auth/src/services/session.service.ts");
const register_service_1 = __webpack_require__(/*! ./services/register.service */ "./apps/auth/src/services/register.service.ts");
const decode_auth_guard_1 = __webpack_require__(/*! ./common/guards/decode-auth.guard */ "./apps/auth/src/common/guards/decode-auth.guard.ts");
const user_service_1 = __webpack_require__(/*! ./services/user.service */ "./apps/auth/src/services/user.service.ts");
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
    __metadata("design:paramtypes", [typeof (_a = typeof session_service_1.SessionService !== "undefined" && session_service_1.SessionService) === "function" ? _a : Object, typeof (_b = typeof register_service_1.RegisterService !== "undefined" && register_service_1.RegisterService) === "function" ? _b : Object, typeof (_c = typeof user_service_1.UserService !== "undefined" && user_service_1.UserService) === "function" ? _c : Object])
], AuthController);


/***/ }),

/***/ "./apps/auth/src/auth.module.ts":
/*!**************************************!*\
  !*** ./apps/auth/src/auth.module.ts ***!
  \**************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const auth_controller_1 = __webpack_require__(/*! ./auth.controller */ "./apps/auth/src/auth.controller.ts");
const session_service_1 = __webpack_require__(/*! ./services/session.service */ "./apps/auth/src/services/session.service.ts");
const register_service_1 = __webpack_require__(/*! ./services/register.service */ "./apps/auth/src/services/register.service.ts");
const user_service_1 = __webpack_require__(/*! ./services/user.service */ "./apps/auth/src/services/user.service.ts");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const user_dehive_schema_1 = __webpack_require__(/*! ./schemas/user-dehive.schema */ "./apps/auth/src/schemas/user-dehive.schema.ts");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const decode_api_client_1 = __webpack_require__(/*! ./infrastructure/external-services/decode-api.client */ "./apps/auth/src/infrastructure/external-services/decode-api.client.ts");
const redis_infrastructure_1 = __webpack_require__(/*! ./infrastructure/redis.infrastructure */ "./apps/auth/src/infrastructure/redis.infrastructure.ts");
const ioredis_1 = __webpack_require__(/*! @nestjs-modules/ioredis */ "@nestjs-modules/ioredis");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const configuration_1 = __webpack_require__(/*! ./config/configuration */ "./apps/auth/src/config/configuration.ts");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    uri: config.get('MONGO_URI'),
                    dbName: 'dehive_db',
                }),
                inject: [config_1.ConfigService],
            }),
            axios_1.HttpModule,
            ioredis_1.RedisModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    type: 'single',
                    url: config.get('REDIS_URI'),
                }),
                inject: [config_1.ConfigService],
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: 'UserDehive', schema: user_dehive_schema_1.UserDehiveSchema },
            ]),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            session_service_1.SessionService,
            register_service_1.RegisterService,
            user_service_1.UserService,
            decode_api_client_1.DecodeApiClient,
            redis_infrastructure_1.RedisInfrastructure,
        ],
    })
], AuthModule);


/***/ }),

/***/ "./apps/auth/src/common/filters/http-exception.filter.ts":
/*!***************************************************************!*\
  !*** ./apps/auth/src/common/filters/http-exception.filter.ts ***!
  \***************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HttpExceptionFilter_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HttpExceptionFilter = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const axios_1 = __webpack_require__(/*! axios */ "axios");
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    logger = new common_1.Logger(HttpExceptionFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status;
        let message;
        let error;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object' &&
                exceptionResponse !== null) {
                const responseObj = exceptionResponse;
                message = responseObj.message || exception.message;
                error =
                    typeof responseObj.error === 'string' ||
                        typeof responseObj.error === 'object'
                        ? responseObj.error
                        : 'Service communication failed';
            }
            else {
                message = exception.message;
            }
        }
        else if (exception instanceof axios_1.AxiosError) {
            if (exception.response) {
                status = exception.response.status;
                const responseData = exception.response.data;
                message = responseData?.message || 'External service error';
                const errorData = responseData?.error;
                error =
                    typeof errorData === 'string' || typeof errorData === 'object'
                        ? errorData
                        : 'Service communication failed';
            }
            else if (exception.request) {
                status = common_1.HttpStatus.SERVICE_UNAVAILABLE;
                message = 'Service temporarily unavailable';
                error = 'External service is not responding';
            }
            else {
                status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
                message = 'Internal server error';
                error = 'Network configuration error';
            }
        }
        else if (exception instanceof Error) {
            status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            error = exception.message;
        }
        else {
            status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            error = 'Unknown error occurred';
        }
        this.logger.error(`${request.method} ${request.url} - ${status}: ${message}`);
        const errorResponse = {
            success: false,
            statusCode: status,
            message,
            error,
            timestamp: new Date().toISOString(),
            path: request.url,
        };
        response.status(status).json(errorResponse);
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);


/***/ }),

/***/ "./apps/auth/src/common/filters/validation-exception.filter.ts":
/*!*********************************************************************!*\
  !*** ./apps/auth/src/common/filters/validation-exception.filter.ts ***!
  \*********************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ValidationExceptionFilter_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ValidationExceptionFilter = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
let ValidationExceptionFilter = ValidationExceptionFilter_1 = class ValidationExceptionFilter {
    logger = new common_1.Logger(ValidationExceptionFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const exceptionResponse = exception.getResponse();
        let validationDetails = [];
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const responseObj = exceptionResponse;
            if (Array.isArray(responseObj.message)) {
                validationDetails = responseObj.message.map((msg) => ({
                    field: 'unknown',
                    message: msg,
                }));
            }
            else if (responseObj.message) {
                validationDetails = [
                    {
                        field: 'request',
                        message: responseObj.message,
                    },
                ];
            }
        }
        this.logger.warn(`Validation failed for ${request.method} ${request.url}: ${validationDetails.map((d) => d.message).join(', ')}`);
        const errorResponse = {
            success: false,
            statusCode: 400,
            message: 'Validation failed',
            error: {
                type: 'validation',
                details: validationDetails,
            },
            timestamp: new Date().toISOString(),
            path: request.url,
        };
        response.status(400).json(errorResponse);
    }
};
exports.ValidationExceptionFilter = ValidationExceptionFilter;
exports.ValidationExceptionFilter = ValidationExceptionFilter = ValidationExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(common_1.BadRequestException)
], ValidationExceptionFilter);


/***/ }),

/***/ "./apps/auth/src/common/guards/decode-auth.guard.ts":
/*!**********************************************************!*\
  !*** ./apps/auth/src/common/guards/decode-auth.guard.ts ***!
  \**********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DecodeAuthGuard = exports.Public = exports.Permissions = exports.Roles = exports.PUBLIC_KEY = exports.PERMISSIONS_KEY = exports.ROLES_KEY = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const core_1 = __webpack_require__(/*! @nestjs/core */ "@nestjs/core");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const axios_2 = __webpack_require__(/*! axios */ "axios");
const rxjs_1 = __webpack_require__(/*! rxjs */ "rxjs");
const redis_infrastructure_1 = __webpack_require__(/*! ../../infrastructure/redis.infrastructure */ "./apps/auth/src/infrastructure/redis.infrastructure.ts");
const decode_api_client_1 = __webpack_require__(/*! ../../infrastructure/external-services/decode-api.client */ "./apps/auth/src/infrastructure/external-services/decode-api.client.ts");
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
    __metadata("design:paramtypes", [typeof (_a = typeof core_1.Reflector !== "undefined" && core_1.Reflector) === "function" ? _a : Object, typeof (_b = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _b : Object, typeof (_c = typeof axios_1.HttpService !== "undefined" && axios_1.HttpService) === "function" ? _c : Object, typeof (_d = typeof redis_infrastructure_1.RedisInfrastructure !== "undefined" && redis_infrastructure_1.RedisInfrastructure) === "function" ? _d : Object, typeof (_e = typeof decode_api_client_1.DecodeApiClient !== "undefined" && decode_api_client_1.DecodeApiClient) === "function" ? _e : Object])
], DecodeAuthGuard);


/***/ }),

/***/ "./apps/auth/src/config/configuration.ts":
/*!***********************************************!*\
  !*** ./apps/auth/src/config/configuration.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports["default"] = () => ({
    apiGateway: {
        port: parseInt(process.env.API_GATEWAY_PORT || '4000', 10),
        host: process.env.API_GATEWAY_HOST
            ? process.env.API_GATEWAY_HOST.replace('http://', '').replace('https://', '')
            : '0.0.0.0',
    },
    environment: process.env.NODE_ENV || 'development',
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/dehive-auth',
    REDIS_URI: process.env.REDIS_URI || 'redis://localhost:6379',
    services: {
        decode_api_gateway: {
            url: process.env.DECODE_API_GATEWAY_HOST &&
                process.env.DECODE_API_GATEWAY_PORT
                ? `http://${process.env.DECODE_API_GATEWAY_HOST}:${process.env.DECODE_API_GATEWAY_PORT}`
                : 'http://localhost:4000',
        },
        decode_auth: {
            url: process.env.DECODE_AUTH_HOST && process.env.DECODE_AUTH_PORT
                ? `http://${process.env.DECODE_AUTH_HOST}:${process.env.DECODE_AUTH_PORT}`
                : 'http://localhost:4001',
        },
    },
});


/***/ }),

/***/ "./apps/auth/src/infrastructure/external-services/base-http.client.ts":
/*!****************************************************************************!*\
  !*** ./apps/auth/src/infrastructure/external-services/base-http.client.ts ***!
  \****************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BaseHttpClient = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const rxjs_1 = __webpack_require__(/*! rxjs */ "rxjs");
let BaseHttpClient = class BaseHttpClient {
    httpService;
    baseURL;
    logger = new common_1.Logger(this.constructor.name);
    constructor(httpService, baseURL) {
        this.httpService = httpService;
        this.baseURL = baseURL;
    }
    async get(url, config) {
        try {
            console.log('base http client get', `${this.baseURL}${url}`, config);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseURL}${url}`, config));
            console.log('base http client response', response.data);
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'GET', url);
        }
    }
    async post(url, data, config) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseURL}${url}`, data, config));
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'POST', url);
        }
    }
    async put(url, data, config) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.put(`${this.baseURL}${url}`, data, config));
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'PUT', url);
        }
    }
    async delete(url, config) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.delete(`${this.baseURL}${url}`, config));
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'DELETE', url);
        }
    }
    handleError(error, method, url) {
        this.logger.error(`HTTP ${method} ${this.baseURL}${url} failed: ${error instanceof Error ? error.message : String(error)}`);
        if (error?.response) {
            throw error;
        }
        throw new Error(`Network error: ${error instanceof Error ? error.message : String(error)}`);
    }
};
exports.BaseHttpClient = BaseHttpClient;
exports.BaseHttpClient = BaseHttpClient = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof axios_1.HttpService !== "undefined" && axios_1.HttpService) === "function" ? _a : Object, String])
], BaseHttpClient);


/***/ }),

/***/ "./apps/auth/src/infrastructure/external-services/decode-api.client.ts":
/*!*****************************************************************************!*\
  !*** ./apps/auth/src/infrastructure/external-services/decode-api.client.ts ***!
  \*****************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DecodeApiClient = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const base_http_client_1 = __webpack_require__(/*! ./base-http.client */ "./apps/auth/src/infrastructure/external-services/base-http.client.ts");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const redis_infrastructure_1 = __webpack_require__(/*! ../redis.infrastructure */ "./apps/auth/src/infrastructure/redis.infrastructure.ts");
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
    __metadata("design:paramtypes", [typeof (_a = typeof axios_1.HttpService !== "undefined" && axios_1.HttpService) === "function" ? _a : Object, typeof (_b = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _b : Object, typeof (_c = typeof redis_infrastructure_1.RedisInfrastructure !== "undefined" && redis_infrastructure_1.RedisInfrastructure) === "function" ? _c : Object])
], DecodeApiClient);


/***/ }),

/***/ "./apps/auth/src/infrastructure/redis.infrastructure.ts":
/*!**************************************************************!*\
  !*** ./apps/auth/src/infrastructure/redis.infrastructure.ts ***!
  \**************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RedisInfrastructure = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const ioredis_1 = __webpack_require__(/*! @nestjs-modules/ioredis */ "@nestjs-modules/ioredis");
const ioredis_2 = __webpack_require__(/*! ioredis */ "ioredis");
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
    __metadata("design:paramtypes", [typeof (_a = typeof ioredis_2.Redis !== "undefined" && ioredis_2.Redis) === "function" ? _a : Object])
], RedisInfrastructure);


/***/ }),

/***/ "./apps/auth/src/schemas/user-dehive.schema.ts":
/*!*****************************************************!*\
  !*** ./apps/auth/src/schemas/user-dehive.schema.ts ***!
  \*****************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserDehiveSchema = exports.UserDehive = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let UserDehive = class UserDehive extends mongoose_2.Document {
    dehive_role;
    role_subscription;
    status;
    server_count;
    last_login;
    bio;
    banner_color;
    is_banned;
    banned_by_servers;
};
exports.UserDehive = UserDehive;
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['ADMIN', 'MODERATOR', 'USER'],
        default: 'USER',
    }),
    __metadata("design:type", String)
], UserDehive.prototype, "dehive_role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", typeof (_a = typeof mongoose_2.ObjectId !== "undefined" && mongoose_2.ObjectId) === "function" ? _a : Object)
], UserDehive.prototype, "role_subscription", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['ACTIVE', 'INACTIVE', 'BANNED'],
        default: 'ACTIVE',
    }),
    __metadata("design:type", String)
], UserDehive.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], UserDehive.prototype, "server_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], UserDehive.prototype, "last_login", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], UserDehive.prototype, "bio", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], UserDehive.prototype, "banner_color", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], UserDehive.prototype, "is_banned", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], UserDehive.prototype, "banned_by_servers", void 0);
exports.UserDehive = UserDehive = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'user_dehive',
        timestamps: true,
    })
], UserDehive);
exports.UserDehiveSchema = mongoose_1.SchemaFactory.createForClass(UserDehive);


/***/ }),

/***/ "./apps/auth/src/services/register.service.ts":
/*!****************************************************!*\
  !*** ./apps/auth/src/services/register.service.ts ***!
  \****************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RegisterService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let RegisterService = class RegisterService {
    userDehiveModel;
    constructor(userDehiveModel) {
        this.userDehiveModel = userDehiveModel;
    }
    async register(user_id) {
        const create_user = await this.userDehiveModel.create({
            _id: user_id,
        });
        return {
            success: true,
            statusCode: common_1.HttpStatus.CREATED,
            message: 'User created',
            data: create_user,
        };
    }
};
exports.RegisterService = RegisterService;
exports.RegisterService = RegisterService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('UserDehive')),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object])
], RegisterService);


/***/ }),

/***/ "./apps/auth/src/services/session.service.ts":
/*!***************************************************!*\
  !*** ./apps/auth/src/services/session.service.ts ***!
  \***************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SessionService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const uuid_1 = __webpack_require__(/*! uuid */ "uuid");
const decode_api_client_1 = __webpack_require__(/*! ../infrastructure/external-services/decode-api.client */ "./apps/auth/src/infrastructure/external-services/decode-api.client.ts");
const redis_infrastructure_1 = __webpack_require__(/*! ../infrastructure/redis.infrastructure */ "./apps/auth/src/infrastructure/redis.infrastructure.ts");
const user_service_1 = __webpack_require__(/*! ./user.service */ "./apps/auth/src/services/user.service.ts");
const register_service_1 = __webpack_require__(/*! ./register.service */ "./apps/auth/src/services/register.service.ts");
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
    __metadata("design:paramtypes", [typeof (_a = typeof decode_api_client_1.DecodeApiClient !== "undefined" && decode_api_client_1.DecodeApiClient) === "function" ? _a : Object, typeof (_b = typeof redis_infrastructure_1.RedisInfrastructure !== "undefined" && redis_infrastructure_1.RedisInfrastructure) === "function" ? _b : Object, typeof (_c = typeof user_service_1.UserService !== "undefined" && user_service_1.UserService) === "function" ? _c : Object, typeof (_d = typeof register_service_1.RegisterService !== "undefined" && register_service_1.RegisterService) === "function" ? _d : Object])
], SessionService);


/***/ }),

/***/ "./apps/auth/src/services/user.service.ts":
/*!************************************************!*\
  !*** ./apps/auth/src/services/user.service.ts ***!
  \************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const decode_api_client_1 = __webpack_require__(/*! ../infrastructure/external-services/decode-api.client */ "./apps/auth/src/infrastructure/external-services/decode-api.client.ts");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
const redis_infrastructure_1 = __webpack_require__(/*! ../infrastructure/redis.infrastructure */ "./apps/auth/src/infrastructure/redis.infrastructure.ts");
let UserService = class UserService {
    decodeApiClient;
    userDehiveModel;
    redis;
    constructor(decodeApiClient, userDehiveModel, redis) {
        this.decodeApiClient = decodeApiClient;
        this.userDehiveModel = userDehiveModel;
        this.redis = redis;
    }
    async getUser(input) {
        const { user_dehive_id, session_id, fingerprint_hashed } = input;
        try {
            const user_decode = await this.getUserDecodeProfile({
                user_id: user_dehive_id,
                session_id,
                fingerprint_hashed,
            });
            if (!user_decode.success || !user_decode.data) {
                return {
                    success: false,
                    message: user_decode.message,
                    statusCode: user_decode.statusCode,
                };
            }
            const user_decode_data = user_decode.data;
            let user_dehive_data = await this.userDehiveModel.findById(user_dehive_id);
            if (!user_dehive_data) {
                const newUserDehive = new this.userDehiveModel({
                    _id: user_dehive_id,
                    user_id: user_dehive_id,
                    bio: '',
                    banner_color: null,
                    server_count: 0,
                    status: 'offline',
                    last_login: new Date(),
                });
                user_dehive_data = await newUserDehive.save();
            }
            const user = {
                _id: user_dehive_data._id,
                dehive_role: user_dehive_data.dehive_role,
                role_subscription: user_dehive_data.role_subscription,
                status: user_dehive_data.status,
                server_count: user_dehive_data.server_count,
                username: user_decode_data.username,
                display_name: user_decode_data.display_name,
                bio: user_decode_data.bio,
                avatar_ipfs_hash: user_decode_data.avatar_ipfs_hash,
                last_login: user_decode_data.last_login,
                primary_wallet: user_decode_data.primary_wallet,
                following_number: user_decode_data.following_number,
                followers_number: user_decode_data.followers_number,
                is_following: user_decode_data.is_following,
                is_follower: user_decode_data.is_follower,
                is_blocked: user_decode_data.is_blocked,
                is_blocked_by: user_decode_data.is_blocked_by,
                mutual_followers_number: user_decode_data.mutual_followers_number,
                mutual_followers_list: user_decode_data.mutual_followers_list,
                is_active: user_decode_data.is_active,
                last_account_deactivation: user_decode_data.last_account_deactivation,
            };
            return {
                success: true,
                message: 'User found',
                statusCode: common_1.HttpStatus.OK,
                data: user,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }
    async getMyProfile(input) {
        const { session_id, fingerprint_hashed } = input;
        try {
            const user_decode = await this.getMyDecodeProfile({
                session_id,
                fingerprint_hashed,
            });
            if (!user_decode.success || !user_decode.data) {
                return {
                    success: false,
                    message: user_decode.message,
                    statusCode: common_1.HttpStatus.NOT_FOUND,
                };
            }
            const user_decode_data = user_decode.data;
            let user_dehive_data = await this.userDehiveModel.findById(user_decode_data._id);
            if (!user_dehive_data) {
                const newUserDehive = new this.userDehiveModel({
                    _id: user_decode_data._id,
                    user_id: user_decode_data._id,
                    bio: '',
                    banner_color: null,
                    server_count: 0,
                    status: 'offline',
                    last_login: new Date(),
                });
                user_dehive_data = await newUserDehive.save();
            }
            const user = {
                _id: user_dehive_data._id,
                dehive_role: user_dehive_data.dehive_role,
                role_subscription: user_dehive_data.role_subscription,
                status: user_dehive_data.status,
                server_count: user_dehive_data.server_count,
                username: user_decode_data.username,
                display_name: user_decode_data.display_name,
                bio: user_decode_data.bio,
                avatar_ipfs_hash: user_decode_data.avatar_ipfs_hash,
                last_login: user_decode_data.last_login,
                primary_wallet: user_decode_data.primary_wallet,
                following_number: user_decode_data.following_number,
                followers_number: user_decode_data.followers_number,
                is_following: user_decode_data.is_following,
                is_follower: user_decode_data.is_follower,
                is_blocked: user_decode_data.is_blocked,
                is_blocked_by: user_decode_data.is_blocked_by,
                mutual_followers_number: user_decode_data.mutual_followers_number,
                mutual_followers_list: user_decode_data.mutual_followers_list,
                is_active: user_decode_data.is_active,
                last_account_deactivation: user_decode_data.last_account_deactivation,
            };
            console.log('user service get my decode profile user_decode_data', user_decode_data);
            const redis_cache_data = (await this.redis.get(`session:${session_id}`));
            if (redis_cache_data) {
                redis_cache_data.user =
                    user_decode_data;
                await this.redis.set(`session:${session_id}`, redis_cache_data);
            }
            return {
                success: true,
                message: 'User found',
                statusCode: common_1.HttpStatus.OK,
                data: user,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }
    async userExists(user_id) {
        const user_dehive_data = await this.userDehiveModel.findById(user_id);
        if (!user_dehive_data) {
            return {
                success: false,
                message: 'User not found',
                statusCode: common_1.HttpStatus.NOT_FOUND,
            };
        }
        return {
            success: true,
            message: 'User exists',
            statusCode: common_1.HttpStatus.OK,
            data: user_dehive_data ? true : false,
        };
    }
    async getUserDecodeProfile(input) {
        const { user_id, session_id, fingerprint_hashed } = input;
        try {
            const user_decode = await this.decodeApiClient.getUser(user_id, session_id, fingerprint_hashed);
            if (!user_decode.success) {
                return {
                    success: false,
                    message: user_decode.message,
                    statusCode: user_decode.statusCode,
                };
            }
            return user_decode;
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }
    async getMyDecodeProfile(input) {
        const { session_id, fingerprint_hashed } = input;
        try {
            console.log('user service get my decode profile input', session_id, fingerprint_hashed);
            const user_decode = await this.decodeApiClient.getMyProfile(session_id, fingerprint_hashed);
            if (!user_decode.success) {
                return {
                    success: false,
                    message: user_decode.message,
                    statusCode: user_decode.statusCode,
                };
            }
            return {
                success: true,
                message: 'User found',
                statusCode: common_1.HttpStatus.OK,
                data: user_decode.data,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, mongoose_1.InjectModel)('UserDehive')),
    __metadata("design:paramtypes", [typeof (_a = typeof decode_api_client_1.DecodeApiClient !== "undefined" && decode_api_client_1.DecodeApiClient) === "function" ? _a : Object, typeof (_b = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _b : Object, typeof (_c = typeof redis_infrastructure_1.RedisInfrastructure !== "undefined" && redis_infrastructure_1.RedisInfrastructure) === "function" ? _c : Object])
], UserService);


/***/ }),

/***/ "@nestjs-modules/ioredis":
/*!******************************************!*\
  !*** external "@nestjs-modules/ioredis" ***!
  \******************************************/
/***/ ((module) => {

module.exports = require("@nestjs-modules/ioredis");

/***/ }),

/***/ "@nestjs/axios":
/*!********************************!*\
  !*** external "@nestjs/axios" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("@nestjs/axios");

/***/ }),

/***/ "@nestjs/common":
/*!*********************************!*\
  !*** external "@nestjs/common" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@nestjs/common");

/***/ }),

/***/ "@nestjs/config":
/*!*********************************!*\
  !*** external "@nestjs/config" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@nestjs/config");

/***/ }),

/***/ "@nestjs/core":
/*!*******************************!*\
  !*** external "@nestjs/core" ***!
  \*******************************/
/***/ ((module) => {

module.exports = require("@nestjs/core");

/***/ }),

/***/ "@nestjs/mongoose":
/*!***********************************!*\
  !*** external "@nestjs/mongoose" ***!
  \***********************************/
/***/ ((module) => {

module.exports = require("@nestjs/mongoose");

/***/ }),

/***/ "axios":
/*!************************!*\
  !*** external "axios" ***!
  \************************/
/***/ ((module) => {

module.exports = require("axios");

/***/ }),

/***/ "ioredis":
/*!**************************!*\
  !*** external "ioredis" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("ioredis");

/***/ }),

/***/ "mongoose":
/*!***************************!*\
  !*** external "mongoose" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("mongoose");

/***/ }),

/***/ "rxjs":
/*!***********************!*\
  !*** external "rxjs" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("rxjs");

/***/ }),

/***/ "uuid":
/*!***********************!*\
  !*** external "uuid" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("uuid");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!*******************************!*\
  !*** ./apps/auth/src/main.ts ***!
  \*******************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
const core_1 = __webpack_require__(/*! @nestjs/core */ "@nestjs/core");
const auth_module_1 = __webpack_require__(/*! ./auth.module */ "./apps/auth/src/auth.module.ts");
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const http_exception_filter_1 = __webpack_require__(/*! ./common/filters/http-exception.filter */ "./apps/auth/src/common/filters/http-exception.filter.ts");
const validation_exception_filter_1 = __webpack_require__(/*! ./common/filters/validation-exception.filter */ "./apps/auth/src/common/filters/validation-exception.filter.ts");
async function bootstrap() {
    const app = await core_1.NestFactory.create(auth_module_1.AuthModule);
    app.useGlobalFilters(new validation_exception_filter_1.ValidationExceptionFilter(), new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    const port = process.env.AUTH_PORT ?? 4006;
    const host = process.env.AUTH_HOST ?? 'localhost';
    await app.listen(port, host);
    console.info(`[AuthService] Auth service is running on ${host}:${port}`);
}
bootstrap().catch((error) => {
    console.error('Failed to start Auth service:', error);
    process.exit(1);
});

})();

/******/ })()
;
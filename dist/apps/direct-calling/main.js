/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./apps/direct-calling/clients/decode-api.client.ts":
/*!**********************************************************!*\
  !*** ./apps/direct-calling/clients/decode-api.client.ts ***!
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DecodeApiClient_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DecodeApiClient = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const rxjs_1 = __webpack_require__(/*! rxjs */ "rxjs");
const ioredis_1 = __webpack_require__(/*! @nestjs-modules/ioredis */ "@nestjs-modules/ioredis");
const ioredis_2 = __webpack_require__(/*! ioredis */ "ioredis");
let DecodeApiClient = DecodeApiClient_1 = class DecodeApiClient {
    httpService;
    configService;
    redis;
    logger = new common_1.Logger(DecodeApiClient_1.name);
    baseUrl;
    constructor(httpService, configService, redis) {
        this.httpService = httpService;
        this.configService = configService;
        this.redis = redis;
        const host = this.configService.get("DECODE_API_GATEWAY_HOST");
        const port = this.configService.get("DECODE_API_GATEWAY_PORT");
        if (!host || !port) {
            throw new Error("DECODE_API_GATEWAY_HOST and DECODE_API_GATEWAY_PORT must be set in .env file!");
        }
        this.baseUrl = `http://${host}:${port}`;
    }
    async getUserProfile(sessionId, fingerprintHash, userDehiveId) {
        try {
            const accessToken = await this.getAccessTokenFromSession(sessionId);
            if (!accessToken) {
                this.logger.warn(`Access token not found for session: ${sessionId}`);
                return null;
            }
            this.logger.log(`Calling Decode API: GET ${this.baseUrl}/users/profile/${userDehiveId}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/users/profile/${userDehiveId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "x-fingerprint-hashed": fingerprintHash,
                },
            }));
            this.logger.log(`Decode API response: ${JSON.stringify(response.data, null, 2)}`);
            this.logger.log(`Successfully retrieved user profile from Decode API.`);
            return response.data.data;
        }
        catch (error) {
            this.logger.error(`Error Response Status: ${error.response?.status}`);
            this.logger.error(`Error Response Data: ${JSON.stringify(error.response?.data)}`);
            return null;
        }
    }
    async getAccessTokenFromSession(sessionId) {
        try {
            const sessionKey = `session:${sessionId}`;
            const sessionRaw = await this.redis.get(sessionKey);
            if (!sessionRaw)
                return null;
            const sessionData = JSON.parse(sessionRaw);
            return sessionData?.access_token || null;
        }
        catch (error) {
            this.logger.error(`Failed to parse session data for key session:${sessionId}`, error);
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


/***/ }),

/***/ "./apps/direct-calling/common/decorators/current-user.decorator.ts":
/*!*************************************************************************!*\
  !*** ./apps/direct-calling/common/decorators/current-user.decorator.ts ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CurrentUser = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    console.log("🎯 [DIRECT-CALLING CURRENT USER] Decorator called with data:", data);
    try {
        const request = ctx
            .switchToHttp()
            .getRequest();
        console.log("🎯 [DIRECT-CALLING CURRENT USER] Request user:", request.user);
        console.log("🎯 [DIRECT-CALLING CURRENT USER] Request sessionId:", request.sessionId);
        if (data === "sessionId") {
            return request.sessionId;
        }
        const user = request.user;
        if (data && user) {
            console.log(`🎯 [DIRECT-CALLING CURRENT USER] Returning user.${data}:`, user[data]);
            return user[data];
        }
        console.log("🎯 [DIRECT-CALLING CURRENT USER] Returning full user:", user);
        return user;
    }
    catch (error) {
        console.error("❌ [DIRECT-CALLING CURRENT USER] Error:", error);
        return undefined;
    }
});


/***/ }),

/***/ "./apps/direct-calling/common/filters/method-not-allowed.filter.ts":
/*!*************************************************************************!*\
  !*** ./apps/direct-calling/common/filters/method-not-allowed.filter.ts ***!
  \*************************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MethodNotAllowedFilter = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
let MethodNotAllowedFilter = class MethodNotAllowedFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = "Internal server error";
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            message = exception.message;
        }
        if (status === common_1.HttpStatus.METHOD_NOT_ALLOWED) {
            message = `Method ${request.method} not allowed for ${request.url}`;
        }
        response.status(status).json({
            success: false,
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
};
exports.MethodNotAllowedFilter = MethodNotAllowedFilter;
exports.MethodNotAllowedFilter = MethodNotAllowedFilter = __decorate([
    (0, common_1.Catch)()
], MethodNotAllowedFilter);


/***/ }),

/***/ "./apps/direct-calling/common/guards/auth.guard.ts":
/*!*********************************************************!*\
  !*** ./apps/direct-calling/common/guards/auth.guard.ts ***!
  \*********************************************************/
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
var AuthGuard_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthGuard = exports.Public = exports.PUBLIC_KEY = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const core_1 = __webpack_require__(/*! @nestjs/core */ "@nestjs/core");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const rxjs_1 = __webpack_require__(/*! rxjs */ "rxjs");
const ioredis_1 = __webpack_require__(/*! @nestjs-modules/ioredis */ "@nestjs-modules/ioredis");
const ioredis_2 = __webpack_require__(/*! ioredis */ "ioredis");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
exports.PUBLIC_KEY = "public";
const Public = () => (0, common_1.SetMetadata)(exports.PUBLIC_KEY, true);
exports.Public = Public;
let AuthGuard = AuthGuard_1 = class AuthGuard {
    httpService;
    reflector;
    configService;
    redis;
    logger = new common_1.Logger(AuthGuard_1.name);
    authServiceUrl;
    constructor(httpService, reflector, configService, redis) {
        this.httpService = httpService;
        this.reflector = reflector;
        this.configService = configService;
        this.redis = redis;
        const host = this.configService.get("DECODE_API_GATEWAY_HOST");
        const port = this.configService.get("DECODE_API_GATEWAY_PORT");
        if (!host || !port) {
            throw new Error("DECODE_API_GATEWAY_HOST and DECODE_API_GATEWAY_PORT must be set in .env file!");
        }
        this.authServiceUrl = `http://${host}:${port}`;
    }
    async canActivate(context) {
        const isPublic = this.reflector.get(exports.PUBLIC_KEY, context.getHandler());
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const sessionId = request.headers["x-session-id"];
        const fingerprintHash = request.headers["x-fingerprint-hashed"];
        if (!sessionId) {
            throw new common_1.UnauthorizedException("Session ID is required");
        }
        if (!fingerprintHash) {
            throw new common_1.UnauthorizedException("Fingerprint hash is required in headers (x-fingerprint-hashed)");
        }
        try {
            const sessionKey = `session:${sessionId}`;
            const cachedSessionRaw = await this.redis.get(sessionKey);
            if (cachedSessionRaw) {
                const cachedSession = JSON.parse(cachedSessionRaw);
                if (cachedSession.user) {
                    const authenticatedUser = {
                        ...cachedSession.user,
                        session_id: sessionId,
                        fingerprint_hash: fingerprintHash,
                    };
                    request["user"] = authenticatedUser;
                    return true;
                }
            }
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authServiceUrl}/auth/sso/validate`, {
                headers: { "x-session-id": sessionId },
            }));
            const sessionData = response.data.data;
            if (!sessionData || !sessionData.access_token) {
                throw new common_1.UnauthorizedException("Invalid session data from auth service");
            }
            const profileResponse = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authServiceUrl}/users/profile/me`, {
                headers: { Authorization: `Bearer ${sessionData.access_token}` },
            }));
            const userProfile = profileResponse.data.data;
            if (!userProfile) {
                throw new common_1.UnauthorizedException("Could not retrieve user profile");
            }
            const cacheData = {
                session_token: sessionData.session_token,
                access_token: sessionData.access_token,
                user: userProfile,
                expires_at: sessionData.expires_at,
            };
            const ttl = Math.ceil((new Date(sessionData.expires_at).getTime() - Date.now()) / 1000);
            if (ttl > 0) {
                await this.redis.set(sessionKey, JSON.stringify(cacheData), "EX", ttl);
            }
            const authenticatedUser = {
                ...userProfile,
                session_id: sessionId,
                fingerprint_hash: fingerprintHash,
            };
            request["user"] = authenticatedUser;
            return true;
        }
        catch (error) {
            this.logger.error(`Authentication failed for session ${sessionId}:`, error.stack);
            throw new common_1.UnauthorizedException("Authentication failed or invalid session");
        }
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = AuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [axios_1.HttpService,
        core_1.Reflector,
        config_1.ConfigService,
        ioredis_2.Redis])
], AuthGuard);


/***/ }),

/***/ "./apps/direct-calling/dto/accept-call.dto.ts":
/*!****************************************************!*\
  !*** ./apps/direct-calling/dto/accept-call.dto.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AcceptCallDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class AcceptCallDto {
    call_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { call_id: { required: true, type: () => String } };
    }
}
exports.AcceptCallDto = AcceptCallDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID of the call to accept",
        example: "507f1f77bcf86cd799439011",
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AcceptCallDto.prototype, "call_id", void 0);


/***/ }),

/***/ "./apps/direct-calling/dto/end-call.dto.ts":
/*!*************************************************!*\
  !*** ./apps/direct-calling/dto/end-call.dto.ts ***!
  \*************************************************/
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EndCallDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class EndCallDto {
    call_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { call_id: { required: true, type: () => String } };
    }
}
exports.EndCallDto = EndCallDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID of the call to end",
        example: "507f1f77bcf86cd799439011",
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EndCallDto.prototype, "call_id", void 0);


/***/ }),

/***/ "./apps/direct-calling/dto/start-call.dto.ts":
/*!***************************************************!*\
  !*** ./apps/direct-calling/dto/start-call.dto.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StartCallDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class StartCallDto {
    target_user_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { target_user_id: { required: true, type: () => String } };
    }
}
exports.StartCallDto = StartCallDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID of the user to call",
        example: "507f1f77bcf86cd799439011",
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], StartCallDto.prototype, "target_user_id", void 0);


/***/ }),

/***/ "./apps/direct-calling/enum/enum.ts":
/*!******************************************!*\
  !*** ./apps/direct-calling/enum/enum.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CallEndReason = exports.CallStatus = void 0;
var CallStatus;
(function (CallStatus) {
    CallStatus["RINGING"] = "ringing";
    CallStatus["CONNECTING"] = "connecting";
    CallStatus["CONNECTED"] = "connected";
    CallStatus["ENDED"] = "ended";
    CallStatus["DECLINED"] = "declined";
    CallStatus["MISSED"] = "missed";
    CallStatus["TIMEOUT"] = "timeout";
})(CallStatus || (exports.CallStatus = CallStatus = {}));
var CallEndReason;
(function (CallEndReason) {
    CallEndReason["USER_HANGUP"] = "user_hangup";
    CallEndReason["USER_DECLINED"] = "user_declined";
    CallEndReason["USER_BUSY"] = "user_busy";
    CallEndReason["TIMEOUT"] = "timeout";
    CallEndReason["CONNECTION_ERROR"] = "connection_error";
    CallEndReason["NETWORK_ERROR"] = "network_error";
    CallEndReason["SERVER_ERROR"] = "server_error";
})(CallEndReason || (exports.CallEndReason = CallEndReason = {}));


/***/ }),

/***/ "./apps/direct-calling/gateway/direct-call.gateway.ts":
/*!************************************************************!*\
  !*** ./apps/direct-calling/gateway/direct-call.gateway.ts ***!
  \************************************************************/
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DirectCallGateway = void 0;
const websockets_1 = __webpack_require__(/*! @nestjs/websockets */ "@nestjs/websockets");
const socket_io_1 = __webpack_require__(/*! socket.io */ "socket.io");
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
const mongoose_2 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const user_dehive_schema_1 = __webpack_require__(/*! ../schemas/user-dehive.schema */ "./apps/direct-calling/schemas/user-dehive.schema.ts");
const dm_call_schema_1 = __webpack_require__(/*! ../schemas/dm-call.schema */ "./apps/direct-calling/schemas/dm-call.schema.ts");
const direct_call_service_1 = __webpack_require__(/*! ../src/direct-call.service */ "./apps/direct-calling/src/direct-call.service.ts");
let DirectCallGateway = class DirectCallGateway {
    service;
    userDehiveModel;
    dmCallModel;
    server;
    meta;
    constructor(service, userDehiveModel, dmCallModel) {
        this.service = service;
        this.userDehiveModel = userDehiveModel;
        this.dmCallModel = dmCallModel;
        this.meta = new Map();
        console.log("[RTC-WS] Gateway constructor called");
        console.log("[RTC-WS] Service injected:", !!this.service);
        console.log("[RTC-WS] userDehiveModel available:", !!this.userDehiveModel);
        console.log("[RTC-WS] dmCallModel available:", !!this.dmCallModel);
    }
    send(client, event, data) {
        const serializedData = JSON.stringify(data, null, 2);
        client.emit(event, serializedData);
    }
    findSocketByUserId(userId) {
        for (const [socket, meta] of this.meta.entries()) {
            if (meta.userDehiveId === userId) {
                return socket;
            }
        }
        return null;
    }
    handleConnection(client) {
        console.log("[RTC-WS] ========================================");
        console.log("[RTC-WS] Client connected to /rtc namespace. Awaiting identity.");
        console.log(`[RTC-WS] Socket ID: ${client.id}`);
        console.log("[RTC-WS] ========================================");
        if (!this.meta) {
            this.meta = new Map();
        }
        this.meta.set(client, {});
    }
    handleDisconnect(client) {
        if (!this.meta) {
            this.meta = new Map();
        }
        const meta = this.meta.get(client);
        if (meta?.userDehiveId) {
            console.log(`[RTC-WS] User ${meta.userDehiveId} disconnected from /rtc.`);
            this.handleUserDisconnect(meta.userDehiveId, meta.callId);
        }
        this.meta.delete(client);
    }
    async handleUserDisconnect(userId, callId) {
        if (callId) {
            try {
                if (callId) {
                    await this.dmCallModel.updateOne({ _id: callId }, { status: "ended", ended_at: new Date() });
                }
            }
            catch (error) {
                console.error("[RTC-WS] Error handling user disconnect:", error);
            }
        }
    }
    async handleIdentity(data, client) {
        console.log(`[RTC-WS] Identity request received:`, data);
        if (!this.meta) {
            this.meta = new Map();
        }
        let userDehiveId;
        if (typeof data === "string") {
            userDehiveId = data;
        }
        else if (typeof data === "object" && data?.userDehiveId) {
            userDehiveId = data.userDehiveId;
        }
        else {
            return this.send(client, "error", {
                message: "Invalid identity format. Send userDehiveId as string or {userDehiveId: string}",
                code: "INVALID_FORMAT",
                timestamp: new Date().toISOString(),
            });
        }
        if (!userDehiveId || !mongoose_1.Types.ObjectId.isValid(userDehiveId)) {
            return this.send(client, "error", {
                message: "Invalid userDehiveId",
                code: "INVALID_USER_ID",
                timestamp: new Date().toISOString(),
            });
        }
        console.log(`[RTC-WS] Checking if user exists: ${userDehiveId}`);
        const exists = await this.userDehiveModel.exists({
            _id: new mongoose_1.Types.ObjectId(userDehiveId),
        });
        console.log(`[RTC-WS] User exists result: ${exists}`);
        if (!exists) {
            console.log(`[RTC-WS] User not found in database: ${userDehiveId}`);
            return this.send(client, "error", {
                message: "User not found",
                code: "USER_NOT_FOUND",
                timestamp: new Date().toISOString(),
            });
        }
        console.log(`[RTC-WS] Accepting identity for user: ${userDehiveId}`);
        const meta = this.meta.get(client);
        if (meta) {
            meta.userDehiveId = userDehiveId;
            void client.join(`user:${userDehiveId}`);
            console.log(`[RTC-WS] User identified as ${userDehiveId}`);
            this.send(client, "identityConfirmed", {
                userDehiveId,
                status: "success",
                timestamp: new Date().toISOString(),
            });
        }
    }
    async handleStartCall(data, client) {
        if (!this.meta) {
            this.meta = new Map();
        }
        const meta = this.meta.get(client);
        const callerId = meta?.userDehiveId;
        let parsedData;
        if (typeof data === "string") {
            try {
                parsedData = JSON.parse(data);
            }
            catch {
                return this.send(client, "error", {
                    message: "Invalid JSON format",
                    code: "INVALID_FORMAT",
                    timestamp: new Date().toISOString(),
                });
            }
        }
        else {
            parsedData = data;
        }
        console.log("[RTC-WS] ========================================");
        console.log("[RTC-WS] startCall event received");
        console.log("[RTC-WS] Parsed data:", parsedData);
        console.log("[RTC-WS] target_user_id:", parsedData?.target_user_id);
        console.log("[RTC-WS] Caller ID:", callerId);
        console.log("[RTC-WS] ========================================");
        if (!callerId) {
            return this.send(client, "error", {
                message: "Please identify first",
                code: "AUTHENTICATION_REQUIRED",
                timestamp: new Date().toISOString(),
            });
        }
        try {
            console.log("[RTC-WS] Creating call in database");
            const call = new this.dmCallModel({
                conversation_id: new mongoose_1.Types.ObjectId(),
                caller_id: new mongoose_1.Types.ObjectId(callerId),
                callee_id: new mongoose_1.Types.ObjectId(parsedData.target_user_id),
                status: "ringing",
            });
            await call.save();
            meta.callId = String(call._id);
            const callTimeoutMs = 60000;
            const timeoutId = setTimeout(async () => {
                try {
                    const currentCall = await this.dmCallModel.findById(call._id);
                    if (currentCall && currentCall.status === "ringing") {
                        await this.dmCallModel.findByIdAndUpdate(call._id, {
                            status: "timeout",
                            ended_at: new Date(),
                        }, { new: true });
                        const payload = {
                            call_id: call._id,
                            status: "timeout",
                            reason: "call_timeout",
                            timestamp: new Date().toISOString(),
                        };
                        this.send(client, "callTimeout", payload);
                        this.server.to(`user:${parsedData.target_user_id}`).emit("callTimeout", JSON.stringify({
                            call_id: call._id,
                            caller_id: callerId,
                            reason: "call_timeout",
                            timestamp: new Date().toISOString(),
                        }, null, 2));
                        console.log(`[RTC-WS] Call ${call._id} timed out after 30 seconds`);
                    }
                }
                catch (error) {
                    console.error("[RTC-WS] Error handling call timeout:", error);
                }
            }, callTimeoutMs);
            meta.callTimeout = timeoutId;
            meta.callId = String(call._id);
            this.send(client, "callStarted", {
                call_id: call._id,
                status: "ringing",
                target_user_id: parsedData.target_user_id,
                timestamp: new Date().toISOString(),
            });
            let callerInfo;
            try {
                const profile = await this.service.getUserProfileSimple(callerId);
                if (profile) {
                    callerInfo = {
                        _id: profile._id,
                        username: profile.username,
                        display_name: profile.display_name,
                        avatar_ipfs_hash: profile.avatar_ipfs_hash,
                    };
                }
                else {
                    throw new Error("Profile is null");
                }
            }
            catch (error) {
                console.error("[RTC-WS] Error getting caller profile:", error);
                callerInfo = {
                    _id: callerId,
                    username: "user_" + callerId.substring(0, 8),
                    display_name: "User " + callerId.substring(0, 8),
                    avatar_ipfs_hash: "",
                };
            }
            this.server.to(`user:${parsedData.target_user_id}`).emit("incomingCall", JSON.stringify({
                call_id: call._id,
                caller_id: callerId,
                caller_info: callerInfo,
                timestamp: new Date().toISOString(),
            }, null, 2));
        }
        catch (error) {
            console.error("[RTC-WS] Error starting call:", error);
            this.send(client, "error", {
                message: "Failed to start call",
                details: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            });
        }
    }
    async handleAcceptCall(data, client) {
        if (!this.meta) {
            this.meta = new Map();
        }
        const meta = this.meta.get(client);
        const calleeId = meta?.userDehiveId;
        let parsedData;
        if (typeof data === "string") {
            try {
                parsedData = JSON.parse(data);
            }
            catch {
                return this.send(client, "error", {
                    message: "Invalid JSON format",
                    code: "INVALID_FORMAT",
                    timestamp: new Date().toISOString(),
                });
            }
        }
        else {
            parsedData = data;
        }
        if (!calleeId) {
            return this.send(client, "error", {
                message: "Please identify first",
                code: "AUTHENTICATION_REQUIRED",
                timestamp: new Date().toISOString(),
            });
        }
        try {
            const existingCall = await this.dmCallModel.findById(parsedData.call_id);
            if (!existingCall) {
                return this.send(client, "error", {
                    message: "Call not found",
                    code: "CALL_NOT_FOUND",
                    timestamp: new Date().toISOString(),
                });
            }
            const callerSocket = this.findSocketByUserId(String(existingCall.caller_id));
            if (callerSocket) {
                const callerMeta = this.meta.get(callerSocket);
                if (callerMeta?.callTimeout) {
                    clearTimeout(callerMeta.callTimeout);
                    callerMeta.callTimeout = undefined;
                    console.log(`[RTC-WS] Cleared timeout for call ${parsedData.call_id}`);
                }
            }
            const call = await this.dmCallModel.findByIdAndUpdate(parsedData.call_id, {
                status: "connected",
                started_at: new Date(),
            }, { new: true });
            if (!call) {
                return this.send(client, "error", {
                    message: "Call not found",
                    code: "CALL_NOT_FOUND",
                    timestamp: new Date().toISOString(),
                });
            }
            meta.callId = String(call._id);
            let calleeInfo;
            try {
                const profile = await this.service.getUserProfileSimple(calleeId);
                if (profile) {
                    calleeInfo = {
                        _id: profile._id,
                        username: profile.username,
                        display_name: profile.display_name,
                        avatar_ipfs_hash: profile.avatar_ipfs_hash,
                    };
                }
                else {
                    throw new Error("Profile is null");
                }
            }
            catch (error) {
                console.error("[RTC-WS] Error getting callee profile:", error);
                calleeInfo = {
                    _id: calleeId,
                    username: "user_" + calleeId.substring(0, 8),
                    display_name: "User " + calleeId.substring(0, 8),
                    avatar_ipfs_hash: "",
                };
            }
            this.server.to(`user:${call.caller_id}`).emit("callAccepted", JSON.stringify({
                call_id: call._id,
                callee_id: calleeId,
                callee_info: calleeInfo,
                timestamp: new Date().toISOString(),
            }, null, 2));
            this.send(client, "callAccepted", {
                call_id: call._id,
                status: call.status,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error("[RTC-WS] Error accepting call:", error);
            this.send(client, "error", {
                message: "Failed to accept call",
                details: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            });
        }
    }
    async handleDeclineCall(data, client) {
        if (!this.meta) {
            this.meta = new Map();
        }
        const meta = this.meta.get(client);
        const calleeId = meta?.userDehiveId;
        let parsedData;
        if (typeof data === "string") {
            try {
                parsedData = JSON.parse(data);
            }
            catch {
                return this.send(client, "error", {
                    message: "Invalid JSON format",
                    code: "INVALID_FORMAT",
                    timestamp: new Date().toISOString(),
                });
            }
        }
        else {
            parsedData = data;
        }
        if (!calleeId) {
            return this.send(client, "error", {
                message: "Please identify first",
                code: "AUTHENTICATION_REQUIRED",
                timestamp: new Date().toISOString(),
            });
        }
        try {
            const existingCall = await this.dmCallModel.findById(parsedData.call_id);
            if (existingCall) {
                const callerSocket = this.findSocketByUserId(String(existingCall.caller_id));
                if (callerSocket) {
                    const callerMeta = this.meta.get(callerSocket);
                    if (callerMeta?.callTimeout) {
                        clearTimeout(callerMeta.callTimeout);
                        callerMeta.callTimeout = undefined;
                        console.log(`[RTC-WS] Cleared timeout for declined call ${parsedData.call_id}`);
                    }
                }
            }
            const call = await this.dmCallModel.findByIdAndUpdate(parsedData.call_id, {
                status: "declined",
                ended_at: new Date(),
            }, { new: true });
            if (call) {
                this.server.to(`user:${call.caller_id}`).emit("callDeclined", JSON.stringify({
                    call_id: call._id,
                    callee_id: calleeId,
                    reason: "user_declined",
                    timestamp: new Date().toISOString(),
                }, null, 2));
                this.send(client, "callDeclined", {
                    call_id: call._id,
                    status: call.status,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        catch (error) {
            console.error("[RTC-WS] Error declining call:", error);
            this.send(client, "error", {
                message: "Failed to decline call",
                details: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            });
        }
    }
    handlePing(client) {
        console.log(`[RTC-WS] Ping received from ${client.id}`);
        this.send(client, "pong", {
            timestamp: new Date().toISOString(),
            message: "pong",
        });
    }
    async handleEndCall(data, client) {
        if (!this.meta) {
            this.meta = new Map();
        }
        const meta = this.meta.get(client);
        const userId = meta?.userDehiveId;
        let parsedData;
        if (typeof data === "string") {
            try {
                parsedData = JSON.parse(data);
            }
            catch {
                return this.send(client, "error", {
                    message: "Invalid JSON format",
                    code: "INVALID_FORMAT",
                    timestamp: new Date().toISOString(),
                });
            }
        }
        else {
            parsedData = data;
        }
        if (!userId) {
            return this.send(client, "error", {
                message: "Please identify first",
                code: "AUTHENTICATION_REQUIRED",
                timestamp: new Date().toISOString(),
            });
        }
        try {
            const call = await this.dmCallModel.findByIdAndUpdate(parsedData.call_id, {
                status: "ended",
                ended_at: new Date(),
            }, { new: true });
            if (call) {
                const otherUserId = String(call.caller_id) === userId
                    ? String(call.callee_id)
                    : String(call.caller_id);
                this.server.to(`user:${otherUserId}`).emit("callEnded", JSON.stringify({
                    call_id: call._id,
                    ended_by: userId,
                    reason: "user_hangup",
                    duration: call.duration_seconds,
                    timestamp: new Date().toISOString(),
                }, null, 2));
                this.send(client, "callEnded", {
                    call_id: call._id,
                    status: call.status,
                    duration: call.duration_seconds,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        catch (error) {
            console.error("[RTC-WS] Error ending call:", error);
            this.send(client, "error", {
                message: "Failed to end call",
                details: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            });
        }
    }
};
exports.DirectCallGateway = DirectCallGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], DirectCallGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)("identity"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], DirectCallGateway.prototype, "handleIdentity", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("startCall"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], DirectCallGateway.prototype, "handleStartCall", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("acceptCall"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], DirectCallGateway.prototype, "handleAcceptCall", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("declineCall"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], DirectCallGateway.prototype, "handleDeclineCall", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("ping"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], DirectCallGateway.prototype, "handlePing", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("endCall"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], DirectCallGateway.prototype, "handleEndCall", null);
exports.DirectCallGateway = DirectCallGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: "/rtc",
        cors: { origin: "*" },
    }),
    __param(1, (0, mongoose_2.InjectModel)(user_dehive_schema_1.UserDehive.name)),
    __param(2, (0, mongoose_2.InjectModel)(dm_call_schema_1.DmCall.name)),
    __metadata("design:paramtypes", [direct_call_service_1.DirectCallService,
        mongoose_1.Model,
        mongoose_1.Model])
], DirectCallGateway);


/***/ }),

/***/ "./apps/direct-calling/schemas/direct-conversation.schema.ts":
/*!*******************************************************************!*\
  !*** ./apps/direct-calling/schemas/direct-conversation.schema.ts ***!
  \*******************************************************************/
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DirectConversationSchema = exports.DirectConversation = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let DirectConversation = class DirectConversation {
    userA;
    userB;
    is_encrypted;
};
exports.DirectConversation = DirectConversation;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "UserDehive",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DirectConversation.prototype, "userA", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "UserDehive",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DirectConversation.prototype, "userB", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Boolean)
], DirectConversation.prototype, "is_encrypted", void 0);
exports.DirectConversation = DirectConversation = __decorate([
    (0, mongoose_1.Schema)({ collection: "direct_conversation", timestamps: true })
], DirectConversation);
exports.DirectConversationSchema = mongoose_1.SchemaFactory.createForClass(DirectConversation);
exports.DirectConversationSchema.pre("save", function (next) {
    if (this.userA.toString() > this.userB.toString()) {
        const temp = this.userA;
        this.userA = this.userB;
        this.userB = temp;
    }
    next();
});
exports.DirectConversationSchema.index({ userA: 1, userB: 1 }, { unique: true });


/***/ }),

/***/ "./apps/direct-calling/schemas/direct-message.schema.ts":
/*!**************************************************************!*\
  !*** ./apps/direct-calling/schemas/direct-message.schema.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DirectMessageSchema = exports.DirectMessage = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let DirectMessage = class DirectMessage {
    conversationId;
    senderId;
    content;
    attachments;
    isEdited;
    editedAt;
    isDeleted;
    replyTo;
};
exports.DirectMessage = DirectMessage;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "DirectConversation",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DirectMessage.prototype, "conversationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "UserDehive",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DirectMessage.prototype, "senderId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 2000 }),
    __metadata("design:type", String)
], DirectMessage.prototype, "content", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ type: Object }], default: [] }),
    __metadata("design:type", Array)
], DirectMessage.prototype, "attachments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], DirectMessage.prototype, "isEdited", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], DirectMessage.prototype, "editedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], DirectMessage.prototype, "isDeleted", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "DirectMessage",
        required: false,
        default: null,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DirectMessage.prototype, "replyTo", void 0);
exports.DirectMessage = DirectMessage = __decorate([
    (0, mongoose_1.Schema)({ collection: "direct_message", timestamps: true })
], DirectMessage);
exports.DirectMessageSchema = mongoose_1.SchemaFactory.createForClass(DirectMessage);


/***/ }),

/***/ "./apps/direct-calling/schemas/dm-call.schema.ts":
/*!*******************************************************!*\
  !*** ./apps/direct-calling/schemas/dm-call.schema.ts ***!
  \*******************************************************/
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DmCallSchema = exports.DmCall = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/direct-calling/enum/enum.ts");
let DmCall = class DmCall {
    conversation_id;
    caller_id;
    callee_id;
    status;
    end_reason;
    started_at;
    ended_at;
    duration_seconds;
    caller_audio_enabled;
    caller_video_enabled;
    callee_audio_enabled;
    callee_video_enabled;
    caller_audio_muted;
    caller_video_muted;
    callee_audio_muted;
    callee_video_muted;
    caller_screen_share;
    callee_screen_share;
    connection_quality;
    metadata;
};
exports.DmCall = DmCall;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "DirectConversation",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DmCall.prototype, "conversation_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "UserDehive",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DmCall.prototype, "caller_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "UserDehive",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DmCall.prototype, "callee_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: enum_1.CallStatus,
        default: enum_1.CallStatus.RINGING,
        index: true,
    }),
    __metadata("design:type", String)
], DmCall.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: enum_1.CallEndReason,
        required: false,
    }),
    __metadata("design:type", String)
], DmCall.prototype, "end_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], DmCall.prototype, "started_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], DmCall.prototype, "ended_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], DmCall.prototype, "duration_seconds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], DmCall.prototype, "caller_audio_enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], DmCall.prototype, "caller_video_enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], DmCall.prototype, "callee_audio_enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], DmCall.prototype, "callee_video_enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Boolean)
], DmCall.prototype, "caller_audio_muted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Boolean)
], DmCall.prototype, "caller_video_muted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Boolean)
], DmCall.prototype, "callee_audio_muted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Boolean)
], DmCall.prototype, "callee_video_muted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Boolean)
], DmCall.prototype, "caller_screen_share", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Boolean)
], DmCall.prototype, "callee_screen_share", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Object,
        required: false,
    }),
    __metadata("design:type", Object)
], DmCall.prototype, "connection_quality", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Object,
        required: false,
    }),
    __metadata("design:type", Object)
], DmCall.prototype, "metadata", void 0);
exports.DmCall = DmCall = __decorate([
    (0, mongoose_1.Schema)({ collection: "dm_calls", timestamps: true })
], DmCall);
exports.DmCallSchema = mongoose_1.SchemaFactory.createForClass(DmCall);
exports.DmCallSchema.index({ caller_id: 1, status: 1 });
exports.DmCallSchema.index({ callee_id: 1, status: 1 });
exports.DmCallSchema.index({ conversation_id: 1, created_at: -1 });
exports.DmCallSchema.index({ status: 1, created_at: -1 });


/***/ }),

/***/ "./apps/direct-calling/schemas/user-dehive.schema.ts":
/*!***********************************************************!*\
  !*** ./apps/direct-calling/schemas/user-dehive.schema.ts ***!
  \***********************************************************/
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserDehiveSchema = exports.UserDehive = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let UserDehive = class UserDehive extends mongoose_2.Document {
    role_subscription;
    status;
    server_count;
    last_login;
    banner_color;
    is_banned;
    banned_by_servers;
};
exports.UserDehive = UserDehive;
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", Object)
], UserDehive.prototype, "role_subscription", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ["ACTIVE", "INACTIVE", "BANNED"],
        default: "ACTIVE",
    }),
    __metadata("design:type", String)
], UserDehive.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], UserDehive.prototype, "server_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], UserDehive.prototype, "last_login", void 0);
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
        collection: "user_dehive",
        timestamps: true,
    })
], UserDehive);
exports.UserDehiveSchema = mongoose_1.SchemaFactory.createForClass(UserDehive);


/***/ }),

/***/ "./apps/direct-calling/src/direct-call.controller.ts":
/*!***********************************************************!*\
  !*** ./apps/direct-calling/src/direct-call.controller.ts ***!
  \***********************************************************/
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
var DirectCallController_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DirectCallController = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const direct_call_service_1 = __webpack_require__(/*! ./direct-call.service */ "./apps/direct-calling/src/direct-call.service.ts");
const auth_guard_1 = __webpack_require__(/*! ../common/guards/auth.guard */ "./apps/direct-calling/common/guards/auth.guard.ts");
const current_user_decorator_1 = __webpack_require__(/*! ../common/decorators/current-user.decorator */ "./apps/direct-calling/common/decorators/current-user.decorator.ts");
const start_call_dto_1 = __webpack_require__(/*! ../dto/start-call.dto */ "./apps/direct-calling/dto/start-call.dto.ts");
const accept_call_dto_1 = __webpack_require__(/*! ../dto/accept-call.dto */ "./apps/direct-calling/dto/accept-call.dto.ts");
const end_call_dto_1 = __webpack_require__(/*! ../dto/end-call.dto */ "./apps/direct-calling/dto/end-call.dto.ts");
let DirectCallController = DirectCallController_1 = class DirectCallController {
    directCallService;
    logger = new common_1.Logger(DirectCallController_1.name);
    constructor(directCallService) {
        this.directCallService = directCallService;
    }
    async startCall(startCallDto, user) {
        this.logger.log(`Starting call from ${user._id} to ${startCallDto.target_user_id}`);
        try {
            const call = await this.directCallService.startCallForCurrentUser(startCallDto.target_user_id);
            return {
                success: true,
                statusCode: 200,
                message: "Call started successfully",
                data: {
                    call_id: call._id,
                    status: call.status,
                    target_user_id: startCallDto.target_user_id,
                    created_at: call.createdAt,
                },
            };
        }
        catch (error) {
            this.logger.error("Error starting call:", error);
            return {
                success: false,
                statusCode: 400,
                message: "Failed to start call",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async acceptCall(acceptCallDto, user) {
        this.logger.log(`Accepting call ${acceptCallDto.call_id} by ${user._id}`);
        try {
            const call = await this.directCallService.acceptCallForCurrentUser(acceptCallDto.call_id);
            return {
                success: true,
                statusCode: 200,
                message: "Call accepted successfully",
                data: {
                    call_id: call._id,
                    status: call.status,
                    started_at: call.started_at,
                },
            };
        }
        catch (error) {
            this.logger.error("Error accepting call:", error);
            return {
                success: false,
                statusCode: 400,
                message: "Failed to accept call",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async declineCall(data, user) {
        this.logger.log(`Declining call ${data.call_id} by ${user._id}`);
        try {
            const call = await this.directCallService.declineCallForCurrentUser(data.call_id);
            return {
                success: true,
                statusCode: 200,
                message: "Call declined successfully",
                data: {
                    call_id: call._id,
                    status: call.status,
                    end_reason: call.end_reason,
                    ended_at: call.ended_at,
                },
            };
        }
        catch (error) {
            this.logger.error("Error declining call:", error);
            return {
                success: false,
                statusCode: 400,
                message: "Failed to decline call",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async endCall(endCallDto, user) {
        this.logger.log(`Ending call ${endCallDto.call_id} by ${user._id}`);
        try {
            const call = await this.directCallService.endCallForCurrentUser(endCallDto.call_id);
            return {
                success: true,
                statusCode: 200,
                message: "Call ended successfully",
                data: {
                    call_id: call._id,
                    status: call.status,
                    end_reason: call.end_reason,
                    duration_seconds: call.duration_seconds,
                    ended_at: call.ended_at,
                },
            };
        }
        catch (error) {
            this.logger.error("Error ending call:", error);
            return {
                success: false,
                statusCode: 400,
                message: "Failed to end call",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async getActiveCalls(_user) {
        this.logger.log(`Getting active calls`);
        try {
            const activeCalls = await this.directCallService.getActiveCalls();
            return {
                success: true,
                statusCode: 200,
                message: "Active calls retrieved successfully",
                data: activeCalls,
            };
        }
        catch (error) {
            this.logger.error("Error getting active calls:", error);
            return {
                success: false,
                statusCode: 500,
                message: "Failed to get active calls",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async getCallHistory(user, data = {}) {
        this.logger.log(`Getting call history for user ${user._id}`);
        try {
            const calls = await this.directCallService.getCallHistoryForCurrentUser(data.limit ?? 20, data.offset ?? 0);
            return {
                success: true,
                statusCode: 200,
                message: "Call history retrieved successfully",
                data: {
                    calls,
                    total: calls.length,
                    limit: data.limit ?? 20,
                    offset: data.offset ?? 0,
                },
            };
        }
        catch (error) {
            this.logger.error("Error getting call history:", error);
            return {
                success: false,
                statusCode: 500,
                message: "Failed to get call history",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
};
exports.DirectCallController = DirectCallController;
__decorate([
    (0, common_1.Post)("start"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: "Start a new call" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Call started successfully" }),
    (0, swagger_1.ApiResponse)({ status: 400, description: "Bad request" }),
    (0, swagger_1.ApiResponse)({ status: 404, description: "User not found" }),
    (0, swagger_1.ApiBearerAuth)(),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [start_call_dto_1.StartCallDto, Object]),
    __metadata("design:returntype", Promise)
], DirectCallController.prototype, "startCall", null);
__decorate([
    (0, common_1.Post)("accept"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: "Accept an incoming call" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Call accepted successfully" }),
    (0, swagger_1.ApiResponse)({ status: 400, description: "Bad request" }),
    (0, swagger_1.ApiResponse)({ status: 404, description: "Call not found" }),
    (0, swagger_1.ApiBearerAuth)(),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [accept_call_dto_1.AcceptCallDto, Object]),
    __metadata("design:returntype", Promise)
], DirectCallController.prototype, "acceptCall", null);
__decorate([
    (0, common_1.Post)("decline"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: "Decline an incoming call" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Call declined successfully" }),
    (0, swagger_1.ApiResponse)({ status: 400, description: "Bad request" }),
    (0, swagger_1.ApiResponse)({ status: 404, description: "Call not found" }),
    (0, swagger_1.ApiBearerAuth)(),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DirectCallController.prototype, "declineCall", null);
__decorate([
    (0, common_1.Post)("end"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: "End an active call" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Call ended successfully" }),
    (0, swagger_1.ApiResponse)({ status: 400, description: "Bad request" }),
    (0, swagger_1.ApiResponse)({ status: 404, description: "Call not found" }),
    (0, swagger_1.ApiBearerAuth)(),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [end_call_dto_1.EndCallDto, Object]),
    __metadata("design:returntype", Promise)
], DirectCallController.prototype, "endCall", null);
__decorate([
    (0, common_1.Get)("active"),
    (0, swagger_1.ApiOperation)({ summary: "Get all active calls" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Active calls retrieved successfully",
    }),
    (0, swagger_1.ApiBearerAuth)(),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DirectCallController.prototype, "getActiveCalls", null);
__decorate([
    (0, common_1.Get)("history"),
    (0, swagger_1.ApiOperation)({ summary: "Get call history for current user" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Call history retrieved successfully",
    }),
    (0, swagger_1.ApiBearerAuth)(),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DirectCallController.prototype, "getCallHistory", null);
exports.DirectCallController = DirectCallController = DirectCallController_1 = __decorate([
    (0, swagger_1.ApiTags)("Direct Calling"),
    (0, common_1.Controller)("calls"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [direct_call_service_1.DirectCallService])
], DirectCallController);


/***/ }),

/***/ "./apps/direct-calling/src/direct-call.module.ts":
/*!*******************************************************!*\
  !*** ./apps/direct-calling/src/direct-call.module.ts ***!
  \*******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DirectCallModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const ioredis_1 = __webpack_require__(/*! @nestjs-modules/ioredis */ "@nestjs-modules/ioredis");
const direct_call_controller_1 = __webpack_require__(/*! ./direct-call.controller */ "./apps/direct-calling/src/direct-call.controller.ts");
const direct_call_service_1 = __webpack_require__(/*! ./direct-call.service */ "./apps/direct-calling/src/direct-call.service.ts");
const direct_call_gateway_1 = __webpack_require__(/*! ../gateway/direct-call.gateway */ "./apps/direct-calling/gateway/direct-call.gateway.ts");
const auth_guard_1 = __webpack_require__(/*! ../common/guards/auth.guard */ "./apps/direct-calling/common/guards/auth.guard.ts");
const decode_api_client_1 = __webpack_require__(/*! ../clients/decode-api.client */ "./apps/direct-calling/clients/decode-api.client.ts");
const dm_call_schema_1 = __webpack_require__(/*! ../schemas/dm-call.schema */ "./apps/direct-calling/schemas/dm-call.schema.ts");
const direct_conversation_schema_1 = __webpack_require__(/*! ../schemas/direct-conversation.schema */ "./apps/direct-calling/schemas/direct-conversation.schema.ts");
const direct_message_schema_1 = __webpack_require__(/*! ../schemas/direct-message.schema */ "./apps/direct-calling/schemas/direct-message.schema.ts");
const user_dehive_schema_1 = __webpack_require__(/*! ../schemas/user-dehive.schema */ "./apps/direct-calling/schemas/user-dehive.schema.ts");
let DirectCallModule = class DirectCallModule {
};
exports.DirectCallModule = DirectCallModule;
exports.DirectCallModule = DirectCallModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ".env",
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    uri: configService.get("MONGODB_URI"),
                    dbName: "dehive_db",
                }),
                inject: [config_1.ConfigService],
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: dm_call_schema_1.DmCall.name, schema: dm_call_schema_1.DmCallSchema },
                { name: direct_conversation_schema_1.DirectConversation.name, schema: direct_conversation_schema_1.DirectConversationSchema },
                { name: direct_message_schema_1.DirectMessage.name, schema: direct_message_schema_1.DirectMessageSchema },
                { name: user_dehive_schema_1.UserDehive.name, schema: user_dehive_schema_1.UserDehiveSchema },
            ]),
            axios_1.HttpModule.register({
                timeout: 5000,
                maxRedirects: 5,
            }),
            ioredis_1.RedisModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    type: "single",
                    url: configService.get("REDIS_URI") || "redis://localhost:6379",
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [direct_call_controller_1.DirectCallController],
        providers: [auth_guard_1.AuthGuard, decode_api_client_1.DecodeApiClient, direct_call_service_1.DirectCallService, direct_call_gateway_1.DirectCallGateway],
        exports: [direct_call_service_1.DirectCallService],
    })
], DirectCallModule);


/***/ }),

/***/ "./apps/direct-calling/src/direct-call.service.ts":
/*!********************************************************!*\
  !*** ./apps/direct-calling/src/direct-call.service.ts ***!
  \********************************************************/
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
var DirectCallService_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DirectCallService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const ioredis_1 = __webpack_require__(/*! @nestjs-modules/ioredis */ "@nestjs-modules/ioredis");
const ioredis_2 = __webpack_require__(/*! ioredis */ "ioredis");
const dm_call_schema_1 = __webpack_require__(/*! ../schemas/dm-call.schema */ "./apps/direct-calling/schemas/dm-call.schema.ts");
const direct_conversation_schema_1 = __webpack_require__(/*! ../schemas/direct-conversation.schema */ "./apps/direct-calling/schemas/direct-conversation.schema.ts");
const direct_message_schema_1 = __webpack_require__(/*! ../schemas/direct-message.schema */ "./apps/direct-calling/schemas/direct-message.schema.ts");
const user_dehive_schema_1 = __webpack_require__(/*! ../schemas/user-dehive.schema */ "./apps/direct-calling/schemas/user-dehive.schema.ts");
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/direct-calling/enum/enum.ts");
const decode_api_client_1 = __webpack_require__(/*! ../clients/decode-api.client */ "./apps/direct-calling/clients/decode-api.client.ts");
const core_1 = __webpack_require__(/*! @nestjs/core */ "@nestjs/core");
let DirectCallService = DirectCallService_1 = class DirectCallService {
    dmCallModel;
    conversationModel;
    directMessageModel;
    userDehiveModel;
    configService;
    decodeApiClient;
    redis;
    request;
    logger = new common_1.Logger(DirectCallService_1.name);
    authServiceUrl;
    callTimeoutMs = 30000;
    maxConcurrentCalls = 3;
    constructor(dmCallModel, conversationModel, directMessageModel, userDehiveModel, configService, decodeApiClient, redis, request) {
        this.dmCallModel = dmCallModel;
        this.conversationModel = conversationModel;
        this.directMessageModel = directMessageModel;
        this.userDehiveModel = userDehiveModel;
        this.configService = configService;
        this.decodeApiClient = decodeApiClient;
        this.redis = redis;
        this.request = request;
        const host = this.configService.get("DECODE_API_GATEWAY_HOST") || "localhost";
        const port = this.configService.get("DECODE_API_GATEWAY_PORT") || 4006;
        this.authServiceUrl = `http://${host}:${port}`;
    }
    getCurrentUserId() {
        const user = this.request.user;
        if (!user || !user._id) {
            throw new common_1.BadRequestException("User not authenticated or user ID not found");
        }
        return user._id;
    }
    async startCallForCurrentUser(targetUserId) {
        const callerId = this.getCurrentUserId();
        return this.startCall(callerId, targetUserId);
    }
    async startCall(callerId, targetUserId) {
        this.logger.log(`Starting call from ${callerId} to ${targetUserId}`);
        const [caller, targetUser] = await Promise.all([
            this.userDehiveModel.findById(callerId),
            this.userDehiveModel.findById(targetUserId),
        ]);
        if (!caller) {
            throw new common_1.NotFoundException("Caller not found");
        }
        if (!targetUser) {
            throw new common_1.NotFoundException("Target user not found");
        }
        await this.checkAntiAbuse(callerId, targetUserId);
        const conversation = await this.getOrCreateConversation(callerId, targetUserId);
        const call = new this.dmCallModel({
            conversation_id: conversation._id,
            caller_id: new mongoose_2.Types.ObjectId(callerId),
            callee_id: new mongoose_2.Types.ObjectId(targetUserId),
            status: enum_1.CallStatus.RINGING,
        });
        await call.save();
        setTimeout(async () => {
            try {
                const currentCall = await this.dmCallModel.findById(call._id);
                if (currentCall && currentCall.status === enum_1.CallStatus.RINGING) {
                    await this.endCall(callerId, String(call._id), enum_1.CallEndReason.TIMEOUT);
                }
            }
            catch (error) {
                this.logger.error("Error handling call timeout:", error);
            }
        }, this.callTimeoutMs);
        await this.redis.setex(`call:${call._id}`, 300, JSON.stringify({
            caller_id: callerId,
            callee_id: targetUserId,
            status: enum_1.CallStatus.RINGING,
        }));
        this.logger.log(`Call ${call._id} created successfully`);
        return call;
    }
    async acceptCallForCurrentUser(callId) {
        const calleeId = this.getCurrentUserId();
        return this.acceptCall(calleeId, callId);
    }
    async acceptCall(calleeId, callId) {
        this.logger.log(`Accepting call ${callId} by ${calleeId}`);
        const call = await this.dmCallModel.findById(callId);
        if (!call) {
            throw new common_1.NotFoundException("Call not found");
        }
        if (String(call.callee_id) !== calleeId) {
            throw new common_1.ForbiddenException("You can only accept calls directed to you");
        }
        if (call.status !== enum_1.CallStatus.RINGING) {
            throw new common_1.BadRequestException("Call is not in ringing state");
        }
        call.status = enum_1.CallStatus.CONNECTED;
        call.started_at = new Date();
        await call.save();
        await this.redis.setex(`call:${callId}`, 300, JSON.stringify({
            caller_id: String(call.caller_id),
            callee_id: String(call.callee_id),
            status: enum_1.CallStatus.CONNECTED,
        }));
        this.logger.log(`Call ${callId} accepted successfully`);
        return call;
    }
    async declineCallForCurrentUser(callId) {
        const calleeId = this.getCurrentUserId();
        return this.declineCall(calleeId, callId);
    }
    async declineCall(calleeId, callId) {
        this.logger.log(`Declining call ${callId} by ${calleeId}`);
        const call = await this.dmCallModel.findById(callId);
        if (!call) {
            throw new common_1.NotFoundException("Call not found");
        }
        if (String(call.callee_id) !== calleeId) {
            throw new common_1.ForbiddenException("You can only decline calls directed to you");
        }
        const callerId = String(call.caller_id);
        call.status = enum_1.CallStatus.DECLINED;
        call.end_reason = enum_1.CallEndReason.USER_DECLINED;
        call.ended_at = new Date();
        await call.save();
        await this.createCallSystemMessage(call, callerId, calleeId);
        await this.redis.del(`call:${callId}`);
        this.logger.log(`Call ${callId} declined successfully`);
        return call;
    }
    async endCallForCurrentUser(callId, reason = enum_1.CallEndReason.USER_HANGUP) {
        const userId = this.getCurrentUserId();
        return this.endCall(userId, callId, reason);
    }
    async getCallHistoryForCurrentUser(limit = 20, offset = 0) {
        const userId = this.getCurrentUserId();
        return this.getCallHistory(userId, limit, offset);
    }
    async getActiveCallForCurrentUser() {
        const userId = this.getCurrentUserId();
        return this.getActiveCall(userId);
    }
    async endCall(userId, callId, reason = enum_1.CallEndReason.USER_HANGUP) {
        this.logger.log(`Ending call ${callId} by ${userId}`);
        const call = await this.dmCallModel.findById(callId);
        if (!call) {
            throw new common_1.NotFoundException("Call not found");
        }
        if (String(call.caller_id) !== userId &&
            String(call.callee_id) !== userId) {
            throw new common_1.ForbiddenException("You can only end calls you are part of");
        }
        const callerId = String(call.caller_id);
        const calleeId = String(call.callee_id);
        const wasConnected = call.status === enum_1.CallStatus.CONNECTED;
        call.status = enum_1.CallStatus.ENDED;
        call.end_reason = reason;
        call.ended_at = new Date();
        if (wasConnected && call.started_at) {
            call.duration_seconds = Math.floor((call.ended_at.getTime() - call.started_at.getTime()) / 1000);
        }
        await call.save();
        await this.createCallSystemMessage(call, callerId, calleeId);
        await this.redis.del(`call:${callId}`);
        this.logger.log(`Call ${callId} ended successfully`);
        return call;
    }
    async handleUserDisconnect(userId, callId) {
        if (callId) {
            try {
                await this.endCall(userId, callId, enum_1.CallEndReason.CONNECTION_ERROR);
            }
            catch (error) {
                this.logger.error(`Error ending call ${callId} for user ${userId}:`, error);
            }
        }
        else {
            const activeCalls = await this.dmCallModel.find({
                $or: [
                    { caller_id: new mongoose_2.Types.ObjectId(userId) },
                    { callee_id: new mongoose_2.Types.ObjectId(userId) },
                ],
                status: { $in: [enum_1.CallStatus.RINGING, enum_1.CallStatus.CONNECTED] },
            });
            for (const call of activeCalls) {
                try {
                    await this.endCall(userId, String(call._id), enum_1.CallEndReason.CONNECTION_ERROR);
                }
                catch (error) {
                    this.logger.error(`Error ending call ${call._id} for user ${userId}:`, error);
                }
            }
        }
        this.logger.log(`User ${userId} disconnected, cleanup completed`);
    }
    async getUserProfile(userId, sessionId, fingerprintHash) {
        try {
            const cacheKey = `user_profile:${userId}`;
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
            let profile = null;
            if (sessionId && fingerprintHash) {
                try {
                    this.logger.log(`Fetching profile for ${userId} from decode API using session ${sessionId}`);
                    const userProfile = await this.decodeApiClient.getUserProfile(sessionId, fingerprintHash, userId);
                    if (userProfile) {
                        profile = {
                            ...userProfile,
                            session_id: sessionId,
                            fingerprint_hash: fingerprintHash,
                        };
                        await this.redis.setex(cacheKey, 300, JSON.stringify(profile));
                        this.logger.log(`Successfully fetched and cached profile for ${userId} from decode API`);
                        return profile;
                    }
                }
                catch (error) {
                    this.logger.warn(`Failed to get profile from decode API for ${userId}:`, error);
                }
            }
            this.logger.log(`Fetching profile for ${userId} from database`);
            const user = (await this.userDehiveModel
                .findById(userId)
                .lean());
            if (!user) {
                throw new common_1.NotFoundException("User not found");
            }
            profile = {
                _id: String(user._id),
                username: user.username || "",
                display_name: user.display_name || "",
                avatar_ipfs_hash: user.avatar_ipfs_hash || "",
                bio: user.bio,
                status: user.status,
                banner_color: user.banner_color,
                server_count: user.server_count,
                last_login: user.last_login,
                primary_wallet: user.primary_wallet,
                following_number: user.following_number,
                followers_number: user.followers_number,
                is_following: user.is_following,
                is_follower: user.is_follower,
                is_blocked: user.is_blocked,
                is_blocked_by: user.is_blocked_by,
                mutual_followers_number: user.mutual_followers_number,
                mutual_followers_list: user.mutual_followers_list,
                is_active: user.is_active,
                last_account_deactivation: user.last_account_deactivation,
                dehive_role: user.dehive_role,
                role_subscription: user.role_subscription,
                session_id: sessionId || "",
                fingerprint_hash: fingerprintHash || "",
            };
            await this.redis.setex(cacheKey, 300, JSON.stringify(profile));
            return profile;
        }
        catch (error) {
            this.logger.error(`Error getting user profile for ${userId}:`, error);
            throw error;
        }
    }
    async checkAntiAbuse(callerId, targetUserId) {
        const existingCall = await this.dmCallModel.findOne({
            caller_id: new mongoose_2.Types.ObjectId(callerId),
            status: { $in: [enum_1.CallStatus.RINGING, enum_1.CallStatus.CONNECTED] },
        });
        if (existingCall) {
            throw new common_1.BadRequestException("You already have an active call in progress");
        }
        const existingCallToTarget = await this.dmCallModel.findOne({
            caller_id: new mongoose_2.Types.ObjectId(callerId),
            callee_id: new mongoose_2.Types.ObjectId(targetUserId),
            status: { $in: [enum_1.CallStatus.RINGING, enum_1.CallStatus.CONNECTED] },
        });
        if (existingCallToTarget) {
            throw new common_1.BadRequestException("You already have an active call with this user");
        }
        const recentCalls = await this.dmCallModel.countDocuments({
            caller_id: new mongoose_2.Types.ObjectId(callerId),
            created_at: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
        });
        if (recentCalls >= this.maxConcurrentCalls) {
            throw new common_1.BadRequestException("Too many calls in a short period. Please wait before making another call.");
        }
    }
    async getOrCreateConversation(userA, userB) {
        let conversation = await this.conversationModel.findOne({
            $or: [
                { userA: new mongoose_2.Types.ObjectId(userA), userB: new mongoose_2.Types.ObjectId(userB) },
                { userA: new mongoose_2.Types.ObjectId(userB), userB: new mongoose_2.Types.ObjectId(userA) },
            ],
        });
        if (!conversation) {
            conversation = new this.conversationModel({
                userA: new mongoose_2.Types.ObjectId(userA),
                userB: new mongoose_2.Types.ObjectId(userB),
            });
            await conversation.save();
        }
        return conversation;
    }
    async createCallSystemMessage(call, callerId, _calleeId) {
        try {
            const conversation = await this.conversationModel.findById(call.conversation_id);
            if (!conversation) {
                this.logger.warn(`Conversation ${call.conversation_id} not found for call ${call._id}`);
                return;
            }
            let messageContent = "";
            const duration = call.duration_seconds || 0;
            const durationText = duration > 0 ? this.formatCallDuration(duration) : "";
            if (call.status === enum_1.CallStatus.DECLINED) {
                messageContent = "Call declined";
            }
            else if (call.status === enum_1.CallStatus.ENDED) {
                if (call.end_reason === enum_1.CallEndReason.TIMEOUT) {
                    messageContent = "Missed call";
                }
                else if (call.end_reason === enum_1.CallEndReason.USER_HANGUP) {
                    if (duration > 0) {
                        messageContent = `Video call • ${durationText}`;
                    }
                    else {
                        messageContent = "Call cancelled";
                    }
                }
                else if (call.end_reason === enum_1.CallEndReason.CONNECTION_ERROR) {
                    messageContent = "Call disconnected";
                }
                else {
                    messageContent = duration > 0 ? `Call • ${durationText}` : "Call";
                }
            }
            if (!messageContent) {
                return;
            }
            const systemMessage = new this.directMessageModel({
                conversationId: conversation._id,
                senderId: new mongoose_2.Types.ObjectId(callerId),
                content: messageContent,
                attachments: [
                    {
                        type: "call",
                        call_id: String(call._id),
                        status: call.status,
                        duration: duration,
                        end_reason: call.end_reason,
                    },
                ],
            });
            await systemMessage.save();
            this.logger.log(`Created system message for call ${call._id} in conversation ${conversation._id}`);
        }
        catch (error) {
            this.logger.error(`Error creating system message for call ${call._id}:`, error);
        }
    }
    formatCallDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        else if (minutes > 0) {
            return `${minutes}:${secs.toString().padStart(2, "0")}`;
        }
        else {
            return `0:${secs.toString().padStart(2, "0")}`;
        }
    }
    async getCallHistory(userId, limit = 20, offset = 0) {
        return this.dmCallModel
            .find({
            $or: [
                { caller_id: new mongoose_2.Types.ObjectId(userId) },
                { callee_id: new mongoose_2.Types.ObjectId(userId) },
            ],
        })
            .sort({ created_at: -1 })
            .limit(limit)
            .skip(offset)
            .populate("caller_id", "username display_name avatar_ipfs_hash")
            .populate("callee_id", "username display_name avatar_ipfs_hash")
            .lean();
    }
    async getActiveCall(userId) {
        return this.dmCallModel
            .findOne({
            $or: [
                { caller_id: new mongoose_2.Types.ObjectId(userId) },
                { callee_id: new mongoose_2.Types.ObjectId(userId) },
            ],
            status: { $in: [enum_1.CallStatus.RINGING, enum_1.CallStatus.CONNECTED] },
        })
            .populate("caller_id", "username display_name avatar_ipfs_hash")
            .populate("callee_id", "username display_name avatar_ipfs_hash")
            .lean();
    }
    getAuthHeaders() {
        const user = this.request.user;
        return {
            sessionId: user?.session_id,
            fingerprintHash: user?.fingerprint_hash,
        };
    }
    async fetchUserDetails(userId) {
        try {
            const { sessionId, fingerprintHash } = this.getAuthHeaders();
            if (!sessionId || !fingerprintHash) {
                this.logger.error(`No auth headers available for ${userId}`);
                return null;
            }
            this.logger.log(`Fetching user details for ${userId} from decode API with auth`);
            const profile = await this.decodeApiClient.getUserProfile(sessionId, fingerprintHash, userId);
            if (!profile) {
                this.logger.error(`Failed to get user profile for ${userId} from decode API`);
                return null;
            }
            this.logger.log(`Successfully fetched user details for ${userId} from decode API`);
            return {
                dehive_id: profile._id,
                username: profile.username,
                display_name: profile.display_name,
                avatar_ipfs_hash: profile.avatar_ipfs_hash,
            };
        }
        catch (error) {
            this.logger.error(`Error fetching user details for ${userId}:`, error);
            return null;
        }
    }
    async getActiveCalls() {
        this.logger.log("Getting all active calls");
        try {
            const calls = await this.dmCallModel
                .find({
                status: { $in: ["ringing", "connected"] },
            })
                .select("_id status caller_id callee_id createdAt started_at")
                .lean();
            const results = await Promise.all(calls.map(async (call) => {
                const callerId = String(call.caller_id);
                const calleeId = String(call.callee_id);
                const [callerDetails, calleeDetails] = await Promise.all([
                    this.fetchUserDetails(callerId),
                    this.fetchUserDetails(calleeId),
                ]);
                if (!callerDetails || !calleeDetails) {
                    this.logger.warn(`Skipping call ${call._id} - missing user details for caller ${callerId} or callee ${calleeId}`);
                    return null;
                }
                return {
                    call_id: String(call._id),
                    status: call.status,
                    caller_id: callerDetails,
                    callee_id: calleeDetails,
                    created_at: call.createdAt ||
                        new Date(),
                    started_at: call.started_at,
                };
            }));
            const validResults = results.filter((result) => result !== null);
            return validResults;
        }
        catch (error) {
            this.logger.error("Error getting active calls:", error);
            throw error;
        }
    }
    async checkUserExists(userId) {
        try {
            const exists = await this.userDehiveModel.exists({
                _id: new mongoose_2.Types.ObjectId(userId),
            });
            return !!exists;
        }
        catch (error) {
            this.logger.error(`Error checking user exists for ${userId}:`, error);
            return false;
        }
    }
    async getUserProfileSimple(userId) {
        try {
            const cacheKey = `user_profile:${userId}`;
            const cachedData = await this.redis.get(cacheKey);
            if (cachedData) {
                const profile = JSON.parse(cachedData);
                this.logger.log(`[DIRECT-CALLING] Retrieved cached profile for ${userId} in WebSocket`);
                return {
                    _id: profile.user_dehive_id || profile.user_id || userId,
                    username: profile.username || `User_${userId}`,
                    display_name: profile.display_name || `User_${userId}`,
                    avatar_ipfs_hash: profile.avatar_ipfs_hash || "",
                };
            }
            const error = new Error(`User profile not cached for ${userId}. HTTP API must be called first to cache user profiles before WebSocket usage.`);
            this.logger.error(`[DIRECT-CALLING] CRITICAL ERROR: ${error.message}`);
            throw error;
        }
        catch (error) {
            this.logger.error(`[DIRECT-CALLING] Error getting user profile for ${userId}:`, error);
            throw error;
        }
    }
};
exports.DirectCallService = DirectCallService;
exports.DirectCallService = DirectCallService = DirectCallService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(dm_call_schema_1.DmCall.name)),
    __param(1, (0, mongoose_1.InjectModel)(direct_conversation_schema_1.DirectConversation.name)),
    __param(2, (0, mongoose_1.InjectModel)(direct_message_schema_1.DirectMessage.name)),
    __param(3, (0, mongoose_1.InjectModel)(user_dehive_schema_1.UserDehive.name)),
    __param(6, (0, ioredis_1.InjectRedis)()),
    __param(7, (0, common_1.Inject)(core_1.REQUEST)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        decode_api_client_1.DecodeApiClient,
        ioredis_2.Redis, Object])
], DirectCallService);


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

/***/ "@nestjs/platform-socket.io":
/*!*********************************************!*\
  !*** external "@nestjs/platform-socket.io" ***!
  \*********************************************/
/***/ ((module) => {

module.exports = require("@nestjs/platform-socket.io");

/***/ }),

/***/ "@nestjs/swagger":
/*!**********************************!*\
  !*** external "@nestjs/swagger" ***!
  \**********************************/
/***/ ((module) => {

module.exports = require("@nestjs/swagger");

/***/ }),

/***/ "@nestjs/websockets":
/*!*************************************!*\
  !*** external "@nestjs/websockets" ***!
  \*************************************/
/***/ ((module) => {

module.exports = require("@nestjs/websockets");

/***/ }),

/***/ "class-validator":
/*!**********************************!*\
  !*** external "class-validator" ***!
  \**********************************/
/***/ ((module) => {

module.exports = require("class-validator");

/***/ }),

/***/ "express":
/*!**************************!*\
  !*** external "express" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("express");

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

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "rxjs":
/*!***********************!*\
  !*** external "rxjs" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("rxjs");

/***/ }),

/***/ "socket.io":
/*!****************************!*\
  !*** external "socket.io" ***!
  \****************************/
/***/ ((module) => {

module.exports = require("socket.io");

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
/*!*****************************************!*\
  !*** ./apps/direct-calling/src/main.ts ***!
  \*****************************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
const core_1 = __webpack_require__(/*! @nestjs/core */ "@nestjs/core");
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const direct_call_module_1 = __webpack_require__(/*! ./direct-call.module */ "./apps/direct-calling/src/direct-call.module.ts");
const express = __webpack_require__(/*! express */ "express");
const path = __webpack_require__(/*! path */ "path");
const platform_socket_io_1 = __webpack_require__(/*! @nestjs/platform-socket.io */ "@nestjs/platform-socket.io");
const method_not_allowed_filter_1 = __webpack_require__(/*! ../common/filters/method-not-allowed.filter */ "./apps/direct-calling/common/filters/method-not-allowed.filter.ts");
async function bootstrap() {
    const app = await core_1.NestFactory.create(direct_call_module_1.DirectCallModule);
    const configService = app.get(config_1.ConfigService);
    app.enableCors({ origin: "*" });
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new method_not_allowed_filter_1.MethodNotAllowedFilter());
    app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    const config = new swagger_1.DocumentBuilder()
        .setTitle("Dehive - Direct Calling Service")
        .setDescription("REST API for 1:1 video/audio calls with WebRTC signaling")
        .setVersion("1.0")
        .addTag("Direct Calls")
        .addTag("TURN/ICE Configuration")
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup("api-dc-docs", app, document);
    const port = configService.get("DIRECT_CALLING_PORT") || 4005;
    const host = configService.get("CLOUD_HOST") || "localhost";
    await app.listen(port, host);
    console.log(`[Dehive] Direct-Calling service running at http://localhost:${port}`);
    console.log(`[Dehive] Swagger UI at http://localhost:${port}/api-dc-docs`);
    console.log(`[Dehive] WebSocket namespace: /rtc`);
}
void bootstrap();

})();

/******/ })()
;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./apps/direct-messaging/clients/decode-api.client.ts":
/*!************************************************************!*\
  !*** ./apps/direct-messaging/clients/decode-api.client.ts ***!
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
var DecodeApiClient_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DecodeApiClient = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const rxjs_1 = __webpack_require__(/*! rxjs */ "rxjs");
let DecodeApiClient = DecodeApiClient_1 = class DecodeApiClient {
    httpService;
    configService;
    logger = new common_1.Logger(DecodeApiClient_1.name);
    decodeApiUrl;
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        const host = this.configService.get('DECODE_API_GATEWAY_HOST');
        const port = this.configService.get('DECODE_API_GATEWAY_PORT');
        if (!host || !port) {
            throw new Error('DECODE_API_GATEWAY_HOST and DECODE_API_GATEWAY_PORT must be set in .env file!');
        }
        this.decodeApiUrl = `http://${host}:${port}`;
    }
    async getFollowing(accessToken, fingerprintHash, page = 0, limit = 10) {
        try {
            this.logger.log(`Calling Decode API: GET ${this.decodeApiUrl}/relationship/follow/followings/me`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.decodeApiUrl}/relationship/follow/followings/me`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'x-fingerprint-hashed': fingerprintHash,
                },
                params: {
                    page,
                    limit,
                },
            }));
            console.log(response);
            this.logger.log(`Decode API response: ${JSON.stringify(response.data, null, 2)}`);
            this.logger.log(`Successfully retrieved following list from Decode API.`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Error Response Status: ${error.response.status}`);
            this.logger.error(`Error Response Data: ${JSON.stringify(error.response.data)}`);
            return null;
        }
    }
};
exports.DecodeApiClient = DecodeApiClient;
exports.DecodeApiClient = DecodeApiClient = DecodeApiClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], DecodeApiClient);


/***/ }),

/***/ "./apps/direct-messaging/common/decorators/current-user.decorator.ts":
/*!***************************************************************************!*\
  !*** ./apps/direct-messaging/common/decorators/current-user.decorator.ts ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CurrentUser = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    console.log('🎯 [DIRECT-MESSAGING CURRENT USER] Decorator called with data:', data);
    try {
        const request = ctx
            .switchToHttp()
            .getRequest();
        console.log('🎯 [DIRECT-MESSAGING CURRENT USER] Request user:', request.user);
        console.log('🎯 [DIRECT-MESSAGING CURRENT USER] Request sessionId:', request.sessionId);
        if (data === 'sessionId') {
            return request.sessionId;
        }
        const user = request.user;
        if (data && user) {
            console.log(`🎯 [DIRECT-MESSAGING CURRENT USER] Returning user.${data}:`, user[data]);
            return user[data];
        }
        console.log('🎯 [DIRECT-MESSAGING CURRENT USER] Returning full user:', user);
        return user;
    }
    catch (error) {
        console.error('❌ [DIRECT-MESSAGING CURRENT USER] Error:', error);
        return undefined;
    }
});


/***/ }),

/***/ "./apps/direct-messaging/common/filters/method-not-allowed.filter.ts":
/*!***************************************************************************!*\
  !*** ./apps/direct-messaging/common/filters/method-not-allowed.filter.ts ***!
  \***************************************************************************/
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
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const message = exception.message;
            if (status === common_1.HttpStatus.METHOD_NOT_ALLOWED) {
                const allowedMethods = this.getAllowedMethods(request.url);
                response.status(405).json({
                    success: false,
                    statusCode: 405,
                    message: `Method ${request.method} not allowed for this endpoint. Allowed methods: ${allowedMethods.join(', ')}`,
                    error: 'Method Not Allowed',
                    path: request.url,
                    method: request.method,
                    allowedMethods,
                });
                return;
            }
            response.status(status).json({
                success: false,
                statusCode: status,
                message: message,
                error: exception.constructor.name,
                path: request.url,
                method: request.method,
            });
            return;
        }
        response.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Internal server error',
            error: 'Internal Server Error',
            path: request.url,
            method: request.method,
        });
    }
    getAllowedMethods(url) {
        const endpointMethods = {
            '/api/dm/send': ['POST'],
            '/api/dm/conversation': ['POST'],
            '/api/dm/messages': ['GET'],
            '/api/dm/files/upload': ['POST'],
            '/api/dm/files/list': ['GET'],
            '/api/dm/following': ['GET'],
        };
        for (const [endpoint, methods] of Object.entries(endpointMethods)) {
            if (url.startsWith(endpoint)) {
                return methods;
            }
        }
        return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    }
};
exports.MethodNotAllowedFilter = MethodNotAllowedFilter;
exports.MethodNotAllowedFilter = MethodNotAllowedFilter = __decorate([
    (0, common_1.Catch)()
], MethodNotAllowedFilter);


/***/ }),

/***/ "./apps/direct-messaging/common/guards/auth.guard.ts":
/*!***********************************************************!*\
  !*** ./apps/direct-messaging/common/guards/auth.guard.ts ***!
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
exports.PUBLIC_KEY = 'public';
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
        const host = this.configService.get('DECODE_API_GATEWAY_HOST');
        const port = this.configService.get('DECODE_API_GATEWAY_PORT');
        if (!host || !port) {
            throw new Error('DECODE_API_GATEWAY_HOST and DECODE_API_GATEWAY_PORT must be set in .env file!');
        }
        this.authServiceUrl = `http://${host}:${port}`;
    }
    async canActivate(context) {
        const isPublic = this.reflector.get(exports.PUBLIC_KEY, context.getHandler());
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const sessionId = request.headers['x-session-id'];
        const fingerprintHash = request.headers['x-fingerprint-hashed'];
        if (!sessionId) {
            throw new common_1.UnauthorizedException('Session ID is required');
        }
        if (!fingerprintHash) {
            throw new common_1.UnauthorizedException('Fingerprint hash is required in headers (x-fingerprint-hashed)');
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
                    request['user'] = authenticatedUser;
                    return true;
                }
            }
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authServiceUrl}/auth/sso/validate`, {
                headers: { 'x-session-id': sessionId },
            }));
            const sessionData = response.data.data;
            if (!sessionData || !sessionData.access_token) {
                throw new common_1.UnauthorizedException('Invalid session data from auth service');
            }
            const profileResponse = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authServiceUrl}/users/profile/me`, {
                headers: { 'Authorization': `Bearer ${sessionData.access_token}` },
            }));
            const userProfile = profileResponse.data.data;
            if (!userProfile) {
                throw new common_1.UnauthorizedException('Could not retrieve user profile');
            }
            const cacheData = {
                session_token: sessionData.session_token,
                access_token: sessionData.access_token,
                user: userProfile,
                expires_at: sessionData.expires_at,
            };
            const ttl = Math.ceil((new Date(sessionData.expires_at).getTime() - Date.now()) / 1000);
            if (ttl > 0) {
                await this.redis.set(sessionKey, JSON.stringify(cacheData), 'EX', ttl);
            }
            const authenticatedUser = { ...userProfile, session_id: sessionId, fingerprint_hash: fingerprintHash };
            request['user'] = authenticatedUser;
            return true;
        }
        catch (error) {
            this.logger.error(`Authentication failed for session ${sessionId}:`, error.stack);
            throw new common_1.UnauthorizedException('Authentication failed or invalid session');
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

/***/ "./apps/direct-messaging/dto/create-or-get-conversation.dto.ts.ts":
/*!************************************************************************!*\
  !*** ./apps/direct-messaging/dto/create-or-get-conversation.dto.ts.ts ***!
  \************************************************************************/
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
exports.CreateOrGetConversationDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
class CreateOrGetConversationDto {
    otherUserDehiveId;
    static _OPENAPI_METADATA_FACTORY() {
        return { otherUserDehiveId: { required: true, type: () => String } };
    }
}
exports.CreateOrGetConversationDto = CreateOrGetConversationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'UserDehiveId of the other participant' }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateOrGetConversationDto.prototype, "otherUserDehiveId", void 0);


/***/ }),

/***/ "./apps/direct-messaging/dto/direct-upload.dto.ts":
/*!********************************************************!*\
  !*** ./apps/direct-messaging/dto/direct-upload.dto.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DirectUploadResponseDto = exports.DirectUploadInitDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/direct-messaging/enum/enum.ts");
class DirectUploadInitDto {
    conversationId;
    static _OPENAPI_METADATA_FACTORY() {
        return { conversationId: { required: true, type: () => String } };
    }
}
exports.DirectUploadInitDto = DirectUploadInitDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the direct conversation the file belongs to',
        example: '68da1234abcd5678efgh9012',
    }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], DirectUploadInitDto.prototype, "conversationId", void 0);
class DirectUploadResponseDto {
    uploadId;
    type;
    url;
    name;
    size;
    mimeType;
    width;
    height;
    durationMs;
    thumbnailUrl;
    static _OPENAPI_METADATA_FACTORY() {
        return { uploadId: { required: true, type: () => String }, type: { required: true, enum: (__webpack_require__(/*! ../enum/enum */ "./apps/direct-messaging/enum/enum.ts").AttachmentType) }, url: { required: true, type: () => String, format: "uri" }, name: { required: true, type: () => String }, size: { required: true, type: () => Number, minimum: 0 }, mimeType: { required: true, type: () => String }, width: { required: false, type: () => Number, minimum: 1 }, height: { required: false, type: () => Number, minimum: 1 }, durationMs: { required: false, type: () => Number, minimum: 1 }, thumbnailUrl: { required: false, type: () => String, format: "uri" } };
    }
}
exports.DirectUploadResponseDto = DirectUploadResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The unique ID of the upload record (MongoId)',
        example: '68db1234abcd5678efgh9013',
    }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], DirectUploadResponseDto.prototype, "uploadId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The type of the attachment, detected by the server.',
        enum: enum_1.AttachmentType,
        example: enum_1.AttachmentType.IMAGE,
    }),
    (0, class_validator_1.IsEnum)(enum_1.AttachmentType),
    __metadata("design:type", String)
], DirectUploadResponseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The public URL to access the uploaded file.',
        example: 'http://localhost:4004/uploads/uuid-filename.jpg',
    }),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], DirectUploadResponseDto.prototype, "url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The original name of the file.',
        example: 'my-vacation-photo.jpg',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DirectUploadResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The size of the file in bytes.',
        example: 1048576,
    }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], DirectUploadResponseDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The MIME type of the file.',
        example: 'image/jpeg',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DirectUploadResponseDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'The width of the image or video in pixels.',
        example: 1920,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], DirectUploadResponseDto.prototype, "width", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'The height of the image or video in pixels.',
        example: 1080,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], DirectUploadResponseDto.prototype, "height", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'The duration of the video or audio in milliseconds.',
        example: 15000,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], DirectUploadResponseDto.prototype, "durationMs", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'The public URL to a thumbnail generated for a video.',
        example: 'http://localhost:4004/uploads/uuid-filename_thumb.jpg',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], DirectUploadResponseDto.prototype, "thumbnailUrl", void 0);


/***/ }),

/***/ "./apps/direct-messaging/dto/get-following.dto.ts":
/*!********************************************************!*\
  !*** ./apps/direct-messaging/dto/get-following.dto.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GetFollowingDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const class_transformer_1 = __webpack_require__(/*! class-transformer */ "class-transformer");
class GetFollowingDto {
    page = 0;
    limit = 10;
    static _OPENAPI_METADATA_FACTORY() {
        return { page: { required: false, type: () => Number, default: 0, minimum: 0 }, limit: { required: false, type: () => Number, default: 10, minimum: 1, maximum: 100 } };
    }
}
exports.GetFollowingDto = GetFollowingDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Page number for pagination',
        example: 0,
        default: 0,
        minimum: 0,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], GetFollowingDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of items per page',
        example: 10,
        default: 10,
        minimum: 1,
        maximum: 100,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], GetFollowingDto.prototype, "limit", void 0);


/***/ }),

/***/ "./apps/direct-messaging/dto/list-direct-messages.dto.ts":
/*!***************************************************************!*\
  !*** ./apps/direct-messaging/dto/list-direct-messages.dto.ts ***!
  \***************************************************************/
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
exports.ListDirectMessagesDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const class_transformer_1 = __webpack_require__(/*! class-transformer */ "class-transformer");
class ListDirectMessagesDto {
    page = 1;
    limit = 50;
    static _OPENAPI_METADATA_FACTORY() {
        return { page: { required: true, type: () => Object, default: 1, minimum: 1 }, limit: { required: true, type: () => Object, default: 50, minimum: 1, maximum: 100 } };
    }
}
exports.ListDirectMessagesDto = ListDirectMessagesDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'The page number to retrieve, starting from 1',
        default: 1,
        type: Number,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], ListDirectMessagesDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'The number of messages to retrieve per page (max 100)',
        default: 50,
        type: Number,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], ListDirectMessagesDto.prototype, "limit", void 0);


/***/ }),

/***/ "./apps/direct-messaging/dto/list-direct-upload.dto.ts":
/*!*************************************************************!*\
  !*** ./apps/direct-messaging/dto/list-direct-upload.dto.ts ***!
  \*************************************************************/
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
exports.ListDirectUploadsDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const class_transformer_1 = __webpack_require__(/*! class-transformer */ "class-transformer");
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/direct-messaging/enum/enum.ts");
class ListDirectUploadsDto {
    type;
    page = 1;
    limit = 50;
    static _OPENAPI_METADATA_FACTORY() {
        return { type: { required: false, enum: (__webpack_require__(/*! ../enum/enum */ "./apps/direct-messaging/enum/enum.ts").AttachmentType) }, page: { required: true, type: () => Object, default: 1, minimum: 1 }, limit: { required: true, type: () => Object, default: 50, minimum: 1, maximum: 100 } };
    }
}
exports.ListDirectUploadsDto = ListDirectUploadsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter uploads by a specific type.',
        enum: enum_1.AttachmentType,
        example: 'image',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(enum_1.AttachmentType),
    __metadata("design:type", String)
], ListDirectUploadsDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'The page number to retrieve, starting from 1',
        default: 1,
        type: Number,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], ListDirectUploadsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'The number of uploads to retrieve per page (max 100)',
        default: 50,
        type: Number,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], ListDirectUploadsDto.prototype, "limit", void 0);


/***/ }),

/***/ "./apps/direct-messaging/dto/send-direct-message.dto.ts":
/*!**************************************************************!*\
  !*** ./apps/direct-messaging/dto/send-direct-message.dto.ts ***!
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
exports.SendDirectMessageDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
class SendDirectMessageDto {
    conversationId;
    content;
    uploadIds;
    static _OPENAPI_METADATA_FACTORY() {
        return { conversationId: { required: true, type: () => String }, content: { required: true, type: () => String, minLength: 0, maxLength: 2000 }, uploadIds: { required: true, type: () => [String] } };
    }
}
exports.SendDirectMessageDto = SendDirectMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the direct conversation',
        example: '68da1234abcd5678efgh9012',
    }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], SendDirectMessageDto.prototype, "conversationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The text content of the message (empty string if only sending files)',
        maxLength: 2000,
        example: 'Hello there!',
        default: '',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 2000),
    __metadata("design:type", String)
], SendDirectMessageDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [String],
        description: 'List of upload IDs to attach to the message (empty array if no files)',
        example: ['68db1234abcd5678efgh9013'],
        default: [],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsMongoId)({ each: true, message: 'Each uploadId must be a valid MongoId' }),
    __metadata("design:type", Array)
], SendDirectMessageDto.prototype, "uploadIds", void 0);


/***/ }),

/***/ "./apps/direct-messaging/enum/enum.ts":
/*!********************************************!*\
  !*** ./apps/direct-messaging/enum/enum.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AttachmentType = void 0;
var AttachmentType;
(function (AttachmentType) {
    AttachmentType["IMAGE"] = "image";
    AttachmentType["VIDEO"] = "video";
    AttachmentType["AUDIO"] = "audio";
    AttachmentType["FILE"] = "file";
})(AttachmentType || (exports.AttachmentType = AttachmentType = {}));


/***/ }),

/***/ "./apps/direct-messaging/gateway/direct-message.gateway.ts":
/*!*****************************************************************!*\
  !*** ./apps/direct-messaging/gateway/direct-message.gateway.ts ***!
  \*****************************************************************/
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
exports.DmGateway = void 0;
const websockets_1 = __webpack_require__(/*! @nestjs/websockets */ "@nestjs/websockets");
const socket_io_1 = __webpack_require__(/*! socket.io */ "socket.io");
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
const mongoose_2 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const direct_messaging_service_1 = __webpack_require__(/*! ../src/direct-messaging.service */ "./apps/direct-messaging/src/direct-messaging.service.ts");
const send_direct_message_dto_1 = __webpack_require__(/*! ../dto/send-direct-message.dto */ "./apps/direct-messaging/dto/send-direct-message.dto.ts");
const user_dehive_schema_1 = __webpack_require__(/*! ../../user-dehive-server/schemas/user-dehive.schema */ "./apps/user-dehive-server/schemas/user-dehive.schema.ts");
const direct_conversation_schema_1 = __webpack_require__(/*! ../schemas/direct-conversation.schema */ "./apps/direct-messaging/schemas/direct-conversation.schema.ts");
let DmGateway = class DmGateway {
    service;
    userDehiveModel;
    conversationModel;
    server;
    meta = new WeakMap();
    constructor(service, userDehiveModel, conversationModel) {
        this.service = service;
        this.userDehiveModel = userDehiveModel;
        this.conversationModel = conversationModel;
    }
    send(client, event, data) {
        client.emit(event, data);
    }
    handleConnection(client) {
        console.log('[DM-WS] Client connected. Awaiting identity.');
        this.meta.set(client, {});
    }
    handleDisconnect(client) {
        const meta = this.meta.get(client);
        if (meta?.userDehiveId) {
            console.log(`[DM-WS] User ${meta.userDehiveId} disconnected.`);
        }
        this.meta.delete(client);
    }
    async handleIdentity(userDehiveId, client) {
        if (!userDehiveId || !mongoose_1.Types.ObjectId.isValid(userDehiveId)) {
            return this.send(client, 'error', { message: 'Invalid userDehiveId' });
        }
        const exists = await this.userDehiveModel.exists({
            _id: new mongoose_1.Types.ObjectId(userDehiveId),
        });
        if (!exists) {
            return this.send(client, 'error', { message: 'User not found' });
        }
        const meta = this.meta.get(client);
        if (meta) {
            meta.userDehiveId = userDehiveId;
            void client.join(`user:${userDehiveId}`);
            console.log(`[DM-WS] User identified as ${userDehiveId}`);
            this.send(client, 'identityConfirmed', { userDehiveId });
        }
    }
    async handleSendMessage(data, client) {
        const meta = this.meta.get(client);
        const selfId = meta?.userDehiveId;
        if (!selfId) {
            return this.send(client, 'error', { message: 'Please identify first' });
        }
        try {
            if (typeof data.content !== 'string') {
                return this.send(client, 'error', {
                    message: 'Content must be a string (0-2000 chars).',
                });
            }
            if (String(data.content ?? '').length > 2000) {
                return this.send(client, 'error', {
                    message: 'Content must not exceed 2000 characters.',
                });
            }
            if (!Array.isArray(data.uploadIds)) {
                return this.send(client, 'error', {
                    message: 'uploadIds is required and must be an array',
                });
            }
            if (data.uploadIds.length > 0) {
                const allValid = data.uploadIds.every((id) => {
                    return typeof id === 'string' && mongoose_1.Types.ObjectId.isValid(id);
                });
                if (!allValid) {
                    return this.send(client, 'error', {
                        message: 'One or more uploadIds are invalid',
                    });
                }
            }
            const savedMessage = await this.service.sendMessage(selfId, data);
            const conv = await this.conversationModel
                .findById(data.conversationId)
                .lean();
            if (!conv) {
                return this.send(client, 'error', {
                    message: 'Conversation not found',
                });
            }
            const recipientId = String(conv.userA) === selfId ? String(conv.userB) : String(conv.userA);
            const messageToBroadcast = {
                _id: savedMessage._id,
                conversationId: savedMessage.conversationId,
                senderId: savedMessage.senderId,
                content: savedMessage.content,
                attachments: savedMessage.attachments,
                createdAt: savedMessage.get('createdAt'),
            };
            this.server
                .to(`user:${recipientId}`)
                .to(`user:${selfId}`)
                .emit('newMessage', messageToBroadcast);
        }
        catch (error) {
            console.error('[DM-WS] Error handling message:', error);
            this.send(client, 'error', {
                message: 'Failed to send message',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async handleEditMessage(data, client) {
        const meta = this.meta.get(client);
        const selfId = meta?.userDehiveId;
        if (!selfId)
            return this.send(client, 'error', { message: 'Please identify first' });
        try {
            const updated = await this.service.editMessage(selfId, data?.messageId, data?.content ?? '');
            const conv = await this.conversationModel
                .findById(updated.conversationId)
                .lean();
            if (!conv)
                return;
            const recipientId = String(conv.userA) === selfId ? String(conv.userB) : String(conv.userA);
            const payload = {
                _id: updated._id,
                messageId: updated._id,
                conversationId: updated.conversationId,
                content: updated.content,
                isEdited: true,
                editedAt: updated.editedAt,
            };
            this.server
                .to(`user:${recipientId}`)
                .to(`user:${selfId}`)
                .emit('messageEdited', payload);
        }
        catch (error) {
            this.send(client, 'error', {
                message: 'Failed to edit message',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async handleDeleteMessage(data, client) {
        const meta = this.meta.get(client);
        const selfId = meta?.userDehiveId;
        if (!selfId)
            return this.send(client, 'error', { message: 'Please identify first' });
        try {
            const updated = await this.service.deleteMessage(selfId, data?.messageId);
            const conv = await this.conversationModel
                .findById(updated.conversationId)
                .lean();
            if (!conv)
                return;
            const recipientId = String(conv.userA) === selfId ? String(conv.userB) : String(conv.userA);
            const payload = {
                _id: updated._id,
                messageId: updated._id,
                conversationId: updated.conversationId,
                isDeleted: true,
            };
            this.server
                .to(`user:${recipientId}`)
                .to(`user:${selfId}`)
                .emit('messageDeleted', payload);
        }
        catch (error) {
            this.send(client, 'error', {
                message: 'Failed to delete message',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
};
exports.DmGateway = DmGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], DmGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('identity'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], DmGateway.prototype, "handleIdentity", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_direct_message_dto_1.SendDirectMessageDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], DmGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('editMessage'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], DmGateway.prototype, "handleEditMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('deleteMessage'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], DmGateway.prototype, "handleDeleteMessage", null);
exports.DmGateway = DmGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
    }),
    __param(1, (0, mongoose_2.InjectModel)(user_dehive_schema_1.UserDehive.name)),
    __param(2, (0, mongoose_2.InjectModel)(direct_conversation_schema_1.DirectConversation.name)),
    __metadata("design:paramtypes", [direct_messaging_service_1.DirectMessagingService,
        mongoose_1.Model,
        mongoose_1.Model])
], DmGateway);


/***/ }),

/***/ "./apps/direct-messaging/schemas/direct-conversation.schema.ts":
/*!*********************************************************************!*\
  !*** ./apps/direct-messaging/schemas/direct-conversation.schema.ts ***!
  \*********************************************************************/
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
        ref: 'UserDehive',
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DirectConversation.prototype, "userA", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'UserDehive',
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
    (0, mongoose_1.Schema)({ collection: 'direct_conversation', timestamps: true })
], DirectConversation);
exports.DirectConversationSchema = mongoose_1.SchemaFactory.createForClass(DirectConversation);
exports.DirectConversationSchema.pre('save', function (next) {
    if (this.userA.toString() > this.userB.toString()) {
        const temp = this.userA;
        this.userA = this.userB;
        this.userB = temp;
    }
    next();
});
exports.DirectConversationSchema.index({ userA: 1, userB: 1 }, { unique: true });


/***/ }),

/***/ "./apps/direct-messaging/schemas/direct-message.schema.ts":
/*!****************************************************************!*\
  !*** ./apps/direct-messaging/schemas/direct-message.schema.ts ***!
  \****************************************************************/
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
};
exports.DirectMessage = DirectMessage;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'DirectConversation',
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DirectMessage.prototype, "conversationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'UserDehive',
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
exports.DirectMessage = DirectMessage = __decorate([
    (0, mongoose_1.Schema)({ collection: 'direct_message', timestamps: true })
], DirectMessage);
exports.DirectMessageSchema = mongoose_1.SchemaFactory.createForClass(DirectMessage);


/***/ }),

/***/ "./apps/direct-messaging/schemas/direct-upload.schema.ts":
/*!***************************************************************!*\
  !*** ./apps/direct-messaging/schemas/direct-upload.schema.ts ***!
  \***************************************************************/
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
exports.DirectUploadSchema = exports.DirectUpload = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let DirectUpload = class DirectUpload {
    ownerId;
    conversationId;
    type;
    url;
    name;
    size;
    mimeType;
    width;
    height;
    durationMs;
    thumbnailUrl;
};
exports.DirectUpload = DirectUpload;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'UserDehive',
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DirectUpload.prototype, "ownerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'DirectConversation',
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DirectUpload.prototype, "conversationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DirectUpload.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DirectUpload.prototype, "url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DirectUpload.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], DirectUpload.prototype, "size", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DirectUpload.prototype, "mimeType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], DirectUpload.prototype, "width", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], DirectUpload.prototype, "height", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], DirectUpload.prototype, "durationMs", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], DirectUpload.prototype, "thumbnailUrl", void 0);
exports.DirectUpload = DirectUpload = __decorate([
    (0, mongoose_1.Schema)({ collection: 'direct_upload', timestamps: true })
], DirectUpload);
exports.DirectUploadSchema = mongoose_1.SchemaFactory.createForClass(DirectUpload);


/***/ }),

/***/ "./apps/direct-messaging/src/direct-messaging.controller.ts":
/*!******************************************************************!*\
  !*** ./apps/direct-messaging/src/direct-messaging.controller.ts ***!
  \******************************************************************/
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
exports.DirectMessagingController = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const platform_express_1 = __webpack_require__(/*! @nestjs/platform-express */ "@nestjs/platform-express");
const direct_messaging_service_1 = __webpack_require__(/*! ./direct-messaging.service */ "./apps/direct-messaging/src/direct-messaging.service.ts");
const create_or_get_conversation_dto_ts_1 = __webpack_require__(/*! ../dto/create-or-get-conversation.dto.ts */ "./apps/direct-messaging/dto/create-or-get-conversation.dto.ts.ts");
const direct_upload_dto_1 = __webpack_require__(/*! ../dto/direct-upload.dto */ "./apps/direct-messaging/dto/direct-upload.dto.ts");
const list_direct_messages_dto_1 = __webpack_require__(/*! ../dto/list-direct-messages.dto */ "./apps/direct-messaging/dto/list-direct-messages.dto.ts");
const list_direct_upload_dto_1 = __webpack_require__(/*! ../dto/list-direct-upload.dto */ "./apps/direct-messaging/dto/list-direct-upload.dto.ts");
const send_direct_message_dto_1 = __webpack_require__(/*! ../dto/send-direct-message.dto */ "./apps/direct-messaging/dto/send-direct-message.dto.ts");
const get_following_dto_1 = __webpack_require__(/*! ../dto/get-following.dto */ "./apps/direct-messaging/dto/get-following.dto.ts");
const auth_guard_1 = __webpack_require__(/*! ../common/guards/auth.guard */ "./apps/direct-messaging/common/guards/auth.guard.ts");
const current_user_decorator_1 = __webpack_require__(/*! ../common/decorators/current-user.decorator */ "./apps/direct-messaging/common/decorators/current-user.decorator.ts");
let DirectMessagingController = class DirectMessagingController {
    service;
    constructor(service) {
        this.service = service;
    }
    async sendMessage(selfId, body, req) {
        if (req.method !== 'POST') {
            throw new common_1.HttpException(`Method ${req.method} not allowed for this endpoint. Only POST is allowed.`, common_1.HttpStatus.METHOD_NOT_ALLOWED);
        }
        const newMessage = await this.service.sendMessage(selfId, body);
        return {
            success: true,
            statusCode: 201,
            message: 'Message sent successfully',
            data: newMessage,
        };
    }
    async createOrGet(selfId, body, req) {
        if (req.method !== 'POST') {
            throw new common_1.HttpException(`Method ${req.method} not allowed for this endpoint. Only POST is allowed.`, common_1.HttpStatus.METHOD_NOT_ALLOWED);
        }
        const conv = await this.service.createOrGetConversation(selfId, body);
        return { success: true, statusCode: 200, message: 'OK', data: conv };
    }
    async list(selfId, conversationId, query, req) {
        if (req.method !== 'GET') {
            throw new common_1.HttpException(`Method ${req.method} not allowed for this endpoint. Only GET is allowed.`, common_1.HttpStatus.METHOD_NOT_ALLOWED);
        }
        const data = await this.service.listMessages(selfId, conversationId, query);
        return { success: true, statusCode: 200, message: 'OK', data };
    }
    async uploadFile(file, body, selfId, req) {
        if (req.method !== 'POST') {
            throw new common_1.HttpException(`Method ${req.method} not allowed for this endpoint. Only POST is allowed.`, common_1.HttpStatus.METHOD_NOT_ALLOWED);
        }
        const result = await this.service.handleUpload(selfId, file, body);
        return {
            success: true,
            statusCode: 201,
            message: 'File uploaded successfully',
            data: result,
        };
    }
    async listUploads(selfId, query, req) {
        if (req.method !== 'GET') {
            throw new common_1.HttpException(`Method ${req.method} not allowed for this endpoint. Only GET is allowed.`, common_1.HttpStatus.METHOD_NOT_ALLOWED);
        }
        const data = await this.service.listUploads(selfId, query);
        return { success: true, statusCode: 200, message: 'OK', data };
    }
    async getFollowing(currentUser, query, req) {
        if (req.method !== 'GET') {
            throw new common_1.HttpException(`Method ${req.method} not allowed for this endpoint. Only GET is allowed.`, common_1.HttpStatus.METHOD_NOT_ALLOWED);
        }
        const result = await this.service.getFollowing(currentUser, query);
        return result;
    }
};
exports.DirectMessagingController = DirectMessagingController;
__decorate([
    (0, common_1.Post)('send'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message to a direct conversation' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'The session ID of the authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-fingerprint-hashed',
        description: 'The hashed fingerprint of the client device',
        required: true,
    }),
    (0, swagger_1.ApiBody)({ type: send_direct_message_dto_1.SendDirectMessageDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Message sent successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or missing fields.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'User is not a participant of this conversation.',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Conversation not found.' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('_id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, send_direct_message_dto_1.SendDirectMessageDto, Object]),
    __metadata("design:returntype", Promise)
], DirectMessagingController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('conversation'),
    (0, swagger_1.ApiOperation)({ summary: 'Create or get a 1:1 conversation' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-fingerprint-hashed',
        description: 'The hashed fingerprint of the client device',
        required: true,
    }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('_id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_or_get_conversation_dto_ts_1.CreateOrGetConversationDto, Object]),
    __metadata("design:returntype", Promise)
], DirectMessagingController.prototype, "createOrGet", null);
__decorate([
    (0, common_1.Get)('messages/:conversationId'),
    (0, swagger_1.ApiOperation)({ summary: 'List messages in a conversation' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-fingerprint-hashed',
        description: 'The hashed fingerprint of the client device',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'conversationId' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('_id')),
    __param(1, (0, common_1.Param)('conversationId')),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, list_direct_messages_dto_1.ListDirectMessagesDto, Object]),
    __metadata("design:returntype", Promise)
], DirectMessagingController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('files/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a file to a direct conversation' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-fingerprint-hashed',
        description: 'The hashed fingerprint of the client device',
        required: true,
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'The file to upload.',
                },
                conversationId: {
                    type: 'string',
                    description: 'The ID of the direct conversation the file belongs to.',
                },
            },
            required: ['file', 'conversationId'],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'File uploaded successfully and metadata returned.',
        type: direct_upload_dto_1.DirectUploadResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Bad request, missing file, invalid ID, or file size exceeds limit.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'User is not a participant of the conversation.',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Conversation not found.' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('_id')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, direct_upload_dto_1.DirectUploadInitDto, String, Object]),
    __metadata("design:returntype", Promise)
], DirectMessagingController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Get)('files/list'),
    (0, swagger_1.ApiOperation)({ summary: 'List files uploaded by the current user in DMs' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-fingerprint-hashed',
        description: 'The hashed fingerprint of the client device',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Successfully returned a list of uploaded files.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid user ID or pagination parameters.',
    }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('_id')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, list_direct_upload_dto_1.ListDirectUploadsDto, Object]),
    __metadata("design:returntype", Promise)
], DirectMessagingController.prototype, "listUploads", null);
__decorate([
    (0, common_1.Get)('following'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get following list',
        description: 'Retrieves the list of users that the current user is following from Decode service'
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-fingerprint-hashed',
        description: 'The hashed fingerprint of the client device',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Successfully returned following list.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Could not retrieve following list from Decode service.',
    }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, get_following_dto_1.GetFollowingDto, Object]),
    __metadata("design:returntype", Promise)
], DirectMessagingController.prototype, "getFollowing", null);
exports.DirectMessagingController = DirectMessagingController = __decorate([
    (0, swagger_1.ApiTags)('Direct Messages'),
    (0, common_1.Controller)('dm'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [direct_messaging_service_1.DirectMessagingService])
], DirectMessagingController);


/***/ }),

/***/ "./apps/direct-messaging/src/direct-messaging.module.ts":
/*!**************************************************************!*\
  !*** ./apps/direct-messaging/src/direct-messaging.module.ts ***!
  \**************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DirectMessagingModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const ioredis_1 = __webpack_require__(/*! @nestjs-modules/ioredis */ "@nestjs-modules/ioredis");
const direct_messaging_controller_1 = __webpack_require__(/*! ./direct-messaging.controller */ "./apps/direct-messaging/src/direct-messaging.controller.ts");
const direct_messaging_service_1 = __webpack_require__(/*! ./direct-messaging.service */ "./apps/direct-messaging/src/direct-messaging.service.ts");
const decode_api_client_1 = __webpack_require__(/*! ../clients/decode-api.client */ "./apps/direct-messaging/clients/decode-api.client.ts");
const direct_conversation_schema_1 = __webpack_require__(/*! ../schemas/direct-conversation.schema */ "./apps/direct-messaging/schemas/direct-conversation.schema.ts");
const direct_message_schema_1 = __webpack_require__(/*! ../schemas/direct-message.schema */ "./apps/direct-messaging/schemas/direct-message.schema.ts");
const direct_upload_schema_1 = __webpack_require__(/*! ../schemas/direct-upload.schema */ "./apps/direct-messaging/schemas/direct-upload.schema.ts");
const direct_message_gateway_1 = __webpack_require__(/*! ../gateway/direct-message.gateway */ "./apps/direct-messaging/gateway/direct-message.gateway.ts");
const user_dehive_schema_1 = __webpack_require__(/*! ../../user-dehive-server/schemas/user-dehive.schema */ "./apps/user-dehive-server/schemas/user-dehive.schema.ts");
const auth_guard_1 = __webpack_require__(/*! ../common/guards/auth.guard */ "./apps/direct-messaging/common/guards/auth.guard.ts");
let DirectMessagingModule = class DirectMessagingModule {
};
exports.DirectMessagingModule = DirectMessagingModule;
exports.DirectMessagingModule = DirectMessagingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            axios_1.HttpModule.register({
                timeout: 5000,
                maxRedirects: 5,
            }),
            ioredis_1.RedisModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'single',
                    url: config.get('REDIS_URI'),
                }),
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    uri: config.get('MONGODB_URI'),
                    dbName: 'dehive_db',
                }),
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: direct_conversation_schema_1.DirectConversation.name, schema: direct_conversation_schema_1.DirectConversationSchema },
                { name: direct_message_schema_1.DirectMessage.name, schema: direct_message_schema_1.DirectMessageSchema },
                { name: direct_upload_schema_1.DirectUpload.name, schema: direct_upload_schema_1.DirectUploadSchema },
                { name: user_dehive_schema_1.UserDehive.name, schema: user_dehive_schema_1.UserDehiveSchema },
            ]),
        ],
        controllers: [direct_messaging_controller_1.DirectMessagingController],
        providers: [direct_messaging_service_1.DirectMessagingService, direct_message_gateway_1.DmGateway, auth_guard_1.AuthGuard, decode_api_client_1.DecodeApiClient],
    })
], DirectMessagingModule);


/***/ }),

/***/ "./apps/direct-messaging/src/direct-messaging.service.ts":
/*!***************************************************************!*\
  !*** ./apps/direct-messaging/src/direct-messaging.service.ts ***!
  \***************************************************************/
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
var DirectMessagingService_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DirectMessagingService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
const direct_conversation_schema_1 = __webpack_require__(/*! ../schemas/direct-conversation.schema */ "./apps/direct-messaging/schemas/direct-conversation.schema.ts");
const direct_message_schema_1 = __webpack_require__(/*! ../schemas/direct-message.schema */ "./apps/direct-messaging/schemas/direct-message.schema.ts");
const direct_upload_schema_1 = __webpack_require__(/*! ../schemas/direct-upload.schema */ "./apps/direct-messaging/schemas/direct-upload.schema.ts");
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/direct-messaging/enum/enum.ts");
const fs = __webpack_require__(/*! fs */ "fs");
const path = __webpack_require__(/*! path */ "path");
const crypto_1 = __webpack_require__(/*! crypto */ "crypto");
const sharp_1 = __webpack_require__(/*! sharp */ "sharp");
const childProcess = __webpack_require__(/*! child_process */ "child_process");
const ffmpeg_static_1 = __webpack_require__(/*! ffmpeg-static */ "ffmpeg-static");
const ffprobe_static_1 = __webpack_require__(/*! ffprobe-static */ "ffprobe-static");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const decode_api_client_1 = __webpack_require__(/*! ../clients/decode-api.client */ "./apps/direct-messaging/clients/decode-api.client.ts");
const ioredis_1 = __webpack_require__(/*! @nestjs-modules/ioredis */ "@nestjs-modules/ioredis");
const ioredis_2 = __webpack_require__(/*! ioredis */ "ioredis");
let DirectMessagingService = DirectMessagingService_1 = class DirectMessagingService {
    conversationModel;
    messageModel;
    directuploadModel;
    configService;
    decodeApiClient;
    redis;
    logger = new common_1.Logger(DirectMessagingService_1.name);
    constructor(conversationModel, messageModel, directuploadModel, configService, decodeApiClient, redis) {
        this.conversationModel = conversationModel;
        this.messageModel = messageModel;
        this.directuploadModel = directuploadModel;
        this.configService = configService;
        this.decodeApiClient = decodeApiClient;
        this.redis = redis;
    }
    detectAttachmentType(mime) {
        if (mime.startsWith('image/'))
            return enum_1.AttachmentType.IMAGE;
        if (mime.startsWith('video/'))
            return enum_1.AttachmentType.VIDEO;
        if (mime.startsWith('audio/'))
            return enum_1.AttachmentType.AUDIO;
        return enum_1.AttachmentType.FILE;
    }
    getLimits() {
        const toBytes = (mb, def) => (parseInt(mb || '', 10) || def) * 1024 * 1024;
        return {
            image: toBytes(this.configService.get('MAX_IMAGE_MB') ?? '10', 10),
            video: toBytes(this.configService.get('MAX_VIDEO_MB') ?? '100', 100),
            file: toBytes(this.configService.get('MAX_FILE_MB') ?? '25', 25),
        };
    }
    validateUploadSize(mime, size) {
        const type = this.detectAttachmentType(mime);
        const limits = this.getLimits();
        if (type === enum_1.AttachmentType.IMAGE && size > limits.image)
            throw new common_1.BadRequestException(`Image exceeds size limit (${limits.image / 1024 / 1024}MB)`);
        if (type === enum_1.AttachmentType.VIDEO && size > limits.video)
            throw new common_1.BadRequestException(`Video exceeds size limit (${limits.video / 1024 / 1024}MB)`);
        if (type !== enum_1.AttachmentType.IMAGE &&
            type !== enum_1.AttachmentType.VIDEO &&
            size > limits.file)
            throw new common_1.BadRequestException(`File exceeds size limit (${limits.file / 1024 / 1024}MB)`);
    }
    async createOrGetConversation(selfId, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(selfId) ||
            !mongoose_2.Types.ObjectId.isValid(dto.otherUserDehiveId)) {
            throw new common_1.BadRequestException('Invalid participant id');
        }
        const existing = await this.conversationModel.findOne({
            $or: [
                {
                    userA: new mongoose_2.Types.ObjectId(selfId),
                    userB: new mongoose_2.Types.ObjectId(dto.otherUserDehiveId),
                },
                {
                    userA: new mongoose_2.Types.ObjectId(dto.otherUserDehiveId),
                    userB: new mongoose_2.Types.ObjectId(selfId),
                },
            ],
        });
        if (existing)
            return existing;
        const doc = await this.conversationModel.create({
            userA: new mongoose_2.Types.ObjectId(selfId),
            userB: new mongoose_2.Types.ObjectId(dto.otherUserDehiveId),
        });
        return doc;
    }
    async handleUpload(selfId, file, body) {
        if (!file || typeof file !== 'object') {
            throw new common_1.BadRequestException('File is required');
        }
        const uploaded = file;
        if (!selfId || !mongoose_2.Types.ObjectId.isValid(selfId)) {
            throw new common_1.BadRequestException('Invalid or missing user_dehive_id');
        }
        if (!body.conversationId || !mongoose_2.Types.ObjectId.isValid(body.conversationId)) {
            throw new common_1.BadRequestException('Invalid conversationId');
        }
        const conv = await this.conversationModel
            .findById(body.conversationId)
            .lean();
        if (!conv) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const isParticipant = [
            conv.userA.toString(),
            conv.userB.toString(),
        ].includes(selfId);
        if (!isParticipant) {
            throw new common_1.BadRequestException('You are not a participant of this conversation');
        }
        const mime = uploaded.mimetype || 'application/octet-stream';
        const size = uploaded.size ?? 0;
        this.validateUploadSize(mime, size);
        const storage = (this.configService.get('STORAGE') || 'local').toLowerCase();
        const port = this.configService.get('DIRECT_MESSAGING_PORT') || 4004;
        const cdnBase = this.configService.get('CDN_BASE_URL_DM') ||
            `http://localhost:${port}/uploads`;
        let fileUrl = '';
        const originalName = uploaded.originalname || 'upload.bin';
        const ext = path.extname(originalName) || '';
        const safeName = `${(0, crypto_1.randomUUID)()}${ext}`;
        const uploadDir = path.resolve(process.cwd(), 'uploads');
        if (storage === 'local') {
            if (!fs.existsSync(uploadDir))
                fs.mkdirSync(uploadDir, { recursive: true });
            const dest = path.join(uploadDir, safeName);
            const buffer = Buffer.isBuffer(uploaded.buffer)
                ? uploaded.buffer
                : Buffer.from('');
            fs.writeFileSync(dest, buffer);
            fileUrl = `${cdnBase.replace(/\/$/, '')}/${safeName}`;
        }
        else {
            throw new common_1.BadRequestException('S3/MinIO storage is not implemented yet');
        }
        const type = this.detectAttachmentType(mime);
        let width, height, durationMs, thumbnailUrl;
        try {
            if (type === enum_1.AttachmentType.IMAGE) {
                const metadata = await (0, sharp_1.default)(uploaded.buffer).metadata();
                width = metadata.width;
                height = metadata.height;
            }
            else if (type === enum_1.AttachmentType.VIDEO ||
                type === enum_1.AttachmentType.AUDIO) {
                const tmpFilePath = path.join(uploadDir, safeName);
                const probeBin = (typeof ffprobe_static_1.default === 'object' && 'path' in ffprobe_static_1.default
                    ? ffprobe_static_1.default.path
                    : undefined) || 'ffprobe';
                const probe = childProcess.spawnSync(probeBin, [
                    '-v',
                    'error',
                    '-print_format',
                    'json',
                    '-show_format',
                    '-show_streams',
                    tmpFilePath,
                ], { encoding: 'utf-8' });
                if (probe.status === 0 && probe.stdout) {
                    const info = JSON.parse(probe.stdout);
                    const videoStream = Array.isArray(info.streams)
                        ? info.streams.find((s) => s && s.codec_type === 'video')
                        : undefined;
                    if (videoStream) {
                        width =
                            typeof videoStream.width === 'number'
                                ? videoStream.width
                                : undefined;
                        height =
                            typeof videoStream.height === 'number'
                                ? videoStream.height
                                : undefined;
                    }
                    let dur;
                    if (videoStream?.duration &&
                        !Number.isNaN(Number(videoStream.duration))) {
                        dur = parseFloat(videoStream.duration);
                    }
                    else if (info.format?.duration &&
                        !Number.isNaN(Number(info.format.duration))) {
                        dur = parseFloat(info.format.duration);
                    }
                    if (typeof dur === 'number' && !Number.isNaN(dur))
                        durationMs = Math.round(dur * 1000);
                    if (type === enum_1.AttachmentType.VIDEO) {
                        const thumbName = `${path.parse(safeName).name}_thumb.jpg`;
                        const thumbPath = path.join(uploadDir, thumbName);
                        const ffmpegBin = ffmpeg_static_1.default || 'ffmpeg';
                        const ffmpeg = childProcess.spawnSync(ffmpegBin, [
                            '-i',
                            tmpFilePath,
                            '-ss',
                            '00:00:00.000',
                            '-vframes',
                            '1',
                            '-vf',
                            'scale=640:-1',
                            thumbPath,
                            '-y',
                        ], { encoding: 'utf-8' });
                        if (ffmpeg.status === 0) {
                            thumbnailUrl = `${cdnBase.replace(/\/$/, '')}/${thumbName}`;
                        }
                    }
                }
            }
        }
        catch (err) {
            console.error(`[DirectMessaging] Failed to process media metadata for ${safeName}:`, err);
        }
        const doc = await this.directuploadModel.create({
            ownerId: new mongoose_2.Types.ObjectId(selfId),
            conversationId: new mongoose_2.Types.ObjectId(body.conversationId),
            type,
            url: fileUrl,
            name: originalName,
            size,
            mimeType: mime,
            width,
            height,
            durationMs,
            thumbnailUrl,
        });
        return {
            uploadId: doc._id.toString(),
            type: doc.type,
            url: doc.url,
            name: doc.name,
            size: doc.size,
            mimeType: doc.mimeType,
            width: doc.width,
            height: doc.height,
            durationMs: doc.durationMs,
            thumbnailUrl: doc.thumbnailUrl,
        };
    }
    async sendMessage(selfId, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(selfId)) {
            throw new common_1.BadRequestException('Invalid sender id');
        }
        if (!mongoose_2.Types.ObjectId.isValid(dto.conversationId)) {
            throw new common_1.BadRequestException('Invalid conversation id');
        }
        const conv = await this.conversationModel
            .findById(dto.conversationId)
            .lean();
        if (!conv)
            throw new common_1.NotFoundException('Conversation not found');
        const isParticipant = [conv.userA, conv.userB]
            .map((x) => String(x))
            .includes(selfId);
        if (!isParticipant)
            throw new common_1.BadRequestException('Not a participant');
        let attachments = [];
        if (Array.isArray(dto.uploadIds) && dto.uploadIds.length > 0) {
            const ids = dto.uploadIds.map((id) => new mongoose_2.Types.ObjectId(id));
            const uploads = await this.directuploadModel
                .find({ _id: { $in: ids }, ownerId: new mongoose_2.Types.ObjectId(selfId) })
                .lean();
            if (uploads.length !== ids.length) {
                throw new common_1.BadRequestException('You can only attach your own uploads');
            }
            attachments = uploads.map((u) => ({
                type: u.type,
                url: u.url,
                name: u.name,
                size: u.size,
                mimeType: u.mimeType,
                width: u.width,
                height: u.height,
                durationMs: u.durationMs,
                thumbnailUrl: u.thumbnailUrl,
            }));
        }
        const message = await this.messageModel.create({
            conversationId: new mongoose_2.Types.ObjectId(dto.conversationId),
            senderId: new mongoose_2.Types.ObjectId(selfId),
            content: dto.content,
            attachments,
        });
        return message;
    }
    async listMessages(selfId, conversationId, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(selfId))
            throw new common_1.BadRequestException('Invalid self id');
        if (!mongoose_2.Types.ObjectId.isValid(conversationId))
            throw new common_1.BadRequestException('Invalid conversation id');
        const conv = await this.conversationModel.findById(conversationId).lean();
        if (!conv)
            throw new common_1.NotFoundException('Conversation not found');
        const isParticipant = [conv.userA, conv.userB]
            .map((x) => String(x))
            .includes(selfId);
        if (!isParticipant)
            throw new common_1.BadRequestException('Not a participant');
        const page = dto.page || 1;
        const limit = dto.limit || 50;
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.messageModel
                .find({ conversationId: new mongoose_2.Types.ObjectId(conversationId) })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.messageModel.countDocuments({
                conversationId: new mongoose_2.Types.ObjectId(conversationId),
            }),
        ]);
        return { page, limit, total, items };
    }
    async editMessage(selfId, messageId, content) {
        if (!mongoose_2.Types.ObjectId.isValid(selfId))
            throw new common_1.BadRequestException('Invalid self id');
        if (!mongoose_2.Types.ObjectId.isValid(messageId))
            throw new common_1.BadRequestException('Invalid message id');
        if (typeof content !== 'string')
            throw new common_1.BadRequestException('Content must be a string');
        const message = await this.messageModel.findById(messageId);
        if (!message)
            throw new common_1.NotFoundException('Message not found');
        if (String(message.senderId) !== selfId)
            throw new common_1.BadRequestException('You can only edit your own message');
        if (message.isDeleted)
            throw new common_1.BadRequestException('Cannot edit a deleted message');
        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();
        return message.toJSON();
    }
    async deleteMessage(selfId, messageId) {
        if (!mongoose_2.Types.ObjectId.isValid(selfId))
            throw new common_1.BadRequestException('Invalid self id');
        if (!mongoose_2.Types.ObjectId.isValid(messageId))
            throw new common_1.BadRequestException('Invalid message id');
        const message = await this.messageModel.findById(messageId);
        if (!message)
            throw new common_1.NotFoundException('Message not found');
        if (String(message.senderId) !== selfId)
            throw new common_1.BadRequestException('You can only delete your own message');
        if (message.isDeleted)
            return message.toJSON();
        message.isDeleted = true;
        message.content = '[deleted]';
        message.attachments = [];
        await message.save();
        return message.toJSON();
    }
    async listUploads(selfId, dto) {
        if (!selfId || !mongoose_2.Types.ObjectId.isValid(selfId)) {
            throw new common_1.BadRequestException('Invalid user id');
        }
        const page = dto.page > 0 ? dto.page : 1;
        const limit = dto.limit > 0 ? Math.min(dto.limit, 100) : 50;
        const skip = (page - 1) * limit;
        const query = {
            ownerId: new mongoose_2.Types.ObjectId(selfId),
        };
        if (dto.type) {
            query.type = dto.type;
        }
        const [items, total] = await Promise.all([
            this.directuploadModel
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.directuploadModel.countDocuments(query),
        ]);
        return { page, limit, total, items };
    }
    async getFollowing(currentUser, dto) {
        const page = 0;
        const limit = 10;
        const sessionId = currentUser.session_id;
        if (!sessionId) {
            throw new common_1.UnauthorizedException('Session ID not found in user session.');
        }
        const sessionKey = `session:${sessionId}`;
        const sessionDataRaw = await this.redis.get(sessionKey);
        if (!sessionDataRaw) {
            throw new common_1.UnauthorizedException('Session not found in cache.');
        }
        const sessionData = JSON.parse(sessionDataRaw);
        const accessToken = sessionData.access_token;
        const fingerprintHash = currentUser.fingerprint_hash;
        if (!accessToken) {
            throw new common_1.UnauthorizedException('Access token not found in user session.');
        }
        if (!fingerprintHash) {
            throw new common_1.UnauthorizedException('Fingerprint hash not found in user session.');
        }
        const result = await this.decodeApiClient.getFollowing(accessToken, fingerprintHash, page, limit);
        if (!result || !result.success) {
            throw new common_1.NotFoundException('Could not retrieve following list from Decode service');
        }
        return result;
    }
};
exports.DirectMessagingService = DirectMessagingService;
exports.DirectMessagingService = DirectMessagingService = DirectMessagingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(direct_conversation_schema_1.DirectConversation.name)),
    __param(1, (0, mongoose_1.InjectModel)(direct_message_schema_1.DirectMessage.name)),
    __param(2, (0, mongoose_1.InjectModel)(direct_upload_schema_1.DirectUpload.name)),
    __param(5, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        decode_api_client_1.DecodeApiClient,
        ioredis_2.Redis])
], DirectMessagingService);


/***/ }),

/***/ "./apps/user-dehive-server/enum/enum.ts":
/*!**********************************************!*\
  !*** ./apps/user-dehive-server/enum/enum.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuditLogAction = exports.enumUserRole = exports.ServerRole = exports.Status = void 0;
var Status;
(function (Status) {
    Status["Online"] = "online";
    Status["Offline"] = "offline";
    Status["Away"] = "away";
    Status["Busy"] = "busy";
})(Status || (exports.Status = Status = {}));
var ServerRole;
(function (ServerRole) {
    ServerRole["OWNER"] = "owner";
    ServerRole["MODERATOR"] = "moderator";
    ServerRole["MEMBER"] = "member";
})(ServerRole || (exports.ServerRole = ServerRole = {}));
var enumUserRole;
(function (enumUserRole) {
    enumUserRole["ADMIN"] = "admin";
    enumUserRole["MODERATOR"] = "moderator";
    enumUserRole["USER"] = "user";
})(enumUserRole || (exports.enumUserRole = enumUserRole = {}));
var AuditLogAction;
(function (AuditLogAction) {
    AuditLogAction["MEMBER_JOIN"] = "member_join";
    AuditLogAction["MEMBER_LEAVE"] = "member_leave";
    AuditLogAction["MEMBER_KICK"] = "member_kick";
    AuditLogAction["MEMBER_BAN"] = "member_ban";
    AuditLogAction["MEMBER_UNBAN"] = "member_unban";
    AuditLogAction["INVITE_CREATE"] = "invite_create";
    AuditLogAction["INVITE_DELETE"] = "invite_delete";
    AuditLogAction["ROLE_UPDATE"] = "role_update";
    AuditLogAction["SERVER_UPDATE"] = "server_update";
})(AuditLogAction || (exports.AuditLogAction = AuditLogAction = {}));


/***/ }),

/***/ "./apps/user-dehive-server/schemas/user-dehive.schema.ts":
/*!***************************************************************!*\
  !*** ./apps/user-dehive-server/schemas/user-dehive.schema.ts ***!
  \***************************************************************/
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
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/user-dehive-server/enum/enum.ts");
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
        enum: enum_1.enumUserRole,
        default: 'USER',
    }),
    __metadata("design:type", String)
], UserDehive.prototype, "dehive_role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", Object)
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
    __metadata("design:type", Date)
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

/***/ "@nestjs/platform-express":
/*!*******************************************!*\
  !*** external "@nestjs/platform-express" ***!
  \*******************************************/
/***/ ((module) => {

module.exports = require("@nestjs/platform-express");

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

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),

/***/ "class-transformer":
/*!************************************!*\
  !*** external "class-transformer" ***!
  \************************************/
/***/ ((module) => {

module.exports = require("class-transformer");

/***/ }),

/***/ "class-validator":
/*!**********************************!*\
  !*** external "class-validator" ***!
  \**********************************/
/***/ ((module) => {

module.exports = require("class-validator");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "express":
/*!**************************!*\
  !*** external "express" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("express");

/***/ }),

/***/ "ffmpeg-static":
/*!********************************!*\
  !*** external "ffmpeg-static" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("ffmpeg-static");

/***/ }),

/***/ "ffprobe-static":
/*!*********************************!*\
  !*** external "ffprobe-static" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("ffprobe-static");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

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

/***/ "sharp":
/*!************************!*\
  !*** external "sharp" ***!
  \************************/
/***/ ((module) => {

module.exports = require("sharp");

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
/*!*******************************************!*\
  !*** ./apps/direct-messaging/src/main.ts ***!
  \*******************************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
const core_1 = __webpack_require__(/*! @nestjs/core */ "@nestjs/core");
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const direct_messaging_module_1 = __webpack_require__(/*! ./direct-messaging.module */ "./apps/direct-messaging/src/direct-messaging.module.ts");
const express = __webpack_require__(/*! express */ "express");
const path = __webpack_require__(/*! path */ "path");
const platform_socket_io_1 = __webpack_require__(/*! @nestjs/platform-socket.io */ "@nestjs/platform-socket.io");
const method_not_allowed_filter_1 = __webpack_require__(/*! ../common/filters/method-not-allowed.filter */ "./apps/direct-messaging/common/filters/method-not-allowed.filter.ts");
async function bootstrap() {
    const app = await core_1.NestFactory.create(direct_messaging_module_1.DirectMessagingModule);
    const configService = app.get(config_1.ConfigService);
    app.enableCors({ origin: '*' });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new method_not_allowed_filter_1.MethodNotAllowedFilter());
    app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Dehive - Direct Messaging Service')
        .setDescription('REST for 1:1 direct chat.')
        .setVersion('1.0')
        .addTag('Direct Messages')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api-dm-docs', app, document);
    const port = configService.get('DIRECT_MESSAGING_PORT') || 4004;
    await app.listen(port);
    console.log(`[Dehive] Direct-Messaging service running at http://localhost:${port}`);
    console.log(`[Dehive] Swagger UI at http://localhost:${port}/api-dm-docs`);
}
void bootstrap();

})();

/******/ })()
;
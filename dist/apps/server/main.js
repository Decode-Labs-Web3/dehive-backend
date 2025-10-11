/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./apps/server/common/decorators/current-user.decorator.ts":
/*!*****************************************************************!*\
  !*** ./apps/server/common/decorators/current-user.decorator.ts ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CurrentUser = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    console.log('🎯 [SERVER CURRENT USER] Decorator called with data:', data);
    try {
        const request = ctx
            .switchToHttp()
            .getRequest();
        console.log('🎯 [SERVER CURRENT USER] Request user:', request.user);
        console.log('🎯 [SERVER CURRENT USER] Request sessionId:', request.sessionId);
        if (data === 'sessionId') {
            return request.sessionId;
        }
        const user = request.user;
        if (data && user) {
            console.log(`🎯 [SERVER CURRENT USER] Returning user.${data}:`, user[data]);
            return user[data];
        }
        console.log('🎯 [SERVER CURRENT USER] Returning full user:', user);
        return user;
    }
    catch (error) {
        console.error('❌ [SERVER CURRENT USER] Error:', error);
        return undefined;
    }
});


/***/ }),

/***/ "./apps/server/common/guards/auth.guard.ts":
/*!*************************************************!*\
  !*** ./apps/server/common/guards/auth.guard.ts ***!
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
var AuthGuard_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthGuard = exports.Public = exports.PUBLIC_KEY = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const core_1 = __webpack_require__(/*! @nestjs/core */ "@nestjs/core");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const axios_2 = __webpack_require__(/*! axios */ "axios");
const rxjs_1 = __webpack_require__(/*! rxjs */ "rxjs");
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
        console.log('🔥 [SERVER AUTH GUARD] Constructor called - This is the server AuthGuard!');
    }
    async canActivate(context) {
        console.log('🚨 [SERVER AUTH GUARD] canActivate called - This is the server AuthGuard!');
        const request = context.switchToHttp().getRequest();
        const isPublic = this.reflector.get(exports.PUBLIC_KEY, context.getHandler());
        console.log('🚨 [SERVER AUTH GUARD] isPublic:', isPublic);
        if (isPublic) {
            console.log('🚨 [SERVER AUTH GUARD] Route is public, skipping auth');
            return true;
        }
        const sessionId = this.extractSessionIdFromHeader(request);
        console.log('🚨 [SERVER AUTH GUARD] sessionId:', sessionId);
        if (!sessionId) {
            console.log('❌ [SERVER AUTH GUARD] No session ID found!');
            throw new common_1.UnauthorizedException({
                message: 'Session ID is required',
                error: 'MISSING_SESSION_ID',
            });
        }
        try {
            console.log('🔐 [SERVER AUTH GUARD] Calling auth service for session validation');
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
                console.log('🔐 [SERVER AUTH GUARD] Using session data directly');
                const sessionData = session_check_response.data;
                const sessionToken = sessionData.session_token;
                if (sessionToken) {
                    const payload = sessionToken.split('.')[1];
                    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
                    const userId = decodedPayload.user_id;
                    console.log('🔍 [SERVER AUTH GUARD] JWT decodedPayload:', decodedPayload);
                    console.log('🔍 [SERVER AUTH GUARD] userId from JWT:', userId);
                    if (userId) {
                        request['user'] = {
                            _id: userId,
                            userId: userId,
                            email: 'user@example.com',
                            username: 'user',
                            role: 'user',
                        };
                        request['sessionId'] = sessionId;
                        console.log('✅ [SERVER AUTH GUARD] User attached to request:', request['user']);
                    }
                    else {
                        throw new common_1.UnauthorizedException({
                            message: 'No user_id in JWT token',
                            error: 'NO_USER_ID_IN_JWT',
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
    __metadata("design:paramtypes", [typeof (_a = typeof axios_1.HttpService !== "undefined" && axios_1.HttpService) === "function" ? _a : Object, typeof (_b = typeof core_1.Reflector !== "undefined" && core_1.Reflector) === "function" ? _b : Object])
], AuthGuard);


/***/ }),

/***/ "./apps/server/dto/create-category.dto.ts":
/*!************************************************!*\
  !*** ./apps/server/dto/create-category.dto.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CreateCategoryDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class CreateCategoryDto {
    name;
}
exports.CreateCategoryDto = CreateCategoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The name of the new category.',
        example: 'General Channels',
    }),
    (0, class_validator_1.IsString)({ message: 'Name must be a string.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Name cannot be empty.' }),
    (0, class_validator_1.Length)(1, 100, { message: 'Name must be between 1 and 100 characters.' }),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "name", void 0);


/***/ }),

/***/ "./apps/server/dto/create-channel.dto.ts":
/*!***********************************************!*\
  !*** ./apps/server/dto/create-channel.dto.ts ***!
  \***********************************************/
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
exports.CreateChannelDto = exports.ChannelType = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
var ChannelType;
(function (ChannelType) {
    ChannelType["TEXT"] = "TEXT";
    ChannelType["VOICE"] = "VOICE";
})(ChannelType || (exports.ChannelType = ChannelType = {}));
class CreateChannelDto {
    name;
    type;
    topic;
}
exports.CreateChannelDto = CreateChannelDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The name of the new channel.',
        example: 'general-chat',
    }),
    (0, class_validator_1.IsString)({ message: 'Name must be a string.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Name cannot be empty.' }),
    (0, class_validator_1.Length)(1, 100, { message: 'Name must be between 1 and 100 characters.' }),
    __metadata("design:type", String)
], CreateChannelDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The type of the channel.',
        enum: ChannelType,
        example: ChannelType.TEXT,
    }),
    (0, class_validator_1.IsEnum)(ChannelType, { message: 'Type must be either TEXT or VOICE.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Type cannot be empty.' }),
    __metadata("design:type", String)
], CreateChannelDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The topic of the channel (optional).',
        example: 'General discussion for all members.',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 1024, { message: 'Topic must not exceed 1024 characters.' }),
    __metadata("design:type", String)
], CreateChannelDto.prototype, "topic", void 0);


/***/ }),

/***/ "./apps/server/dto/create-server.dto.ts":
/*!**********************************************!*\
  !*** ./apps/server/dto/create-server.dto.ts ***!
  \**********************************************/
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
exports.CreateServerDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class CreateServerDto {
    name;
    description;
}
exports.CreateServerDto = CreateServerDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The name of the new server.',
        example: 'My Awesome Community',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateServerDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'A brief description of the server (optional).',
        example: 'A place to hang out and chat.',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateServerDto.prototype, "description", void 0);


/***/ }),

/***/ "./apps/server/dto/update-category.dto.ts":
/*!************************************************!*\
  !*** ./apps/server/dto/update-category.dto.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdateCategoryDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class UpdateCategoryDto {
    name;
}
exports.UpdateCategoryDto = UpdateCategoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The new name for the category.',
        example: '💬 Community Channels',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], UpdateCategoryDto.prototype, "name", void 0);


/***/ }),

/***/ "./apps/server/dto/update-channel.dto.ts":
/*!***********************************************!*\
  !*** ./apps/server/dto/update-channel.dto.ts ***!
  \***********************************************/
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
exports.UpdateChannelDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class UpdateChannelDto {
    name;
    topic;
    category_id;
}
exports.UpdateChannelDto = UpdateChannelDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The new name for the channel.',
        example: 'welcome-and-rules',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], UpdateChannelDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The new topic for the channel.',
        example: 'Please read the rules before posting!',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 1024),
    __metadata("design:type", String)
], UpdateChannelDto.prototype, "topic", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the new category to move this channel to.',
        example: '68c40af9dfffdf7ae4af2e8c',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], UpdateChannelDto.prototype, "category_id", void 0);


/***/ }),

/***/ "./apps/server/dto/update-server.dto.ts":
/*!**********************************************!*\
  !*** ./apps/server/dto/update-server.dto.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdateServerDto = void 0;
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const create_server_dto_1 = __webpack_require__(/*! ./create-server.dto */ "./apps/server/dto/create-server.dto.ts");
class UpdateServerDto extends (0, swagger_1.PartialType)(create_server_dto_1.CreateServerDto) {
}
exports.UpdateServerDto = UpdateServerDto;


/***/ }),

/***/ "./apps/server/interfaces/transform.interface.ts":
/*!*******************************************************!*\
  !*** ./apps/server/interfaces/transform.interface.ts ***!
  \*******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TransformInterceptor = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const operators_1 = __webpack_require__(/*! rxjs/operators */ "rxjs/operators");
let TransformInterceptor = class TransformInterceptor {
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse();
        return next.handle().pipe((0, operators_1.map)((data) => {
            const statusCode = response.statusCode;
            const message = data?.message || 'Operation successful';
            const responseData = data?.message ? null : data;
            return {
                statusCode,
                success: true,
                message,
                data: responseData,
            };
        }));
    }
};
exports.TransformInterceptor = TransformInterceptor;
exports.TransformInterceptor = TransformInterceptor = __decorate([
    (0, common_1.Injectable)()
], TransformInterceptor);


/***/ }),

/***/ "./apps/server/schemas/category.schema.ts":
/*!************************************************!*\
  !*** ./apps/server/schemas/category.schema.ts ***!
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
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CategorySchema = exports.Category = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let Category = class Category {
    name;
    server_id;
};
exports.Category = Category;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 100 }),
    __metadata("design:type", String)
], Category.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Server', required: true }),
    __metadata("design:type", typeof (_a = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _a : Object)
], Category.prototype, "server_id", void 0);
exports.Category = Category = __decorate([
    (0, mongoose_1.Schema)({ collection: 'category', timestamps: true })
], Category);
exports.CategorySchema = mongoose_1.SchemaFactory.createForClass(Category);


/***/ }),

/***/ "./apps/server/schemas/channel-message.schema.ts":
/*!*******************************************************!*\
  !*** ./apps/server/schemas/channel-message.schema.ts ***!
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
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChannelMessageSchema = exports.ChannelMessage = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let ChannelMessage = class ChannelMessage {
    message;
    sender;
    channel_id;
    is_encrypted;
    attachments;
    is_edited;
};
exports.ChannelMessage = ChannelMessage;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 2000 }),
    __metadata("design:type", String)
], ChannelMessage.prototype, "message", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'UserDehive', required: true }),
    __metadata("design:type", typeof (_a = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _a : Object)
], ChannelMessage.prototype, "sender", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Channel', required: true, index: true }),
    __metadata("design:type", typeof (_b = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _b : Object)
], ChannelMessage.prototype, "channel_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChannelMessage.prototype, "is_encrypted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ type: Object }], default: [] }),
    __metadata("design:type", Array)
], ChannelMessage.prototype, "attachments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChannelMessage.prototype, "is_edited", void 0);
exports.ChannelMessage = ChannelMessage = __decorate([
    (0, mongoose_1.Schema)({ collection: 'channel_message', timestamps: true })
], ChannelMessage);
exports.ChannelMessageSchema = mongoose_1.SchemaFactory.createForClass(ChannelMessage);


/***/ }),

/***/ "./apps/server/schemas/channel.schema.ts":
/*!***********************************************!*\
  !*** ./apps/server/schemas/channel.schema.ts ***!
  \***********************************************/
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
exports.ChannelSchema = exports.Channel = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
const create_channel_dto_1 = __webpack_require__(/*! ../dto/create-channel.dto */ "./apps/server/dto/create-channel.dto.ts");
let Channel = class Channel {
    name;
    type;
    category_id;
    topic;
};
exports.Channel = Channel;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 100 }),
    __metadata("design:type", String)
], Channel.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: create_channel_dto_1.ChannelType, required: true }),
    __metadata("design:type", typeof (_a = typeof create_channel_dto_1.ChannelType !== "undefined" && create_channel_dto_1.ChannelType) === "function" ? _a : Object)
], Channel.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Category', required: true }),
    __metadata("design:type", typeof (_b = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _b : Object)
], Channel.prototype, "category_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, maxlength: 1024 }),
    __metadata("design:type", String)
], Channel.prototype, "topic", void 0);
exports.Channel = Channel = __decorate([
    (0, mongoose_1.Schema)({ collection: 'channel', timestamps: true })
], Channel);
exports.ChannelSchema = mongoose_1.SchemaFactory.createForClass(Channel);


/***/ }),

/***/ "./apps/server/schemas/server.schema.ts":
/*!**********************************************!*\
  !*** ./apps/server/schemas/server.schema.ts ***!
  \**********************************************/
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
exports.ServerSchema = exports.Server = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
let Server = class Server {
    name;
    description;
    owner_id;
    member_count;
    is_private;
    tags;
};
exports.Server = Server;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Server.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Server.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], Server.prototype, "owner_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Server.prototype, "member_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Server.prototype, "is_private", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Server.prototype, "tags", void 0);
exports.Server = Server = __decorate([
    (0, mongoose_1.Schema)({ collection: 'server', timestamps: true })
], Server);
exports.ServerSchema = mongoose_1.SchemaFactory.createForClass(Server);


/***/ }),

/***/ "./apps/server/src/server.controller.ts":
/*!**********************************************!*\
  !*** ./apps/server/src/server.controller.ts ***!
  \**********************************************/
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
var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ServerController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const server_service_1 = __webpack_require__(/*! ./server.service */ "./apps/server/src/server.service.ts");
const create_server_dto_1 = __webpack_require__(/*! ../dto/create-server.dto */ "./apps/server/dto/create-server.dto.ts");
const update_server_dto_1 = __webpack_require__(/*! ../dto/update-server.dto */ "./apps/server/dto/update-server.dto.ts");
const create_category_dto_1 = __webpack_require__(/*! ../dto/create-category.dto */ "./apps/server/dto/create-category.dto.ts");
const create_channel_dto_1 = __webpack_require__(/*! ../dto/create-channel.dto */ "./apps/server/dto/create-channel.dto.ts");
const update_category_dto_1 = __webpack_require__(/*! ../dto/update-category.dto */ "./apps/server/dto/update-category.dto.ts");
const update_channel_dto_1 = __webpack_require__(/*! ../dto/update-channel.dto */ "./apps/server/dto/update-channel.dto.ts");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const auth_guard_1 = __webpack_require__(/*! ../common/guards/auth.guard */ "./apps/server/common/guards/auth.guard.ts");
const current_user_decorator_1 = __webpack_require__(/*! ../common/decorators/current-user.decorator */ "./apps/server/common/decorators/current-user.decorator.ts");
let ServerController = class ServerController {
    serverService;
    constructor(serverService) {
        this.serverService = serverService;
    }
    createServer(createServerDto, ownerId) {
        console.log('🎯 [CONTROLLER] createServer called');
        console.log('🎯 [CONTROLLER] ownerId:', ownerId);
        console.log('🎯 [CONTROLLER] ownerId type:', typeof ownerId);
        console.log('🎯 [CONTROLLER] createServerDto:', createServerDto);
        return this.serverService.createServer(createServerDto, ownerId);
    }
    findAllServers(actorId) {
        return this.serverService.findAllServers(actorId);
    }
    findServerById(id) {
        return this.serverService.findServerById(id);
    }
    updateServer(id, updateServerDto, actorId) {
        return this.serverService.updateServer(id, updateServerDto, actorId);
    }
    removeServer(id, actorId) {
        return this.serverService.removeServer(id, actorId);
    }
    createCategory(serverId, createCategoryDto, actorId) {
        return this.serverService.createCategory(serverId, actorId, createCategoryDto);
    }
    findAllCategoriesInServer(serverId) {
        return this.serverService.findAllCategoriesInServer(serverId);
    }
    updateCategory(categoryId, updateCategoryDto, actorId) {
        return this.serverService.updateCategory(categoryId, actorId, updateCategoryDto);
    }
    removeCategory(categoryId, actorId) {
        return this.serverService.removeCategory(categoryId, actorId);
    }
    createChannel(serverId, categoryId, createChannelDto, actorId) {
        return this.serverService.createChannel(serverId, categoryId, actorId, createChannelDto);
    }
    findChannelById(channelId) {
        return this.serverService.findChannelById(channelId);
    }
    updateChannel(channelId, updateChannelDto, actorId) {
        return this.serverService.updateChannel(channelId, actorId, updateChannelDto);
    }
    removeChannel(channelId, actorId) {
        return this.serverService.removeChannel(channelId, actorId);
    }
};
exports.ServerController = ServerController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new server' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Server created successfully.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof create_server_dto_1.CreateServerDto !== "undefined" && create_server_dto_1.CreateServerDto) === "function" ? _b : Object, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "createServer", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all servers joined by the user',
        description: 'Retrieves a list of servers that the authenticated user is a member of.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns a list of joined servers.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "findAllServers", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single server by ID' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'The ID of the server' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the server details.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "findServerById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a server' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'The ID of the server to update' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_c = typeof update_server_dto_1.UpdateServerDto !== "undefined" && update_server_dto_1.UpdateServerDto) === "function" ? _c : Object, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "updateServer", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a server' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'The ID of the server to delete' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "removeServer", null);
__decorate([
    (0, common_1.Post)(':serverId/categories'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new category' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'serverId', description: 'The ID of the server' }),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_d = typeof create_category_dto_1.CreateCategoryDto !== "undefined" && create_category_dto_1.CreateCategoryDto) === "function" ? _d : Object, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Get)(':serverId/categories'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all categories in a server' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'serverId', description: 'The ID of the server' }),
    __param(0, (0, common_1.Param)('serverId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "findAllCategoriesInServer", null);
__decorate([
    (0, common_1.Patch)('categories/:categoryId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a category' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({
        name: 'categoryId',
        description: 'The ID of the category to update',
    }),
    __param(0, (0, common_1.Param)('categoryId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_e = typeof update_category_dto_1.UpdateCategoryDto !== "undefined" && update_category_dto_1.UpdateCategoryDto) === "function" ? _e : Object, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:categoryId'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a category' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({
        name: 'categoryId',
        description: 'The ID of the category to delete',
    }),
    __param(0, (0, common_1.Param)('categoryId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "removeCategory", null);
__decorate([
    (0, common_1.Post)(':serverId/categories/:categoryId/channels'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new channel' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'serverId', description: 'The ID of the server' }),
    (0, swagger_1.ApiParam)({ name: 'categoryId', description: 'The ID of the category' }),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, common_1.Param)('categoryId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, typeof (_f = typeof create_channel_dto_1.CreateChannelDto !== "undefined" && create_channel_dto_1.CreateChannelDto) === "function" ? _f : Object, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "createChannel", null);
__decorate([
    (0, common_1.Get)('channels/:channelId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single channel by ID' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'channelId', description: 'The ID of the channel' }),
    __param(0, (0, common_1.Param)('channelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "findChannelById", null);
__decorate([
    (0, common_1.Patch)('channels/:channelId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update a channel',
        description: 'Update channel properties including name, topic, or move it to a different category within the same server.'
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({
        name: 'channelId',
        description: 'The ID of the channel to update',
    }),
    __param(0, (0, common_1.Param)('channelId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_g = typeof update_channel_dto_1.UpdateChannelDto !== "undefined" && update_channel_dto_1.UpdateChannelDto) === "function" ? _g : Object, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "updateChannel", null);
__decorate([
    (0, common_1.Delete)('channels/:channelId'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a channel' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({
        name: 'channelId',
        description: 'The ID of the channel to delete',
    }),
    __param(0, (0, common_1.Param)('channelId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ServerController.prototype, "removeChannel", null);
exports.ServerController = ServerController = __decorate([
    (0, swagger_1.ApiTags)('Servers, Categories & Channels'),
    (0, common_1.Controller)('servers'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [typeof (_a = typeof server_service_1.ServerService !== "undefined" && server_service_1.ServerService) === "function" ? _a : Object])
], ServerController);


/***/ }),

/***/ "./apps/server/src/server.module.ts":
/*!******************************************!*\
  !*** ./apps/server/src/server.module.ts ***!
  \******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ServerModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const server_controller_1 = __webpack_require__(/*! ./server.controller */ "./apps/server/src/server.controller.ts");
const server_service_1 = __webpack_require__(/*! ./server.service */ "./apps/server/src/server.service.ts");
const server_schema_1 = __webpack_require__(/*! ../schemas/server.schema */ "./apps/server/schemas/server.schema.ts");
const category_schema_1 = __webpack_require__(/*! ../schemas/category.schema */ "./apps/server/schemas/category.schema.ts");
const channel_schema_1 = __webpack_require__(/*! ../schemas/channel.schema */ "./apps/server/schemas/channel.schema.ts");
const user_dehive_schema_1 = __webpack_require__(/*! ../../user-dehive-server/schemas/user-dehive.schema */ "./apps/user-dehive-server/schemas/user-dehive.schema.ts");
const user_dehive_server_schema_1 = __webpack_require__(/*! ../../user-dehive-server/schemas/user-dehive-server.schema */ "./apps/user-dehive-server/schemas/user-dehive-server.schema.ts");
const channel_message_schema_1 = __webpack_require__(/*! ../schemas/channel-message.schema */ "./apps/server/schemas/channel-message.schema.ts");
const user_dehive_server_module_1 = __webpack_require__(/*! ../../user-dehive-server/src/user-dehive-server.module */ "./apps/user-dehive-server/src/user-dehive-server.module.ts");
const auth_guard_1 = __webpack_require__(/*! ../common/guards/auth.guard */ "./apps/server/common/guards/auth.guard.ts");
let ServerModule = class ServerModule {
};
exports.ServerModule = ServerModule;
exports.ServerModule = ServerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: `.env`,
            }),
            axios_1.HttpModule.register({
                timeout: 5000,
                maxRedirects: 5,
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    uri: configService.get('MONGODB_URI'),
                    dbName: 'dehive_db',
                }),
            }),
            user_dehive_server_module_1.UserDehiveServerModule,
            mongoose_1.MongooseModule.forFeature([
                { name: server_schema_1.Server.name, schema: server_schema_1.ServerSchema },
                { name: category_schema_1.Category.name, schema: category_schema_1.CategorySchema },
                { name: channel_schema_1.Channel.name, schema: channel_schema_1.ChannelSchema },
                { name: user_dehive_schema_1.UserDehive.name, schema: user_dehive_schema_1.UserDehiveSchema },
                { name: user_dehive_server_schema_1.UserDehiveServer.name, schema: user_dehive_server_schema_1.UserDehiveServerSchema },
                { name: channel_message_schema_1.ChannelMessage.name, schema: channel_message_schema_1.ChannelMessageSchema },
            ]),
        ],
        controllers: [server_controller_1.ServerController],
        providers: [server_service_1.ServerService, auth_guard_1.AuthGuard],
    })
], ServerModule);


/***/ }),

/***/ "./apps/server/src/server.service.ts":
/*!*******************************************!*\
  !*** ./apps/server/src/server.service.ts ***!
  \*******************************************/
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
var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ServerService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const server_schema_1 = __webpack_require__(/*! ../schemas/server.schema */ "./apps/server/schemas/server.schema.ts");
const user_dehive_schema_1 = __webpack_require__(/*! ../../user-dehive-server/schemas/user-dehive.schema */ "./apps/user-dehive-server/schemas/user-dehive.schema.ts");
const user_dehive_server_schema_1 = __webpack_require__(/*! ../../user-dehive-server/schemas/user-dehive-server.schema */ "./apps/user-dehive-server/schemas/user-dehive-server.schema.ts");
const category_schema_1 = __webpack_require__(/*! ../schemas/category.schema */ "./apps/server/schemas/category.schema.ts");
const channel_schema_1 = __webpack_require__(/*! ../schemas/channel.schema */ "./apps/server/schemas/channel.schema.ts");
const channel_message_schema_1 = __webpack_require__(/*! ../schemas/channel-message.schema */ "./apps/server/schemas/channel-message.schema.ts");
const enum_1 = __webpack_require__(/*! ../../user-dehive-server/enum/enum */ "./apps/user-dehive-server/enum/enum.ts");
let ServerService = class ServerService {
    serverModel;
    categoryModel;
    channelModel;
    userDehiveServerModel;
    userDehiveModel;
    channelMessageModel;
    httpService;
    constructor(serverModel, categoryModel, channelModel, userDehiveServerModel, userDehiveModel, channelMessageModel, httpService) {
        this.serverModel = serverModel;
        this.categoryModel = categoryModel;
        this.channelModel = channelModel;
        this.userDehiveServerModel = userDehiveServerModel;
        this.userDehiveModel = userDehiveModel;
        this.channelMessageModel = channelMessageModel;
        this.httpService = httpService;
    }
    async createServer(createServerDto, ownerBaseId) {
        console.log('🚀 [CREATE SERVER] Starting with ownerBaseId:', ownerBaseId);
        if (!ownerBaseId) {
            throw new common_1.BadRequestException('Owner ID is required');
        }
        const ownerDehiveId = ownerBaseId;
        console.log('🔍 [CREATE SERVER] ownerDehiveId:', ownerDehiveId);
        const session = await this.serverModel.db.startSession();
        session.startTransaction();
        try {
            const newServerData = {
                ...createServerDto,
                owner_id: ownerBaseId,
                member_count: 1,
                is_private: false,
                tags: [],
            };
            const createdServers = await this.serverModel.create([newServerData], {
                session,
            });
            const newServer = createdServers[0];
            const newMembership = new this.userDehiveServerModel({
                user_dehive_id: ownerDehiveId,
                server_id: newServer._id,
                role: enum_1.ServerRole.OWNER,
            });
            await newMembership.save({ session });
            await this.userDehiveModel.findByIdAndUpdate(ownerDehiveId, {
                $inc: { server_count: 1 },
                $setOnInsert: {
                    dehive_role: 'USER',
                    status: 'ACTIVE',
                    bio: '',
                    banner_color: null,
                    is_banned: false,
                    banned_by_servers: [],
                },
            }, {
                session,
                upsert: true,
            });
            await session.commitTransaction();
            return newServer;
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Could not create server.', error.message);
        }
        finally {
            void session.endSession();
        }
    }
    async findAllServers(actorBaseId) {
        const actorDehiveId = actorBaseId;
        const memberships = await this.userDehiveServerModel
            .find({ user_dehive_id: actorDehiveId })
            .select('server_id')
            .lean();
        const serverIds = memberships.map((m) => m.server_id);
        return this.serverModel.find({ _id: { $in: serverIds } }).exec();
    }
    async findServerById(id) {
        const server = await this.serverModel.findById(id).exec();
        if (!server) {
            throw new common_1.NotFoundException(`Server with ID "${id}" not found`);
        }
        return server;
    }
    async updateServer(id, updateServerDto, actorId) {
        const server = await this.findServerById(id);
        if (server.owner_id.toString() !== actorId) {
            throw new common_1.ForbiddenException('You do not have permission to edit this server.');
        }
        const updatedServer = await this.serverModel
            .findByIdAndUpdate(id, updateServerDto, { new: true })
            .exec();
        if (!updatedServer) {
            throw new common_1.NotFoundException(`Server with ID "${id}" not found`);
        }
        return updatedServer;
    }
    async removeServer(id, actorId) {
        const server = await this.findServerById(id);
        if (server.owner_id.toString() !== actorId) {
            throw new common_1.ForbiddenException('You do not have permission to delete this server.');
        }
        const session = await this.serverModel.db.startSession();
        session.startTransaction();
        try {
            const serverId = new mongoose_2.Types.ObjectId(id);
            const members = await this.userDehiveServerModel
                .find({ server_id: serverId })
                .select('user_dehive_id')
                .session(session);
            const memberIds = members.map((m) => m.user_dehive_id);
            await this.serverModel.findByIdAndDelete(serverId, { session });
            const categories = await this.categoryModel
                .find({ server_id: serverId })
                .select('_id')
                .session(session);
            const categoryIds = categories.map((c) => c._id);
            if (categoryIds.length > 0) {
                await this.channelModel.deleteMany({ category_id: { $in: categoryIds } }, { session });
            }
            await this.categoryModel.deleteMany({ server_id: serverId }, { session });
            await this.userDehiveServerModel.deleteMany({ server_id: serverId }, { session });
            if (memberIds.length > 0) {
                await this.userDehiveModel.updateMany({ _id: { $in: memberIds } }, { $inc: { server_count: -1 } }, { session });
            }
            await session.commitTransaction();
            return { deleted: true };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Could not delete server and its related data.', error.message);
        }
        finally {
            void session.endSession();
        }
    }
    async createCategory(serverId, actorId, createCategoryDto) {
        const server = await this.findServerById(serverId);
        if (server.owner_id.toString() !== actorId) {
            throw new common_1.ForbiddenException('Only the server owner can create categories.');
        }
        const newCategory = new this.categoryModel({
            ...createCategoryDto,
            server_id: server._id,
        });
        return newCategory.save();
    }
    async findAllCategoriesInServer(serverId) {
        return this.categoryModel.aggregate([
            {
                $match: {
                    server_id: new mongoose_2.Types.ObjectId(serverId),
                },
            },
            {
                $lookup: {
                    from: 'channel',
                    localField: '_id',
                    foreignField: 'category_id',
                    as: 'channels',
                },
            }
        ]);
    }
    async updateCategory(categoryId, actorId, updateCategoryDto) {
        const category = await this.categoryModel.findById(categoryId);
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID "${categoryId}" not found.`);
        }
        const server = await this.findServerById(category.server_id.toString());
        if (server.owner_id.toString() !== actorId) {
            throw new common_1.ForbiddenException('You do not have permission to edit this category.');
        }
        Object.assign(category, updateCategoryDto);
        return category.save();
    }
    async removeCategory(categoryId, actorId) {
        const categoryObjectId = new mongoose_2.Types.ObjectId(categoryId);
        const category = await this.categoryModel.findById(categoryObjectId);
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID "${categoryId}" not found.`);
        }
        const server = await this.findServerById(category.server_id.toString());
        if (server.owner_id.toString() !== actorId) {
            throw new common_1.ForbiddenException('You do not have permission to delete this category.');
        }
        const session = await this.categoryModel.db.startSession();
        session.startTransaction();
        try {
            await this.channelModel.deleteMany({ category_id: categoryObjectId }, { session });
            await this.categoryModel.findByIdAndDelete(categoryObjectId, { session });
            await session.commitTransaction();
            return { deleted: true };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Could not delete category and its channels.', error.message);
        }
        finally {
            void session.endSession();
        }
    }
    async createChannel(serverId, categoryId, actorId, createChannelDto) {
        console.log('🎯 [CREATE CHANNEL] Starting channel creation...');
        console.log('🎯 [CREATE CHANNEL] serverId:', serverId);
        console.log('🎯 [CREATE CHANNEL] categoryId:', categoryId);
        console.log('🎯 [CREATE CHANNEL] actorId:', actorId);
        console.log('🎯 [CREATE CHANNEL] actorId type:', typeof actorId);
        const serverObjectId = new mongoose_2.Types.ObjectId(serverId);
        const categoryObjectId = new mongoose_2.Types.ObjectId(categoryId);
        const actorObjectId = new mongoose_2.Types.ObjectId(actorId);
        console.log('🎯 [CREATE CHANNEL] serverObjectId:', serverObjectId);
        console.log('🎯 [CREATE CHANNEL] categoryObjectId:', categoryObjectId);
        console.log('🎯 [CREATE CHANNEL] actorObjectId:', actorObjectId);
        const [server, category, actorMembership] = await Promise.all([
            this.findServerById(serverId),
            this.categoryModel.findById(categoryObjectId).lean(),
            this.userDehiveServerModel
                .findOne({
                server_id: serverObjectId,
                user_dehive_id: actorObjectId,
            })
                .lean(),
        ]);
        console.log('🎯 [CREATE CHANNEL] server:', server);
        console.log('🎯 [CREATE CHANNEL] server.owner_id:', server.owner_id);
        console.log('🎯 [CREATE CHANNEL] server.owner_id type:', typeof server.owner_id);
        console.log('🎯 [CREATE CHANNEL] category:', category);
        console.log('🎯 [CREATE CHANNEL] actorMembership:', actorMembership);
        if (!category)
            throw new common_1.NotFoundException(`Category with ID ${categoryId} not found.`);
        if (category.server_id.toString() !== serverId)
            throw new common_1.BadRequestException('Category does not belong to this server.');
        const isOwner = server.owner_id.toString() === actorId;
        console.log('🎯 [CREATE CHANNEL] isOwner:', isOwner);
        console.log('🎯 [CREATE CHANNEL] server.owner_id.toString():', server.owner_id.toString());
        console.log('🎯 [CREATE CHANNEL] actorId:', actorId);
        console.log('🎯 [CREATE CHANNEL] owner comparison:', server.owner_id.toString() === actorId);
        const hasPermission = isOwner ||
            (actorMembership &&
                (actorMembership.role === enum_1.ServerRole.OWNER ||
                    actorMembership.role === enum_1.ServerRole.MODERATOR));
        console.log('🎯 [CREATE CHANNEL] hasPermission:', hasPermission);
        console.log('🎯 [CREATE CHANNEL] actorMembership?.role:', actorMembership?.role);
        if (!hasPermission) {
            console.log('❌ [CREATE CHANNEL] Permission denied!');
            console.log('❌ [CREATE CHANNEL] isOwner:', isOwner);
            console.log('❌ [CREATE CHANNEL] actorMembership exists:', !!actorMembership);
            console.log('❌ [CREATE CHANNEL] actorMembership role:', actorMembership?.role);
            throw new common_1.ForbiddenException('Only server owners and moderators can create channels.');
        }
        const newChannel = new this.channelModel({
            ...createChannelDto,
            category_id: categoryObjectId,
        });
        return newChannel.save();
    }
    async findChannelById(channelId) {
        const channel = await this.channelModel.findById(channelId).exec();
        if (!channel) {
            throw new common_1.NotFoundException(`Channel with ID "${channelId}" not found.`);
        }
        return channel;
    }
    async updateChannel(channelId, actorId, updateChannelDto) {
        console.log('🎯 [UPDATE CHANNEL] Starting channel update...');
        console.log('🎯 [UPDATE CHANNEL] channelId:', channelId);
        console.log('🎯 [UPDATE CHANNEL] actorId:', actorId);
        const channel = await this.findChannelById(channelId);
        const category = await this.categoryModel
            .findById(channel.category_id)
            .lean();
        if (!category)
            throw new common_1.NotFoundException('Category containing this channel not found.');
        const server = await this.findServerById(category.server_id.toString());
        console.log('🎯 [UPDATE CHANNEL] server:', server);
        console.log('🎯 [UPDATE CHANNEL] server.owner_id:', server.owner_id);
        const isOwner = server.owner_id.toString() === actorId;
        console.log('🎯 [UPDATE CHANNEL] isOwner:', isOwner);
        const actorMembership = await this.userDehiveServerModel
            .findOne({
            server_id: category.server_id,
            user_dehive_id: new mongoose_2.Types.ObjectId(actorId),
        })
            .lean();
        console.log('🎯 [UPDATE CHANNEL] actorMembership:', actorMembership);
        const hasPermission = isOwner ||
            (actorMembership &&
                (actorMembership.role === enum_1.ServerRole.OWNER ||
                    actorMembership.role === enum_1.ServerRole.MODERATOR));
        console.log('🎯 [UPDATE CHANNEL] hasPermission:', hasPermission);
        if (!hasPermission) {
            console.log('❌ [UPDATE CHANNEL] Permission denied!');
            console.log('❌ [UPDATE CHANNEL] isOwner:', isOwner);
            console.log('❌ [UPDATE CHANNEL] actorMembership exists:', !!actorMembership);
            console.log('❌ [UPDATE CHANNEL] actorMembership role:', actorMembership?.role);
            throw new common_1.ForbiddenException('You do not have permission to edit channels in this server.');
        }
        if (updateChannelDto.category_id) {
            console.log('🎯 [UPDATE CHANNEL] Moving channel to new category...');
            console.log('🎯 [UPDATE CHANNEL] Current category:', category._id);
            console.log('🎯 [UPDATE CHANNEL] New category:', updateChannelDto.category_id);
            const newCategory = await this.categoryModel.findById(updateChannelDto.category_id);
            if (!newCategory) {
                throw new common_1.NotFoundException(`Category with ID "${updateChannelDto.category_id}" not found.`);
            }
            if (newCategory.server_id.toString() !== category.server_id.toString()) {
                throw new common_1.BadRequestException('The new category does not belong to the same server.');
            }
            if (channel.category_id.toString() === updateChannelDto.category_id) {
                throw new common_1.BadRequestException('Channel is already in the specified category.');
            }
            console.log('✅ [UPDATE CHANNEL] Category validation passed');
        }
        const updateData = { ...updateChannelDto };
        if (updateChannelDto.category_id) {
            updateData.category_id = new mongoose_2.Types.ObjectId(updateChannelDto.category_id);
            console.log('🎯 [UPDATE CHANNEL] Converted category_id to ObjectId:', updateData.category_id);
        }
        const updatedChannel = await this.channelModel
            .findByIdAndUpdate(channelId, { $set: updateData }, { new: true })
            .exec();
        if (!updatedChannel) {
            throw new common_1.NotFoundException(`Failed to update channel with ID "${channelId}".`);
        }
        return updatedChannel;
    }
    async removeChannel(channelId, actorId) {
        console.log('🎯 [DELETE CHANNEL] Starting channel deletion...');
        console.log('🎯 [DELETE CHANNEL] channelId:', channelId);
        console.log('🎯 [DELETE CHANNEL] actorId:', actorId);
        const channelObjectId = new mongoose_2.Types.ObjectId(channelId);
        const channel = await this.findChannelById(channelId);
        const category = await this.categoryModel
            .findById(channel.category_id)
            .lean();
        if (!category)
            throw new common_1.NotFoundException('Category containing this channel not found.');
        const server = await this.findServerById(category.server_id.toString());
        console.log('🎯 [DELETE CHANNEL] server:', server);
        console.log('🎯 [DELETE CHANNEL] server.owner_id:', server.owner_id);
        const isOwner = server.owner_id.toString() === actorId;
        console.log('🎯 [DELETE CHANNEL] isOwner:', isOwner);
        const actorMembership = await this.userDehiveServerModel
            .findOne({
            server_id: category.server_id,
            user_dehive_id: new mongoose_2.Types.ObjectId(actorId),
        })
            .lean();
        console.log('🎯 [DELETE CHANNEL] actorMembership:', actorMembership);
        const hasPermission = isOwner ||
            (actorMembership &&
                (actorMembership.role === enum_1.ServerRole.OWNER ||
                    actorMembership.role === enum_1.ServerRole.MODERATOR));
        console.log('🎯 [DELETE CHANNEL] hasPermission:', hasPermission);
        if (!hasPermission) {
            console.log('❌ [DELETE CHANNEL] Permission denied!');
            console.log('❌ [DELETE CHANNEL] isOwner:', isOwner);
            console.log('❌ [DELETE CHANNEL] actorMembership exists:', !!actorMembership);
            console.log('❌ [DELETE CHANNEL] actorMembership role:', actorMembership?.role);
            throw new common_1.ForbiddenException('You do not have permission to delete channels in this server.');
        }
        const session = await this.channelModel.db.startSession();
        session.startTransaction();
        try {
            await this.channelMessageModel.deleteMany({ channel_id: channelObjectId }, { session });
            await this.channelModel.findByIdAndDelete(channelObjectId, { session });
            await session.commitTransaction();
            return { deleted: true };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Could not delete channel and its messages.', error.message);
        }
        finally {
            void session.endSession();
        }
    }
};
exports.ServerService = ServerService;
exports.ServerService = ServerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(server_schema_1.Server.name)),
    __param(1, (0, mongoose_1.InjectModel)(category_schema_1.Category.name)),
    __param(2, (0, mongoose_1.InjectModel)(channel_schema_1.Channel.name)),
    __param(3, (0, mongoose_1.InjectModel)(user_dehive_server_schema_1.UserDehiveServer.name)),
    __param(4, (0, mongoose_1.InjectModel)(user_dehive_schema_1.UserDehive.name)),
    __param(5, (0, mongoose_1.InjectModel)(channel_message_schema_1.ChannelMessage.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, typeof (_b = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _b : Object, typeof (_c = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _c : Object, typeof (_d = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _d : Object, typeof (_e = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _e : Object, typeof (_f = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _f : Object, typeof (_g = typeof axios_1.HttpService !== "undefined" && axios_1.HttpService) === "function" ? _g : Object])
], ServerService);


/***/ }),

/***/ "./apps/user-dehive-server/clients/decode-api.client.ts":
/*!**************************************************************!*\
  !*** ./apps/user-dehive-server/clients/decode-api.client.ts ***!
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
var DecodeApiClient_1;
var _a, _b, _c;
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
    __metadata("design:paramtypes", [typeof (_a = typeof axios_1.HttpService !== "undefined" && axios_1.HttpService) === "function" ? _a : Object, typeof (_b = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _b : Object, typeof (_c = typeof ioredis_2.Redis !== "undefined" && ioredis_2.Redis) === "function" ? _c : Object])
], DecodeApiClient);


/***/ }),

/***/ "./apps/user-dehive-server/common/decorators/current-user.decorator.ts":
/*!*****************************************************************************!*\
  !*** ./apps/user-dehive-server/common/decorators/current-user.decorator.ts ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CurrentUser = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    console.log('🎯 [USER-DEHIVE CURRENT USER] Decorator called with data:', data);
    try {
        const request = ctx
            .switchToHttp()
            .getRequest();
        const user = request.user;
        console.log('🎯 [USER-DEHIVE CURRENT USER] Request user:', user);
        if (data && user) {
            console.log(`🎯 [USER-DEHIVE CURRENT USER] Returning user.${data}:`, user[data]);
            return user[data];
        }
        console.log('🎯 [USER-DEHIVE CURRENT USER] Returning full user:', user);
        return user;
    }
    catch (error) {
        console.error('❌ [USER-DEHIVE CURRENT USER] Error:', error);
        return undefined;
    }
});


/***/ }),

/***/ "./apps/user-dehive-server/common/guards/auth.guard.ts":
/*!*************************************************************!*\
  !*** ./apps/user-dehive-server/common/guards/auth.guard.ts ***!
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthGuard_1;
var _a, _b, _c, _d;
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
        if (!sessionId) {
            throw new common_1.UnauthorizedException('Session ID is required');
        }
        try {
            const sessionKey = `session:${sessionId}`;
            const cachedSessionRaw = await this.redis.get(sessionKey);
            if (cachedSessionRaw) {
                const cachedSession = JSON.parse(cachedSessionRaw);
                if (cachedSession.user) {
                    const authenticatedUser = { ...cachedSession.user, session_id: sessionId };
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
            const authenticatedUser = { ...userProfile, session_id: sessionId };
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
    __metadata("design:paramtypes", [typeof (_a = typeof axios_1.HttpService !== "undefined" && axios_1.HttpService) === "function" ? _a : Object, typeof (_b = typeof core_1.Reflector !== "undefined" && core_1.Reflector) === "function" ? _b : Object, typeof (_c = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _c : Object, typeof (_d = typeof ioredis_2.Redis !== "undefined" && ioredis_2.Redis) === "function" ? _d : Object])
], AuthGuard);


/***/ }),

/***/ "./apps/user-dehive-server/dto/assign-role.dto.ts":
/*!********************************************************!*\
  !*** ./apps/user-dehive-server/dto/assign-role.dto.ts ***!
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
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AssignRoleDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/user-dehive-server/enum/enum.ts");
class AssignRoleDto {
    server_id;
    target_user_dehive_id;
    role;
}
exports.AssignRoleDto = AssignRoleDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the server.',
        example: '68c5adb6ec465897d540c58',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], AssignRoleDto.prototype, "server_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The user_dehive_id of the target user to assign role.',
        example: '68c5adb6ec465897d540c58',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], AssignRoleDto.prototype, "target_user_dehive_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The new role to assign.',
        enum: enum_1.ServerRole,
        example: enum_1.ServerRole.MODERATOR,
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(enum_1.ServerRole),
    __metadata("design:type", typeof (_a = typeof enum_1.ServerRole !== "undefined" && enum_1.ServerRole) === "function" ? _a : Object)
], AssignRoleDto.prototype, "role", void 0);


/***/ }),

/***/ "./apps/user-dehive-server/dto/generate-invite.dto.ts":
/*!************************************************************!*\
  !*** ./apps/user-dehive-server/dto/generate-invite.dto.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GenerateInviteDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class GenerateInviteDto {
    server_id;
}
exports.GenerateInviteDto = GenerateInviteDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the server to create an invite for.',
        example: '68c5adb6ec465897d540c58',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], GenerateInviteDto.prototype, "server_id", void 0);


/***/ }),

/***/ "./apps/user-dehive-server/dto/get-server-members.dto.ts":
/*!***************************************************************!*\
  !*** ./apps/user-dehive-server/dto/get-server-members.dto.ts ***!
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
exports.GetServerMembersDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class GetServerMembersDto {
    serverId;
}
exports.GetServerMembersDto = GetServerMembersDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the server to get members from',
        example: '68e09f0f8f924bd8b03d957a',
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'server_id should not be empty' }),
    (0, class_validator_1.IsMongoId)({ message: 'server_id must be a mongodb id' }),
    __metadata("design:type", String)
], GetServerMembersDto.prototype, "serverId", void 0);


/***/ }),

/***/ "./apps/user-dehive-server/dto/join-server.dto.ts":
/*!********************************************************!*\
  !*** ./apps/user-dehive-server/dto/join-server.dto.ts ***!
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
exports.JoinServerDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class JoinServerDto {
    server_id;
}
exports.JoinServerDto = JoinServerDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the server to join.',
        example: '68c5adb6ec465897d540c58',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], JoinServerDto.prototype, "server_id", void 0);


/***/ }),

/***/ "./apps/user-dehive-server/dto/kick-ban.dto.ts":
/*!*****************************************************!*\
  !*** ./apps/user-dehive-server/dto/kick-ban.dto.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KickBanDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class KickBanDto {
    server_id;
    target_user_dehive_id;
    reason;
}
exports.KickBanDto = KickBanDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the server.',
        example: '68c5adb6ec465897d540c58',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], KickBanDto.prototype, "server_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The user_dehive_id of the target user to kick/ban.',
        example: '68c5adb6ec465897d540c58',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], KickBanDto.prototype, "target_user_dehive_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The reason for the action (optional).',
        example: 'Breaking rule #3.',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], KickBanDto.prototype, "reason", void 0);


/***/ }),

/***/ "./apps/user-dehive-server/dto/transfer-ownership.dto.ts":
/*!***************************************************************!*\
  !*** ./apps/user-dehive-server/dto/transfer-ownership.dto.ts ***!
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
exports.TransferOwnershipDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class TransferOwnershipDto {
    server_id;
    user_dehive_id;
}
exports.TransferOwnershipDto = TransferOwnershipDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the server.',
        example: '68c5adb6ec465897d540c58',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], TransferOwnershipDto.prototype, "server_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The user_dehive_id of the new owner to transfer ownership to.',
        example: '68c5adb6ec465897d540c58',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], TransferOwnershipDto.prototype, "user_dehive_id", void 0);


/***/ }),

/***/ "./apps/user-dehive-server/dto/unban.dto.ts":
/*!**************************************************!*\
  !*** ./apps/user-dehive-server/dto/unban.dto.ts ***!
  \**************************************************/
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
exports.UnbanDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class UnbanDto {
    server_id;
    target_user_dehive_id;
}
exports.UnbanDto = UnbanDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the server.',
        example: '68c5adb6ec465897d540c58',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], UnbanDto.prototype, "server_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The user_dehive_id of the user to unban.',
        example: '68c5adb6ec465897d540c58',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], UnbanDto.prototype, "target_user_dehive_id", void 0);


/***/ }),

/***/ "./apps/user-dehive-server/dto/update-notification.dto.ts":
/*!****************************************************************!*\
  !*** ./apps/user-dehive-server/dto/update-notification.dto.ts ***!
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
exports.UpdateNotificationDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class UpdateNotificationDto {
    server_id;
    is_muted;
}
exports.UpdateNotificationDto = UpdateNotificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the server where notification settings are being changed.',
        example: '68c5adb6ec465897d540c58',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], UpdateNotificationDto.prototype, "server_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The new mute status.', example: true }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateNotificationDto.prototype, "is_muted", void 0);


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

/***/ "./apps/user-dehive-server/interfaces/authenticated-user.interface.ts":
/*!****************************************************************************!*\
  !*** ./apps/user-dehive-server/interfaces/authenticated-user.interface.ts ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));


/***/ }),

/***/ "./apps/user-dehive-server/schemas/invite-link.schema.ts":
/*!***************************************************************!*\
  !*** ./apps/user-dehive-server/schemas/invite-link.schema.ts ***!
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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InviteLinkSchema = exports.InviteLink = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let InviteLink = class InviteLink {
    code;
    server_id;
    expiredAt;
    creator_id;
    isUsed;
};
exports.InviteLink = InviteLink;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], InviteLink.prototype, "code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true, ref: 'Server' }),
    __metadata("design:type", typeof (_a = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _a : Object)
], InviteLink.prototype, "server_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], InviteLink.prototype, "expiredAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true, ref: 'UserDehive' }),
    __metadata("design:type", typeof (_c = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _c : Object)
], InviteLink.prototype, "creator_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], InviteLink.prototype, "isUsed", void 0);
exports.InviteLink = InviteLink = __decorate([
    (0, mongoose_1.Schema)({ collection: 'invite_link', timestamps: true })
], InviteLink);
exports.InviteLinkSchema = mongoose_1.SchemaFactory.createForClass(InviteLink);


/***/ }),

/***/ "./apps/user-dehive-server/schemas/server-audit-log.schema.ts":
/*!********************************************************************!*\
  !*** ./apps/user-dehive-server/schemas/server-audit-log.schema.ts ***!
  \********************************************************************/
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
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ServerAuditLogSchema = exports.ServerAuditLog = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/user-dehive-server/enum/enum.ts");
let ServerAuditLog = class ServerAuditLog {
    server_id;
    actor_id;
    target_id;
    action;
    changes;
    reason;
};
exports.ServerAuditLog = ServerAuditLog;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Server', required: true }),
    __metadata("design:type", typeof (_a = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _a : Object)
], ServerAuditLog.prototype, "server_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'UserDehive', required: true }),
    __metadata("design:type", typeof (_b = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _b : Object)
], ServerAuditLog.prototype, "actor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'UserDehive', required: false }),
    __metadata("design:type", typeof (_c = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _c : Object)
], ServerAuditLog.prototype, "target_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(enum_1.AuditLogAction), required: true }),
    __metadata("design:type", typeof (_d = typeof enum_1.AuditLogAction !== "undefined" && enum_1.AuditLogAction) === "function" ? _d : Object)
], ServerAuditLog.prototype, "action", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: false }),
    __metadata("design:type", typeof (_e = typeof Record !== "undefined" && Record) === "function" ? _e : Object)
], ServerAuditLog.prototype, "changes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", String)
], ServerAuditLog.prototype, "reason", void 0);
exports.ServerAuditLog = ServerAuditLog = __decorate([
    (0, mongoose_1.Schema)({ collection: 'server_audit_log', timestamps: true })
], ServerAuditLog);
exports.ServerAuditLogSchema = mongoose_1.SchemaFactory.createForClass(ServerAuditLog);


/***/ }),

/***/ "./apps/user-dehive-server/schemas/server-ban.schema.ts":
/*!**************************************************************!*\
  !*** ./apps/user-dehive-server/schemas/server-ban.schema.ts ***!
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
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ServerBanSchema = exports.ServerBan = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let ServerBan = class ServerBan {
    server_id;
    user_dehive_id;
    banned_by;
    reason;
    expires_at;
};
exports.ServerBan = ServerBan;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Server', required: true }),
    __metadata("design:type", typeof (_a = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _a : Object)
], ServerBan.prototype, "server_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'UserDehive', required: true }),
    __metadata("design:type", typeof (_b = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _b : Object)
], ServerBan.prototype, "user_dehive_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'UserDehive', required: true }),
    __metadata("design:type", typeof (_c = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _c : Object)
], ServerBan.prototype, "banned_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], ServerBan.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: false }),
    __metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], ServerBan.prototype, "expires_at", void 0);
exports.ServerBan = ServerBan = __decorate([
    (0, mongoose_1.Schema)({ collection: 'server_ban', timestamps: true })
], ServerBan);
exports.ServerBanSchema = mongoose_1.SchemaFactory.createForClass(ServerBan);
exports.ServerBanSchema.index({ server_id: 1, user_dehive_id: 1 }, { unique: true });


/***/ }),

/***/ "./apps/user-dehive-server/schemas/server.schema.ts":
/*!**********************************************************!*\
  !*** ./apps/user-dehive-server/schemas/server.schema.ts ***!
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
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ServerSchema = exports.Server = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let Server = class Server {
    name;
    description;
    owner_id;
    member_count;
    is_private;
    tags;
};
exports.Server = Server;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Server.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Server.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'UserDehive', required: true }),
    __metadata("design:type", typeof (_a = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _a : Object)
], Server.prototype, "owner_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Server.prototype, "member_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Server.prototype, "is_private", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Server.prototype, "tags", void 0);
exports.Server = Server = __decorate([
    (0, mongoose_1.Schema)({ collection: 'server', timestamps: true })
], Server);
exports.ServerSchema = mongoose_1.SchemaFactory.createForClass(Server);


/***/ }),

/***/ "./apps/user-dehive-server/schemas/user-dehive-server.schema.ts":
/*!**********************************************************************!*\
  !*** ./apps/user-dehive-server/schemas/user-dehive-server.schema.ts ***!
  \**********************************************************************/
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
exports.UserDehiveServerSchema = exports.UserDehiveServer = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/user-dehive-server/enum/enum.ts");
let UserDehiveServer = class UserDehiveServer {
    user_dehive_id;
    server_id;
    role;
    is_muted;
    is_banned;
    joined_at;
};
exports.UserDehiveServer = UserDehiveServer;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'UserDehive',
        required: true,
        index: true,
    }),
    __metadata("design:type", typeof (_a = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _a : Object)
], UserDehiveServer.prototype, "user_dehive_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Server', required: true, index: true }),
    __metadata("design:type", typeof (_b = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _b : Object)
], UserDehiveServer.prototype, "server_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: enum_1.ServerRole, default: enum_1.ServerRole.MEMBER }),
    __metadata("design:type", typeof (_c = typeof enum_1.ServerRole !== "undefined" && enum_1.ServerRole) === "function" ? _c : Object)
], UserDehiveServer.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], UserDehiveServer.prototype, "is_muted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], UserDehiveServer.prototype, "is_banned", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], UserDehiveServer.prototype, "joined_at", void 0);
exports.UserDehiveServer = UserDehiveServer = __decorate([
    (0, mongoose_1.Schema)({ collection: 'user_dehive_server', timestamps: true })
], UserDehiveServer);
exports.UserDehiveServerSchema = mongoose_1.SchemaFactory.createForClass(UserDehiveServer);
exports.UserDehiveServerSchema.index({
    user_dehive_id: 1,
    server_id: 1,
}, { unique: true });


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
var _a, _b;
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

/***/ "./apps/user-dehive-server/src/user-dehive-server.controller.ts":
/*!**********************************************************************!*\
  !*** ./apps/user-dehive-server/src/user-dehive-server.controller.ts ***!
  \**********************************************************************/
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
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserDehiveServerController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const user_dehive_server_service_1 = __webpack_require__(/*! ./user-dehive-server.service */ "./apps/user-dehive-server/src/user-dehive-server.service.ts");
const assign_role_dto_1 = __webpack_require__(/*! ../dto/assign-role.dto */ "./apps/user-dehive-server/dto/assign-role.dto.ts");
const transfer_ownership_dto_1 = __webpack_require__(/*! ../dto/transfer-ownership.dto */ "./apps/user-dehive-server/dto/transfer-ownership.dto.ts");
const generate_invite_dto_1 = __webpack_require__(/*! ../dto/generate-invite.dto */ "./apps/user-dehive-server/dto/generate-invite.dto.ts");
const join_server_dto_1 = __webpack_require__(/*! ../dto/join-server.dto */ "./apps/user-dehive-server/dto/join-server.dto.ts");
const kick_ban_dto_1 = __webpack_require__(/*! ../dto/kick-ban.dto */ "./apps/user-dehive-server/dto/kick-ban.dto.ts");
const unban_dto_1 = __webpack_require__(/*! ../dto/unban.dto */ "./apps/user-dehive-server/dto/unban.dto.ts");
const update_notification_dto_1 = __webpack_require__(/*! ../dto/update-notification.dto */ "./apps/user-dehive-server/dto/update-notification.dto.ts");
const get_server_members_dto_1 = __webpack_require__(/*! ../dto/get-server-members.dto */ "./apps/user-dehive-server/dto/get-server-members.dto.ts");
const auth_guard_1 = __webpack_require__(/*! ../common/guards/auth.guard */ "./apps/user-dehive-server/common/guards/auth.guard.ts");
const current_user_decorator_1 = __webpack_require__(/*! ../common/decorators/current-user.decorator */ "./apps/user-dehive-server/common/decorators/current-user.decorator.ts");
const authenticated_user_interface_1 = __webpack_require__(/*! ../interfaces/authenticated-user.interface */ "./apps/user-dehive-server/interfaces/authenticated-user.interface.ts");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
let UserDehiveServerController = class UserDehiveServerController {
    service;
    constructor(service) {
        this.service = service;
    }
    joinServer(dto, _id) {
        return this.service.joinServer(dto, _id);
    }
    leaveServer(serverId, _id) {
        const dto = {
            server_id: serverId,
        };
        return this.service.leaveServer(dto, _id);
    }
    generateInvite(dto, actorBaseId) {
        return this.service.generateInvite(dto, actorBaseId);
    }
    useInvite(code, actorBaseId) {
        return this.service.useInvite(code, actorBaseId);
    }
    kickMember(dto, actorBaseId) {
        return this.service.kickOrBan(dto, 'kick', actorBaseId);
    }
    banMember(dto, actorBaseId) {
        return this.service.kickOrBan(dto, 'ban', actorBaseId);
    }
    unbanMember(dto, actorBaseId) {
        return this.service.unbanMember(dto, actorBaseId);
    }
    assignRole(dto, actorBaseId) {
        return this.service.assignRole(dto, actorBaseId);
    }
    transferOwnership(dto, currentOwnerId) {
        return this.service.transferOwnership(dto, currentOwnerId);
    }
    updateNotification(dto, actorBaseId) {
        return this.service.updateNotification(dto, actorBaseId);
    }
    getMembersInServer(params, user) {
        return this.service.getMembersInServer(params.serverId, user);
    }
    getEnrichedUserProfile(targetUserId, currentUser) {
        return this.service.getEnrichedUserProfile(targetUserId, currentUser);
    }
};
exports.UserDehiveServerController = UserDehiveServerController;
__decorate([
    (0, common_1.Post)('join'),
    (0, swagger_1.ApiOperation)({
        summary: 'Join a server',
        description: 'Allows a user to become a member of a server.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Successfully joined the server.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Bad Request (e.g., already a member).',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (e.g., user is banned).',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Server or Dehive Profile not found.',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof join_server_dto_1.JoinServerDto !== "undefined" && join_server_dto_1.JoinServerDto) === "function" ? _b : Object, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "joinServer", null);
__decorate([
    (0, common_1.Delete)('server/:serverId/leave'),
    (0, swagger_1.ApiOperation)({
        summary: 'Leave a server',
        description: 'Allows a user to leave a server they are a member of.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'serverId', description: 'The ID of the server to leave' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Successfully left the server.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (e.g., owner cannot leave).',
    }),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "leaveServer", null);
__decorate([
    (0, common_1.Post)('invite/generate'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate an invite link',
        description: 'Generates a new invite link for a server.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Invite link created successfully.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (e.g., user is not a member).',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof generate_invite_dto_1.GenerateInviteDto !== "undefined" && generate_invite_dto_1.GenerateInviteDto) === "function" ? _c : Object, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "generateInvite", null);
__decorate([
    (0, common_1.Post)('invite/use/:code'),
    (0, swagger_1.ApiOperation)({
        summary: 'Use an invite link',
        description: 'Allows a user to join a server using an invite code.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiParam)({ name: 'code', description: 'The unique invite code' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Successfully joined the server via invite.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Invite link is invalid or has expired.',
    }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "useInvite", null);
__decorate([
    (0, common_1.Post)('kick'),
    (0, swagger_1.ApiOperation)({
        summary: 'Kick a member',
        description: 'Kicks a member from a server. Requires moderator or owner permissions.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User successfully kicked.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (insufficient permissions).',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof kick_ban_dto_1.KickBanDto !== "undefined" && kick_ban_dto_1.KickBanDto) === "function" ? _d : Object, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "kickMember", null);
__decorate([
    (0, common_1.Post)('ban'),
    (0, swagger_1.ApiOperation)({
        summary: 'Ban a member',
        description: 'Bans a member from a server. Requires moderator or owner permissions.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User successfully banned.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (insufficient permissions).',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_e = typeof kick_ban_dto_1.KickBanDto !== "undefined" && kick_ban_dto_1.KickBanDto) === "function" ? _e : Object, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "banMember", null);
__decorate([
    (0, common_1.Post)('unban'),
    (0, swagger_1.ApiOperation)({
        summary: 'Unban a member',
        description: 'Unbans a previously banned member. Requires moderator or owner permissions.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User successfully unbanned.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Ban record not found.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_f = typeof unban_dto_1.UnbanDto !== "undefined" && unban_dto_1.UnbanDto) === "function" ? _f : Object, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "unbanMember", null);
__decorate([
    (0, common_1.Patch)('role'),
    (0, swagger_1.ApiOperation)({
        summary: 'Assign a role to a member',
        description: 'Changes role of member. Requires owner permissions.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Role updated successfully.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (only owner can assign roles).',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_g = typeof assign_role_dto_1.AssignRoleDto !== "undefined" && assign_role_dto_1.AssignRoleDto) === "function" ? _g : Object, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "assignRole", null);
__decorate([
    (0, common_1.Patch)('transfer-ownership'),
    (0, swagger_1.ApiOperation)({
        summary: 'Transfer server ownership',
        description: 'Transfers ownership of server to another member. Only current owner can do this.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of current owner',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ownership transferred successfully.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden (only current owner can transfer ownership).',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'New owner is not a member of this server.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Bad Request (e.g., cannot transfer to yourself).',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_h = typeof transfer_ownership_dto_1.TransferOwnershipDto !== "undefined" && transfer_ownership_dto_1.TransferOwnershipDto) === "function" ? _h : Object, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "transferOwnership", null);
__decorate([
    (0, common_1.Patch)('notification'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update notification settings',
        description: 'Mutes or unmutes notifications for a user in a specific server.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'x-session-id',
        description: 'Session ID of authenticated user',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Notification settings updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Membership not found.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_j = typeof update_notification_dto_1.UpdateNotificationDto !== "undefined" && update_notification_dto_1.UpdateNotificationDto) === "function" ? _j : Object, String]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "updateNotification", null);
__decorate([
    (0, common_1.Get)('server/:serverId/members'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all members in a server',
        description: 'Retrieves a list of all members for a specific server.',
    }),
    (0, swagger_1.ApiHeader)({ name: 'x-session-id', required: true }),
    (0, swagger_1.ApiParam)({ name: 'serverId', description: 'The ID of the server' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns a list of members.' }),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_k = typeof get_server_members_dto_1.GetServerMembersDto !== "undefined" && get_server_members_dto_1.GetServerMembersDto) === "function" ? _k : Object, typeof (_l = typeof authenticated_user_interface_1.AuthenticatedUser !== "undefined" && authenticated_user_interface_1.AuthenticatedUser) === "function" ? _l : Object]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "getMembersInServer", null);
__decorate([
    (0, common_1.Get)('profile/:userId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get enriched user profile',
        description: 'Retrieves a full user profile, including mutual servers, from the perspective of the current user.',
    }),
    (0, swagger_1.ApiHeader)({ name: 'x-session-id', required: true }),
    (0, swagger_1.ApiParam)({ name: '_id', description: 'The ID of the user profile to view' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the enriched user profile.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found.' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_m = typeof authenticated_user_interface_1.AuthenticatedUser !== "undefined" && authenticated_user_interface_1.AuthenticatedUser) === "function" ? _m : Object]),
    __metadata("design:returntype", void 0)
], UserDehiveServerController.prototype, "getEnrichedUserProfile", null);
exports.UserDehiveServerController = UserDehiveServerController = __decorate([
    (0, swagger_1.ApiTags)('Memberships & Profiles'),
    (0, common_1.Controller)('memberships'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [typeof (_a = typeof user_dehive_server_service_1.UserDehiveServerService !== "undefined" && user_dehive_server_service_1.UserDehiveServerService) === "function" ? _a : Object])
], UserDehiveServerController);


/***/ }),

/***/ "./apps/user-dehive-server/src/user-dehive-server.module.ts":
/*!******************************************************************!*\
  !*** ./apps/user-dehive-server/src/user-dehive-server.module.ts ***!
  \******************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserDehiveServerModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const ioredis_1 = __webpack_require__(/*! @nestjs-modules/ioredis */ "@nestjs-modules/ioredis");
const user_dehive_server_controller_1 = __webpack_require__(/*! ./user-dehive-server.controller */ "./apps/user-dehive-server/src/user-dehive-server.controller.ts");
const user_dehive_server_service_1 = __webpack_require__(/*! ./user-dehive-server.service */ "./apps/user-dehive-server/src/user-dehive-server.service.ts");
const decode_api_client_1 = __webpack_require__(/*! ../clients/decode-api.client */ "./apps/user-dehive-server/clients/decode-api.client.ts");
const user_dehive_schema_1 = __webpack_require__(/*! ../schemas/user-dehive.schema */ "./apps/user-dehive-server/schemas/user-dehive.schema.ts");
const server_schema_1 = __webpack_require__(/*! ../schemas/server.schema */ "./apps/user-dehive-server/schemas/server.schema.ts");
const invite_link_schema_1 = __webpack_require__(/*! ../schemas/invite-link.schema */ "./apps/user-dehive-server/schemas/invite-link.schema.ts");
const server_audit_log_schema_1 = __webpack_require__(/*! ../schemas/server-audit-log.schema */ "./apps/user-dehive-server/schemas/server-audit-log.schema.ts");
const server_ban_schema_1 = __webpack_require__(/*! ../schemas/server-ban.schema */ "./apps/user-dehive-server/schemas/server-ban.schema.ts");
const user_dehive_server_schema_1 = __webpack_require__(/*! ../schemas/user-dehive-server.schema */ "./apps/user-dehive-server/schemas/user-dehive-server.schema.ts");
const auth_guard_1 = __webpack_require__(/*! ../common/guards/auth.guard */ "./apps/user-dehive-server/common/guards/auth.guard.ts");
const MONGOOSE_MODELS = mongoose_1.MongooseModule.forFeature([
    { name: 'UserDehive', schema: user_dehive_schema_1.UserDehiveSchema },
    { name: 'UserDehiveServer', schema: user_dehive_server_schema_1.UserDehiveServerSchema },
    { name: 'Server', schema: server_schema_1.ServerSchema },
    { name: 'ServerBan', schema: server_ban_schema_1.ServerBanSchema },
    { name: 'InviteLink', schema: invite_link_schema_1.InviteLinkSchema },
]);
let UserDehiveServerModule = class UserDehiveServerModule {
};
exports.UserDehiveServerModule = UserDehiveServerModule;
exports.UserDehiveServerModule = UserDehiveServerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            axios_1.HttpModule.register({
                timeout: 5000,
                maxRedirects: 5,
            }),
            ioredis_1.RedisModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    type: 'single',
                    url: config.get('REDIS_URI'),
                }),
                inject: [config_1.ConfigService],
            }),
            MONGOOSE_MODELS,
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    uri: configService.get('MONGODB_URI'),
                    dbName: 'dehive_db',
                }),
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: user_dehive_schema_1.UserDehive.name, schema: user_dehive_schema_1.UserDehiveSchema },
                { name: server_schema_1.Server.name, schema: server_schema_1.ServerSchema },
                { name: invite_link_schema_1.InviteLink.name, schema: invite_link_schema_1.InviteLinkSchema },
                { name: server_audit_log_schema_1.ServerAuditLog.name, schema: server_audit_log_schema_1.ServerAuditLogSchema },
                { name: server_ban_schema_1.ServerBan.name, schema: server_ban_schema_1.ServerBanSchema },
                { name: user_dehive_server_schema_1.UserDehiveServer.name, schema: user_dehive_server_schema_1.UserDehiveServerSchema },
            ]),
        ],
        controllers: [user_dehive_server_controller_1.UserDehiveServerController],
        providers: [
            user_dehive_server_service_1.UserDehiveServerService,
            decode_api_client_1.DecodeApiClient,
            auth_guard_1.AuthGuard,
        ],
        exports: [user_dehive_server_service_1.UserDehiveServerService, MONGOOSE_MODELS],
    })
], UserDehiveServerModule);


/***/ }),

/***/ "./apps/user-dehive-server/src/user-dehive-server.service.ts":
/*!*******************************************************************!*\
  !*** ./apps/user-dehive-server/src/user-dehive-server.service.ts ***!
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserDehiveServerService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
const user_dehive_schema_1 = __webpack_require__(/*! ../schemas/user-dehive.schema */ "./apps/user-dehive-server/schemas/user-dehive.schema.ts");
const user_dehive_server_schema_1 = __webpack_require__(/*! ../schemas/user-dehive-server.schema */ "./apps/user-dehive-server/schemas/user-dehive-server.schema.ts");
const server_schema_1 = __webpack_require__(/*! ../schemas/server.schema */ "./apps/user-dehive-server/schemas/server.schema.ts");
const server_ban_schema_1 = __webpack_require__(/*! ../schemas/server-ban.schema */ "./apps/user-dehive-server/schemas/server-ban.schema.ts");
const invite_link_schema_1 = __webpack_require__(/*! ../schemas/invite-link.schema */ "./apps/user-dehive-server/schemas/invite-link.schema.ts");
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/user-dehive-server/enum/enum.ts");
const ioredis_1 = __webpack_require__(/*! @nestjs-modules/ioredis */ "@nestjs-modules/ioredis");
const ioredis_2 = __webpack_require__(/*! ioredis */ "ioredis");
const decode_api_client_1 = __webpack_require__(/*! ../clients/decode-api.client */ "./apps/user-dehive-server/clients/decode-api.client.ts");
let UserDehiveServerService = class UserDehiveServerService {
    userDehiveModel;
    userDehiveServerModel;
    serverModel;
    serverBanModel;
    inviteLinkModel;
    decodeApiClient;
    redis;
    constructor(userDehiveModel, userDehiveServerModel, serverModel, serverBanModel, inviteLinkModel, decodeApiClient, redis) {
        this.userDehiveModel = userDehiveModel;
        this.userDehiveServerModel = userDehiveServerModel;
        this.serverModel = serverModel;
        this.serverBanModel = serverBanModel;
        this.inviteLinkModel = inviteLinkModel;
        this.decodeApiClient = decodeApiClient;
        this.redis = redis;
    }
    async findUserDehiveProfile(userId) {
        return await this.userDehiveModel.findById(userId).lean();
    }
    async joinServer(dto, userId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        const userDehiveId = userId;
        const userDehiveProfile = await this.userDehiveModel
            .findById(userId)
            .lean();
        if (!userDehiveProfile) {
            throw new common_1.NotFoundException('UserDehive profile not found.');
        }
        const isBannedFromServer = userDehiveProfile.banned_by_servers?.includes(serverId.toString());
        const [server, isAlreadyMember] = await Promise.all([
            this.serverModel.findById(serverId).lean(),
            this.userDehiveServerModel.exists({
                user_dehive_id: userDehiveId,
                server_id: serverId,
            }),
        ]);
        if (!server)
            throw new common_1.NotFoundException(`Server not found.`);
        if (isAlreadyMember)
            throw new common_1.BadRequestException('User is already a member.');
        if (isBannedFromServer)
            throw new common_1.ForbiddenException('You are banned from this server.');
        const session = await this.serverModel.db.startSession();
        session.startTransaction();
        try {
            const newMembership = new this.userDehiveServerModel({
                user_dehive_id: userDehiveId,
                server_id: serverId,
            });
            await newMembership.save({ session });
            await this.userDehiveModel.findByIdAndUpdate(userDehiveId, { $inc: { server_count: 1 } }, { session });
            await this.serverModel.findByIdAndUpdate(serverId, { $inc: { member_count: 1 } }, { session });
            await session.commitTransaction();
            await this.invalidateMemberListCache(dto.server_id);
            return { message: 'Successfully joined server.' };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Failed to join server.');
        }
        finally {
            void session.endSession();
        }
    }
    async leaveServer(dto, userId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        const userDehive = await this.findUserDehiveProfile(userId);
        if (!userDehive) {
            throw new common_1.NotFoundException('UserDehive profile not found.');
        }
        const userDehiveId = userId;
        const membership = await this.userDehiveServerModel.findOne({
            user_dehive_id: userDehiveId,
            server_id: serverId,
        });
        if (!membership)
            throw new common_1.BadRequestException('User is not a member of this server.');
        if (membership.role === enum_1.ServerRole.OWNER)
            throw new common_1.ForbiddenException('Server owner cannot leave. Transfer ownership first.');
        const session = await this.userDehiveServerModel.db.startSession();
        session.startTransaction();
        try {
            await this.userDehiveServerModel
                .deleteOne({ _id: membership._id })
                .session(session);
            await this.userDehiveModel.findByIdAndUpdate(userDehiveId, { $inc: { server_count: -1 } }, { session });
            await this.serverModel.findByIdAndUpdate(serverId, { $inc: { member_count: -1 } }, { session });
            await session.commitTransaction();
            await this.invalidateMemberListCache(dto.server_id);
            return { message: 'Successfully left server.' };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Failed to leave server.');
        }
        finally {
            void session.endSession();
        }
    }
    async generateInvite(dto, actorBaseId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        const actorDehiveProfile = await this.userDehiveModel
            .findById(actorBaseId)
            .select('_id')
            .lean();
        if (!actorDehiveProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for actor.`);
        const actorDehiveId = actorDehiveProfile._id;
        const isMember = await this.userDehiveServerModel.exists({
            server_id: serverId,
            user_dehive_id: actorBaseId,
        });
        if (!isMember)
            throw new common_1.ForbiddenException('Only server members can generate invites.');
        const { customAlphabet } = await Promise.resolve().then(() => __webpack_require__(/*! nanoid */ "nanoid"));
        const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890', 10);
        const code = nanoid();
        const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const newInvite = new this.inviteLinkModel({
            code,
            server_id: serverId,
            creator_id: actorDehiveId,
            expiredAt,
        });
        return newInvite.save();
    }
    async useInvite(code, actorBaseId) {
        const invite = await this.inviteLinkModel.findOne({ code });
        if (!invite || invite.expiredAt < new Date())
            throw new common_1.NotFoundException('Invite link is invalid or has expired.');
        return this.joinServer({
            server_id: invite.server_id.toString(),
        }, actorBaseId);
    }
    async kickOrBan(dto, action, actorBaseId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        console.log('🎯 [KICK/BAN] target_user_dehive_id:', dto.target_user_dehive_id);
        const targetDehiveId = new mongoose_2.Types.ObjectId(dto.target_user_dehive_id);
        console.log('🎯 [KICK/BAN] targetDehiveId resolved:', targetDehiveId);
        const actorDehiveProfile = await this.userDehiveModel
            .findById(actorBaseId)
            .select('_id')
            .lean();
        if (!actorDehiveProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for actor.`);
        const actorDehiveId = actorDehiveProfile._id;
        console.log('🎯 [KICK/BAN] serverId:', serverId);
        console.log('🎯 [KICK/BAN] targetDehiveId:', targetDehiveId);
        console.log('🎯 [KICK/BAN] actorDehiveId:', actorDehiveId);
        console.log('🔍 [KICK/BAN] Querying for targetMembership with:');
        console.log('🔍 [KICK/BAN] - server_id:', serverId);
        console.log('🔍 [KICK/BAN] - user_dehive_id:', targetDehiveId);
        console.log('🔍 [KICK/BAN] - server_id type:', typeof serverId);
        console.log('🔍 [KICK/BAN] - user_dehive_id type:', typeof targetDehiveId);
        const allMemberships = await this.userDehiveServerModel.find({
            server_id: serverId,
        }).lean();
        console.log('🔍 [KICK/BAN] All memberships in server:', allMemberships.length);
        console.log('🔍 [KICK/BAN] All user_dehive_ids in server:', allMemberships.map(m => m.user_dehive_id.toString()));
        console.log('🔍 [KICK/BAN] Looking for targetDehiveId:', targetDehiveId.toString());
        console.log('🔍 [KICK/BAN] Looking for actorDehiveId:', actorDehiveId.toString());
        const [targetMembership, actorMembership] = await Promise.all([
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                $or: [
                    { user_dehive_id: targetDehiveId },
                    { user_dehive_id: targetDehiveId.toString() }
                ]
            }).lean(),
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                $or: [
                    { user_dehive_id: actorDehiveId },
                    { user_dehive_id: actorDehiveId.toString() }
                ]
            }).lean(),
        ]);
        console.log('🔍 [KICK/BAN] targetMembership found:', !!targetMembership);
        console.log('🔍 [KICK/BAN] actorMembership found:', !!actorMembership);
        if (targetMembership) {
            console.log('🔍 [KICK/BAN] targetMembership data:', JSON.stringify(targetMembership, null, 2));
        }
        if (actorMembership) {
            console.log('🔍 [KICK/BAN] actorMembership data:', JSON.stringify(actorMembership, null, 2));
        }
        if (!targetMembership)
            throw new common_1.NotFoundException('Target user is not a member of this server.');
        if (!actorMembership)
            throw new common_1.ForbiddenException('You are not a member of this server.');
        if (actorDehiveId.toString() === targetDehiveId.toString())
            throw new common_1.BadRequestException('You cannot perform this action on yourself.');
        const hasPermission = actorMembership.role === enum_1.ServerRole.OWNER ||
            actorMembership.role === enum_1.ServerRole.MODERATOR;
        if (!hasPermission)
            throw new common_1.ForbiddenException('You do not have permission.');
        if (targetMembership.role === enum_1.ServerRole.OWNER)
            throw new common_1.ForbiddenException('Cannot kick or ban the server owner.');
        if (targetMembership.role === enum_1.ServerRole.MODERATOR &&
            actorMembership.role !== enum_1.ServerRole.OWNER)
            throw new common_1.ForbiddenException('Moderators cannot kick or ban other moderators.');
        const session = await this.userDehiveServerModel.db.startSession();
        session.startTransaction();
        try {
            await this.userDehiveServerModel
                .deleteOne({ _id: targetMembership._id })
                .session(session);
            await this.userDehiveModel.findByIdAndUpdate(targetDehiveId, { $inc: { server_count: -1 } }, { session });
            await this.serverModel.findByIdAndUpdate(serverId, { $inc: { member_count: -1 } }, { session });
            if (action === 'ban') {
                await this.userDehiveModel.findByIdAndUpdate(targetDehiveId, {
                    $addToSet: { banned_by_servers: serverId.toString() },
                    $set: { is_banned: true },
                }, { session });
                await this.serverBanModel.create([
                    {
                        server_id: serverId,
                        user_dehive_id: targetDehiveId,
                        banned_by: actorDehiveId,
                        reason: dto.reason,
                    },
                ], { session });
            }
            await session.commitTransaction();
            await this.invalidateMemberListCache(dto.server_id);
            return { message: `User successfully ${action}ed.` };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException(`Failed to ${action} user.`);
        }
        finally {
            void session.endSession();
        }
    }
    async unbanMember(dto, actorBaseId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        const targetDehiveId = new mongoose_2.Types.ObjectId(dto.target_user_dehive_id);
        const actorDehiveProfile = await this.userDehiveModel
            .findById(actorBaseId)
            .select('_id')
            .lean();
        if (!actorDehiveProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for actor.`);
        const actorDehiveId = actorDehiveProfile._id;
        const hasPermission = await this.userDehiveServerModel.exists({
            server_id: serverId,
            $or: [
                { user_dehive_id: actorDehiveId },
                { user_dehive_id: actorDehiveId.toString() }
            ],
            role: { $in: [enum_1.ServerRole.OWNER, enum_1.ServerRole.MODERATOR] },
        });
        if (!hasPermission)
            throw new common_1.ForbiddenException('You do not have permission to unban members.');
        const result = await this.userDehiveModel.findByIdAndUpdate(targetDehiveId, {
            $pull: { banned_by_servers: serverId.toString() },
        });
        if (!result) {
            throw new common_1.NotFoundException('User not found.');
        }
        const updatedUser = await this.userDehiveModel.findById(targetDehiveId);
        if (updatedUser && updatedUser.banned_by_servers.length === 0) {
            await this.userDehiveModel.findByIdAndUpdate(targetDehiveId, {
                $set: { is_banned: false },
            });
        }
        await this.serverBanModel.deleteOne({
            server_id: serverId,
            user_dehive_id: targetDehiveId,
        });
        return { message: 'User successfully unbanned.' };
    }
    async assignRole(dto, actorBaseId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        const targetDehiveId = new mongoose_2.Types.ObjectId(dto.target_user_dehive_id);
        const actorDehiveProfile = await this.userDehiveModel
            .findById(actorBaseId)
            .select('_id')
            .lean();
        if (!actorDehiveProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for actor.`);
        const actorDehiveId = actorDehiveProfile._id;
        const [targetMembership, actorMembership] = await Promise.all([
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                $or: [
                    { user_dehive_id: targetDehiveId },
                    { user_dehive_id: targetDehiveId.toString() }
                ]
            }),
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                $or: [
                    { user_dehive_id: actorDehiveId },
                    { user_dehive_id: actorDehiveId.toString() }
                ]
            }),
        ]);
        if (!targetMembership)
            throw new common_1.NotFoundException('Target user is not a member of this server.');
        if (!actorMembership)
            throw new common_1.ForbiddenException('You are not a member of this server.');
        if (actorDehiveId.toString() === targetDehiveId.toString())
            throw new common_1.BadRequestException('You cannot change your own role.');
        if (actorMembership.role !== enum_1.ServerRole.OWNER)
            throw new common_1.ForbiddenException('Only the server owner can assign roles.');
        if (dto.role === enum_1.ServerRole.OWNER)
            throw new common_1.BadRequestException('Ownership can only be transferred, not assigned.');
        targetMembership.role = dto.role;
        return targetMembership.save();
    }
    async transferOwnership(dto, currentOwnerId) {
        const serverId = new mongoose_2.Types.ObjectId(dto.server_id);
        const newOwnerDehiveId = new mongoose_2.Types.ObjectId(dto.user_dehive_id);
        const currentOwnerProfile = await this.userDehiveModel
            .findById(currentOwnerId)
            .select('_id')
            .lean();
        if (!currentOwnerProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for current owner.`);
        const currentOwnerDehiveId = currentOwnerProfile._id;
        const [currentOwnerMembership, newOwnerMembership] = await Promise.all([
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                $or: [
                    { user_dehive_id: currentOwnerDehiveId },
                    { user_dehive_id: currentOwnerDehiveId.toString() }
                ]
            }),
            this.userDehiveServerModel.findOne({
                server_id: serverId,
                $or: [
                    { user_dehive_id: newOwnerDehiveId },
                    { user_dehive_id: newOwnerDehiveId.toString() }
                ]
            }),
        ]);
        if (!currentOwnerMembership)
            throw new common_1.ForbiddenException('You are not a member of this server.');
        if (currentOwnerMembership.role !== enum_1.ServerRole.OWNER)
            throw new common_1.ForbiddenException('Only the server owner can transfer ownership.');
        if (!newOwnerMembership)
            throw new common_1.NotFoundException('New owner is not a member of this server.');
        if (currentOwnerDehiveId.toString() === newOwnerDehiveId.toString())
            throw new common_1.BadRequestException('You cannot transfer ownership to yourself.');
        const session = await this.userDehiveServerModel.db.startSession();
        session.startTransaction();
        try {
            await this.userDehiveServerModel.updateOne({ _id: currentOwnerMembership._id }, { $set: { role: enum_1.ServerRole.MEMBER } }, { session });
            await this.userDehiveServerModel.updateOne({ _id: newOwnerMembership._id }, { $set: { role: enum_1.ServerRole.OWNER } }, { session });
            await session.commitTransaction();
            await this.invalidateMemberListCache(dto.server_id);
            return { message: 'Ownership transferred successfully.' };
        }
        catch (error) {
            await session.abortTransaction();
            throw new common_1.BadRequestException('Failed to transfer ownership.');
        }
        finally {
            void session.endSession();
        }
    }
    async updateNotification(dto, actorBaseId) {
        const actorDehiveProfile = await this.userDehiveModel
            .findById(actorBaseId)
            .select('_id')
            .lean();
        if (!actorDehiveProfile)
            throw new common_1.NotFoundException(`Dehive profile not found for user.`);
        const actorDehiveId = actorDehiveProfile._id;
        const result = await this.userDehiveServerModel.updateOne({
            server_id: new mongoose_2.Types.ObjectId(dto.server_id),
            $or: [
                { user_dehive_id: actorDehiveId },
                { user_dehive_id: actorDehiveId.toString() }
            ]
        }, { $set: { is_muted: dto.is_muted } });
        if (result.matchedCount === 0)
            throw new common_1.NotFoundException('Membership not found.');
        return { message: 'Notification settings updated successfully.' };
    }
    async _getEnrichedUser(userId, sessionIdOfRequester) {
        const userDecodeData = await this.decodeApiClient.getUserById(userId, sessionIdOfRequester);
        if (!userDecodeData) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found in Decode service`);
        }
        let userDehiveData = await this.userDehiveModel.findById(userId).lean();
        if (!userDehiveData) {
            const newUser = new this.userDehiveModel({ _id: userId, status: 'ACTIVE' });
            const savedDocument = await newUser.save();
            userDehiveData = savedDocument.toObject();
        }
        return this._mergeUserData(userDehiveData, userDecodeData);
    }
    _mergeUserData(dehiveData, decodeData) {
        return {
            _id: decodeData._id.toString(),
            username: decodeData.username,
            display_name: decodeData.display_name,
            avatar: decodeData.avatar_ipfs_hash,
            status: dehiveData.status,
            server_count: dehiveData.server_count,
            bio: dehiveData.bio,
            banner_color: dehiveData.banner_color,
            is_banned: dehiveData.is_banned
        };
    }
    async getMembersInServer(serverId, currentUser) {
        const cacheKey = `server_members:${serverId}`;
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const memberships = await this.userDehiveServerModel
            .find({ server_id: new mongoose_2.Types.ObjectId(serverId) })
            .lean();
        if (!memberships.length)
            return [];
        const enrichedMembersPromises = memberships.map(async (m) => {
            try {
                const userProfile = await this._getEnrichedUser(m.user_dehive_id.toString(), currentUser.session_id);
                return {
                    membership_id: m._id.toString(),
                    ...userProfile,
                    role: m.role,
                    is_muted: m.is_muted,
                    joined_at: m.joined_at,
                };
            }
            catch (error) {
                console.error(`Could not enrich member ${m.user_dehive_id}:`, error);
                return null;
            }
        });
        const finalResult = (await Promise.all(enrichedMembersPromises)).filter(Boolean);
        await this.redis.setex(cacheKey, 300, JSON.stringify(finalResult));
        return finalResult;
    }
    async getEnrichedUserProfile(targetUserId, currentUser) {
        const targetUserProfile = await this._getEnrichedUser(targetUserId, currentUser.session_id);
        console.log(`[SERVICE] getEnrichedUserProfile called with targetUserId: ${targetUserId}`);
        const [targetServers, viewerServers] = await Promise.all([
            this.userDehiveServerModel.find({ user_dehive_id: targetUserId }).select('server_id').lean(),
            this.userDehiveServerModel.find({ user_dehive_id: currentUser._id }).select('server_id').lean(),
        ]);
        const viewerServerIds = new Set(viewerServers.map(s => s.server_id.toString()));
        const mutualServers = targetServers
            .filter(s => viewerServerIds.has(s.server_id.toString()))
            .map(s => s.server_id);
        return {
            ...targetUserProfile,
            mutual_servers_count: mutualServers.length,
            mutual_servers: mutualServers,
        };
    }
    async invalidateMemberListCache(serverId) {
        await this.redis.del(`server_members:${serverId}`);
    }
};
exports.UserDehiveServerService = UserDehiveServerService;
exports.UserDehiveServerService = UserDehiveServerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_dehive_schema_1.UserDehive.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_dehive_server_schema_1.UserDehiveServer.name)),
    __param(2, (0, mongoose_1.InjectModel)(server_schema_1.Server.name)),
    __param(3, (0, mongoose_1.InjectModel)(server_ban_schema_1.ServerBan.name)),
    __param(4, (0, mongoose_1.InjectModel)(invite_link_schema_1.InviteLink.name)),
    __param(6, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, typeof (_b = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _b : Object, typeof (_c = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _c : Object, typeof (_d = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _d : Object, typeof (_e = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _e : Object, typeof (_f = typeof decode_api_client_1.DecodeApiClient !== "undefined" && decode_api_client_1.DecodeApiClient) === "function" ? _f : Object, typeof (_g = typeof ioredis_2.Redis !== "undefined" && ioredis_2.Redis) === "function" ? _g : Object])
], UserDehiveServerService);


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

/***/ "@nestjs/swagger":
/*!**********************************!*\
  !*** external "@nestjs/swagger" ***!
  \**********************************/
/***/ ((module) => {

module.exports = require("@nestjs/swagger");

/***/ }),

/***/ "axios":
/*!************************!*\
  !*** external "axios" ***!
  \************************/
/***/ ((module) => {

module.exports = require("axios");

/***/ }),

/***/ "class-validator":
/*!**********************************!*\
  !*** external "class-validator" ***!
  \**********************************/
/***/ ((module) => {

module.exports = require("class-validator");

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

/***/ "nanoid":
/*!*************************!*\
  !*** external "nanoid" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("nanoid");

/***/ }),

/***/ "rxjs":
/*!***********************!*\
  !*** external "rxjs" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("rxjs");

/***/ }),

/***/ "rxjs/operators":
/*!*********************************!*\
  !*** external "rxjs/operators" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("rxjs/operators");

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
/*!*********************************!*\
  !*** ./apps/server/src/main.ts ***!
  \*********************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
const core_1 = __webpack_require__(/*! @nestjs/core */ "@nestjs/core");
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const server_module_1 = __webpack_require__(/*! ./server.module */ "./apps/server/src/server.module.ts");
const transform_interface_1 = __webpack_require__(/*! ../interfaces/transform.interface */ "./apps/server/interfaces/transform.interface.ts");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(server_module_1.ServerModule);
    const configService = app.get(config_1.ConfigService);
    app.enableCors({
        origin: 'http://localhost:4002',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(new transform_interface_1.TransformInterceptor());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Dehive - Server Service')
        .setDescription('API documentation for managing servers, categories, and channels.')
        .setVersion('1.0')
        .addTag('servers')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config, {
        include: [server_module_1.ServerModule],
    });
    swagger_1.SwaggerModule.setup('api-docs', app, document);
    const port = configService.get('SERVER_PORT') || 4002;
    const host = configService.get('CLOUD_HOST') || 'localhost';
    await app.listen(port, host);
    console.log(`[Dehive] Server service is running on: ${await app.getUrl()}`);
    console.log(`[Dehive] Swagger UI available at: http://localhost:${port}/api-docs`);
}
void bootstrap();

})();

/******/ })()
;
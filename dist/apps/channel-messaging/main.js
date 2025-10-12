/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./apps/channel-messaging/common/decorators/current-user.decorator.ts":
/*!****************************************************************************!*\
  !*** ./apps/channel-messaging/common/decorators/current-user.decorator.ts ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CurrentUser = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    console.log("🎯 [CHANNEL-MESSAGING CURRENT USER] Decorator called with data:", data);
    try {
        const request = ctx
            .switchToHttp()
            .getRequest();
        console.log("🎯 [CHANNEL-MESSAGING CURRENT USER] Request user:", request.user);
        console.log("🎯 [CHANNEL-MESSAGING CURRENT USER] Request sessionId:", request.sessionId);
        if (data === "sessionId") {
            return request.sessionId;
        }
        const user = request.user;
        if (data && user) {
            console.log(`🎯 [CHANNEL-MESSAGING CURRENT USER] Returning user.${data}:`, user[data]);
            return user[data];
        }
        console.log("🎯 [CHANNEL-MESSAGING CURRENT USER] Returning full user:", user);
        return user;
    }
    catch (error) {
        console.error("❌ [CHANNEL-MESSAGING CURRENT USER] Error:", error);
        return undefined;
    }
});


/***/ }),

/***/ "./apps/channel-messaging/common/guards/auth.guard.ts":
/*!************************************************************!*\
  !*** ./apps/channel-messaging/common/guards/auth.guard.ts ***!
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
var AuthGuard_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthGuard = exports.Public = exports.PUBLIC_KEY = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const core_1 = __webpack_require__(/*! @nestjs/core */ "@nestjs/core");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const axios_2 = __webpack_require__(/*! axios */ "axios");
const rxjs_1 = __webpack_require__(/*! rxjs */ "rxjs");
exports.PUBLIC_KEY = "public";
const Public = () => (0, common_1.SetMetadata)(exports.PUBLIC_KEY, true);
exports.Public = Public;
let AuthGuard = AuthGuard_1 = class AuthGuard {
    httpService;
    logger = new common_1.Logger(AuthGuard_1.name);
    authServiceUrl = "http://localhost:4006";
    constructor(httpService) {
        this.httpService = httpService;
        console.log("🔥 [CHANNEL-MESSAGING AUTH GUARD] Constructor called - This is the channel-messaging AuthGuard!");
    }
    async canActivate(context) {
        console.log("🚨 [CHANNEL-MESSAGING AUTH GUARD] canActivate called - This is the channel-messaging AuthGuard!");
        const request = context.switchToHttp().getRequest();
        const isPublic = new core_1.Reflector().get(exports.PUBLIC_KEY, context.getHandler());
        console.log("🚨 [CHANNEL-MESSAGING AUTH GUARD] isPublic:", isPublic);
        if (isPublic) {
            console.log("🚨 [CHANNEL-MESSAGING AUTH GUARD] Route is public, skipping auth");
            return true;
        }
        const sessionId = this.extractSessionIdFromHeader(request);
        console.log("🚨 [CHANNEL-MESSAGING AUTH GUARD] sessionId:", sessionId);
        if (!sessionId) {
            console.log("❌ [CHANNEL-MESSAGING AUTH GUARD] No session ID found!");
            throw new common_1.UnauthorizedException({
                message: "Session ID is required",
                error: "MISSING_SESSION_ID",
            });
        }
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authServiceUrl}/auth/session/check`, {
                headers: {
                    "x-session-id": sessionId,
                    "Content-Type": "application/json",
                },
                timeout: 5000,
            }));
            if (!response.data.success || !response.data.data) {
                throw new common_1.UnauthorizedException({
                    message: response.data.message || "Invalid session",
                    error: "INVALID_SESSION",
                });
            }
            const session_check_response = response.data;
            if (session_check_response.success && session_check_response.data) {
                request["user"] = {
                    userId: session_check_response.data.user._id,
                    email: session_check_response.data.user.email || "",
                    username: session_check_response.data.user.username || "",
                    role: "user",
                };
                request["sessionId"] = sessionId;
                console.log("✅ [CHANNEL-MESSAGING AUTH GUARD] User attached to request:", request["user"]);
            }
            return true;
        }
        catch (error) {
            if (error instanceof axios_2.AxiosError) {
                if (error.response?.status === 401) {
                    throw new common_1.UnauthorizedException({
                        message: "Invalid or expired session",
                        error: "SESSION_EXPIRED",
                    });
                }
                this.logger.error("Auth service is unavailable");
                throw new common_1.UnauthorizedException({
                    message: "Authentication service unavailable",
                    error: "SERVICE_UNAVAILABLE",
                });
            }
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
            throw new common_1.UnauthorizedException({
                message: "Authentication failed",
                error: "AUTHENTICATION_ERROR",
            });
        }
    }
    extractSessionIdFromHeader(request) {
        return request.headers["x-session-id"];
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = AuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], AuthGuard);


/***/ }),

/***/ "./apps/channel-messaging/dto/attachment.dto.ts":
/*!******************************************************!*\
  !*** ./apps/channel-messaging/dto/attachment.dto.ts ***!
  \******************************************************/
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
exports.AttachmentDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/channel-messaging/enum/enum.ts");
class AttachmentDto {
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
        return { type: { required: true, enum: (__webpack_require__(/*! ../enum/enum */ "./apps/channel-messaging/enum/enum.ts").AttachmentType) }, url: { required: true, type: () => String, format: "uri" }, name: { required: true, type: () => String }, size: { required: true, type: () => Number, minimum: 0 }, mimeType: { required: true, type: () => String }, width: { required: false, type: () => Number, minimum: 1 }, height: { required: false, type: () => Number, minimum: 1 }, durationMs: { required: false, type: () => Number, minimum: 0 }, thumbnailUrl: { required: false, type: () => String } };
    }
}
exports.AttachmentDto = AttachmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: enum_1.AttachmentType }),
    (0, class_validator_1.IsEnum)(enum_1.AttachmentType),
    __metadata("design:type", String)
], AttachmentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Public URL to access the file" }),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], AttachmentDto.prototype, "url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Original file name" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AttachmentDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "File size in bytes", example: 123456 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], AttachmentDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "MIME type of the file", example: "image/jpeg" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AttachmentDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: "Width in pixels (image/video)" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AttachmentDto.prototype, "width", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: "Height in pixels (image/video)" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AttachmentDto.prototype, "height", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Duration in milliseconds (audio/video)",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], AttachmentDto.prototype, "durationMs", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: "Thumbnail/preview URL (image/video)" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttachmentDto.prototype, "thumbnailUrl", void 0);


/***/ }),

/***/ "./apps/channel-messaging/dto/channel-upload.dto.ts":
/*!**********************************************************!*\
  !*** ./apps/channel-messaging/dto/channel-upload.dto.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UploadResponseDto = exports.UploadInitDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/channel-messaging/enum/enum.ts");
class UploadInitDto {
    serverId;
    conversationId;
    static _OPENAPI_METADATA_FACTORY() {
        return { serverId: { required: false, type: () => String }, conversationId: { required: false, type: () => String } };
    }
}
exports.UploadInitDto = UploadInitDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: "Server ID for permission check" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], UploadInitDto.prototype, "serverId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Channel ConversationId ID for permission check",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], UploadInitDto.prototype, "conversationId", void 0);
class UploadResponseDto {
    uploadId;
    type;
    url;
    name;
    size;
    mimeType;
    errorMessage;
    width;
    height;
    durationMs;
    thumbnailUrl;
    static _OPENAPI_METADATA_FACTORY() {
        return { uploadId: { required: true, type: () => String }, type: { required: true, enum: (__webpack_require__(/*! ../enum/enum */ "./apps/channel-messaging/enum/enum.ts").AttachmentType) }, url: { required: true, type: () => String, format: "uri" }, name: { required: true, type: () => String }, size: { required: true, type: () => Number, minimum: 0 }, mimeType: { required: true, type: () => String }, errorMessage: { required: false, type: () => String }, width: { required: false, type: () => Number }, height: { required: false, type: () => Number }, durationMs: { required: false, type: () => Number }, thumbnailUrl: { required: false, type: () => String } };
    }
}
exports.UploadResponseDto = UploadResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Upload ID (MongoId) to reference in chat" }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], UploadResponseDto.prototype, "uploadId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: enum_1.AttachmentType }),
    __metadata("design:type", String)
], UploadResponseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], UploadResponseDto.prototype, "url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UploadResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "File size in bytes" }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UploadResponseDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "image/jpeg" }),
    __metadata("design:type", String)
], UploadResponseDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: "Error message if upload failed" }),
    __metadata("design:type", String)
], UploadResponseDto.prototype, "errorMessage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Number)
], UploadResponseDto.prototype, "width", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Number)
], UploadResponseDto.prototype, "height", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Number)
], UploadResponseDto.prototype, "durationMs", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], UploadResponseDto.prototype, "thumbnailUrl", void 0);


/***/ }),

/***/ "./apps/channel-messaging/dto/create-message.dto.ts":
/*!**********************************************************!*\
  !*** ./apps/channel-messaging/dto/create-message.dto.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CreateMessageDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const attachment_dto_1 = __webpack_require__(/*! ./attachment.dto */ "./apps/channel-messaging/dto/attachment.dto.ts");
class CreateMessageDto {
    conversationId;
    content;
    uploadIds;
    attachments;
    replyTo;
    static _OPENAPI_METADATA_FACTORY() {
        return { conversationId: { required: true, type: () => String }, content: { required: true, type: () => String, minLength: 0, maxLength: 2000 }, uploadIds: { required: true, type: () => [String] }, attachments: { required: false, type: () => [(__webpack_require__(/*! ./attachment.dto */ "./apps/channel-messaging/dto/attachment.dto.ts").AttachmentDto)] }, replyTo: { required: false, type: () => String, nullable: true } };
    }
}
exports.CreateMessageDto = CreateMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "The ID of the channel conversation to send the message to.",
        example: "68c5adb6ec465897d540c58",
    }),
    (0, class_validator_1.IsNotEmpty)({ message: "conversationId is required" }),
    (0, class_validator_1.IsMongoId)({ message: "conversationId must be a valid MongoId" }),
    __metadata("design:type", String)
], CreateMessageDto.prototype, "conversationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "The text content of the message (empty string if only sending files)",
        example: "Hello everyone! How is the project going?",
        maxLength: 2000,
        default: "",
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 2000),
    __metadata("design:type", String)
], CreateMessageDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [String],
        description: "List of upload IDs to attach (empty array if no files)",
        example: ["68db1234abcd5678efgh9013"],
        default: [],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsMongoId)({ each: true, message: "Each uploadId must be a valid MongoId" }),
    __metadata("design:type", Array)
], CreateMessageDto.prototype, "uploadIds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: [attachment_dto_1.AttachmentDto],
        description: "Optional explicit attachments; server may ignore if uploadIds provided",
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateMessageDto.prototype, "attachments", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "ID of the message being replied to (optional)",
        example: "68dc1234abcd5678efgh9014",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.replyTo !== null && o.replyTo !== undefined),
    (0, class_validator_1.IsMongoId)({ message: "replyTo must be a valid MongoId" }),
    __metadata("design:type", Object)
], CreateMessageDto.prototype, "replyTo", void 0);


/***/ }),

/***/ "./apps/channel-messaging/dto/get-messages.dto.ts":
/*!********************************************************!*\
  !*** ./apps/channel-messaging/dto/get-messages.dto.ts ***!
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
exports.GetMessagesDto = exports.GetMessagesParamsDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const class_transformer_1 = __webpack_require__(/*! class-transformer */ "class-transformer");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class GetMessagesParamsDto {
    static _OPENAPI_METADATA_FACTORY() {
        return {};
    }
}
exports.GetMessagesParamsDto = GetMessagesParamsDto;
class GetMessagesDto {
    page = 0;
    limit = 10;
    static _OPENAPI_METADATA_FACTORY() {
        return { page: { required: false, type: () => Number, default: 0, minimum: 0 }, limit: { required: false, type: () => Number, default: 10, minimum: 1, maximum: 100 } };
    }
}
exports.GetMessagesDto = GetMessagesDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "The page number to retrieve, starting from 0.",
        default: 0,
        required: false,
        type: Number,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], GetMessagesDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "The number of messages to retrieve per page (max 100).",
        default: 10,
        required: false,
        type: Number,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], GetMessagesDto.prototype, "limit", void 0);


/***/ }),

/***/ "./apps/channel-messaging/dto/list-channel-upload.dto.ts":
/*!***************************************************************!*\
  !*** ./apps/channel-messaging/dto/list-channel-upload.dto.ts ***!
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
exports.ListUploadsDto = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const class_transformer_1 = __webpack_require__(/*! class-transformer */ "class-transformer");
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/channel-messaging/enum/enum.ts");
class ListUploadsDto {
    serverId;
    type;
    page = 0;
    limit = 10;
    static _OPENAPI_METADATA_FACTORY() {
        return { serverId: { required: true, type: () => String }, type: { required: false, enum: (__webpack_require__(/*! ../enum/enum */ "./apps/channel-messaging/enum/enum.ts").AttachmentType) }, page: { required: true, type: () => Object, default: 0, minimum: 0 }, limit: { required: true, type: () => Object, default: 10, minimum: 1, maximum: 100 } };
    }
}
exports.ListUploadsDto = ListUploadsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Server ID for scoping and permission",
        example: "68db1234abcd5678efgh9013",
    }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], ListUploadsDto.prototype, "serverId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Filter by attachment type",
        enum: enum_1.AttachmentType,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(enum_1.AttachmentType),
    __metadata("design:type", String)
], ListUploadsDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Page number (starting at 0)",
        default: 0,
        type: Number,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Object)
], ListUploadsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Items per page (max 100)",
        default: 10,
        type: Number,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], ListUploadsDto.prototype, "limit", void 0);


/***/ }),

/***/ "./apps/channel-messaging/enum/enum.ts":
/*!*********************************************!*\
  !*** ./apps/channel-messaging/enum/enum.ts ***!
  \*********************************************/
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

/***/ "./apps/channel-messaging/gateway/chat.gateway.ts":
/*!********************************************************!*\
  !*** ./apps/channel-messaging/gateway/chat.gateway.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatGateway = void 0;
const websockets_1 = __webpack_require__(/*! @nestjs/websockets */ "@nestjs/websockets");
const socket_io_1 = __webpack_require__(/*! socket.io */ "socket.io");
const channel_messaging_service_1 = __webpack_require__(/*! ../src/channel-messaging.service */ "./apps/channel-messaging/src/channel-messaging.service.ts");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
const user_dehive_schema_1 = __webpack_require__(/*! ../../user-dehive-server/schemas/user-dehive.schema */ "./apps/user-dehive-server/schemas/user-dehive.schema.ts");
const server_schema_1 = __webpack_require__(/*! ../../server/schemas/server.schema */ "./apps/server/schemas/server.schema.ts");
const category_schema_1 = __webpack_require__(/*! ../../server/schemas/category.schema */ "./apps/server/schemas/category.schema.ts");
const channel_schema_1 = __webpack_require__(/*! ../../server/schemas/channel.schema */ "./apps/server/schemas/channel.schema.ts");
const user_dehive_server_schema_1 = __webpack_require__(/*! ../../user-dehive-server/schemas/user-dehive-server.schema */ "./apps/user-dehive-server/schemas/user-dehive-server.schema.ts");
const channel_conversation_schema_1 = __webpack_require__(/*! ../schemas/channel-conversation.schema */ "./apps/channel-messaging/schemas/channel-conversation.schema.ts");
let ChatGateway = class ChatGateway {
    messagingService;
    userDehiveModel;
    serverModel;
    categoryModel;
    channelModel;
    userDehiveServerModel;
    channelConversationModel;
    server;
    constructor(messagingService, userDehiveModel, serverModel, categoryModel, channelModel, userDehiveServerModel, channelConversationModel) {
        this.messagingService = messagingService;
        this.userDehiveModel = userDehiveModel;
        this.serverModel = serverModel;
        this.categoryModel = categoryModel;
        this.channelModel = channelModel;
        this.userDehiveServerModel = userDehiveServerModel;
        this.channelConversationModel = channelConversationModel;
    }
    meta = new WeakMap();
    send(client, event, data) {
        client.emit(event, data);
    }
    handleConnection(client) {
        console.log("[WebSocket] Client connected. Awaiting identity.");
        this.meta.set(client, {
            currentRooms: new Set(),
            isAuthenticated: false,
        });
    }
    handleDisconnect(client) {
        console.log("[WebSocket] Client disconnected.");
        const meta = this.meta.get(client);
        if (meta) {
            if (meta.currentRooms) {
                meta.currentRooms.forEach((roomId) => {
                    client.leave(roomId);
                });
            }
            this.meta.delete(client);
        }
    }
    async handleIdentity(userDehiveId, client) {
        if (!userDehiveId || typeof userDehiveId !== "string") {
            return this.send(client, "error", {
                message: "Invalid identity payload. Please send a string userDehiveId.",
            });
        }
        const meta = this.meta.get(client);
        if (!meta) {
            return this.send(client, "error", {
                message: "Internal server error: No client metadata found.",
            });
        }
        if (!mongoose_2.Types.ObjectId.isValid(userDehiveId)) {
            return this.send(client, "error", {
                message: "Invalid userDehiveId format.",
            });
        }
        try {
            const exists = await this.userDehiveModel.exists({
                _id: new mongoose_2.Types.ObjectId(userDehiveId),
            });
            if (!exists) {
                console.log(`[WebSocket] UserDehive not found: ${userDehiveId}`);
                return this.send(client, "error", {
                    message: "UserDehive not found.",
                });
            }
        }
        catch {
            return this.send(client, "error", {
                message: "Database error while checking user existence.",
            });
        }
        console.log(`[WebSocket] Client is identifying as UserDehive ID: ${userDehiveId}`);
        meta.userDehiveId = userDehiveId;
        meta.isAuthenticated = true;
        try {
            this.send(client, "identityConfirmed", {
                message: `You are now identified as ${userDehiveId}`,
                userDehiveId: userDehiveId,
            });
            console.log(`[WebSocket] identityConfirmed sent successfully`);
        }
        catch (error) {
            console.error(`[WebSocket] Error sending identityConfirmed:`, error);
        }
    }
    async handleJoinChannel(data, client) {
        const meta = this.meta.get(client);
        if (!meta?.userDehiveId || !meta?.isAuthenticated) {
            return this.send(client, "error", {
                message: 'Please identify yourself first by sending an "identity" event.',
            });
        }
        let parsedData;
        try {
            if (typeof data === "string") {
                parsedData = JSON.parse(data);
            }
            else {
                parsedData = data;
            }
        }
        catch (error) {
            return this.send(client, "error", {
                message: "Invalid JSON payload.",
                details: {
                    received: data,
                    error: error instanceof Error ? error.message : String(error),
                },
            });
        }
        const { serverId, channelId } = parsedData;
        console.log("[WebSocket] joinChannel raw data:", data);
        console.log("[WebSocket] joinChannel parsed data:", JSON.stringify(parsedData, null, 2));
        console.log("[WebSocket] Extracted values:", {
            serverId,
            channelId,
        });
        if (!serverId ||
            !channelId ||
            !mongoose_2.Types.ObjectId.isValid(serverId) ||
            !mongoose_2.Types.ObjectId.isValid(channelId)) {
            console.log("[WebSocket] Validation failed:", {
                serverId: { value: serverId, valid: mongoose_2.Types.ObjectId.isValid(serverId) },
                channelId: {
                    value: channelId,
                    valid: mongoose_2.Types.ObjectId.isValid(channelId),
                },
            });
            return this.send(client, "error", {
                message: "Invalid payload. serverId and channelId are required and must be valid ObjectIds.",
                details: {
                    received: data,
                    extracted: { serverId, channelId },
                },
            });
        }
        try {
            console.log("[WebSocket] Checking user membership...");
            console.log("[WebSocket] Query params:", {
                userDehiveId: meta.userDehiveId,
                serverId: serverId,
                userDehiveIdObjectId: new mongoose_2.Types.ObjectId(meta.userDehiveId),
                serverIdObjectId: new mongoose_2.Types.ObjectId(serverId),
            });
            const query1 = {
                user_dehive_id: new mongoose_2.Types.ObjectId(meta.userDehiveId),
                server_id: new mongoose_2.Types.ObjectId(serverId),
            };
            const query2 = {
                user_dehive_id: meta.userDehiveId,
                server_id: serverId,
            };
            const query3 = {
                user_dehive_id: meta.userDehiveId,
                server_id: new mongoose_2.Types.ObjectId(serverId),
            };
            console.log("[WebSocket] Trying query 1 (both ObjectId):", query1);
            let isMember = await this.userDehiveServerModel.findOne(query1);
            if (!isMember) {
                console.log("[WebSocket] Query 1 failed, trying query 2 (both string):", query2);
                isMember = await this.userDehiveServerModel.findOne(query2);
            }
            if (!isMember) {
                console.log("[WebSocket] Query 2 failed, trying query 3 (string + ObjectId):", query3);
                isMember = await this.userDehiveServerModel.findOne(query3);
            }
            const allUserMemberships = await this.userDehiveServerModel.find({
                user_dehive_id: meta.userDehiveId,
            });
            console.log("[WebSocket] All memberships for user:", allUserMemberships);
            const allServerMembers = await this.userDehiveServerModel.find({
                server_id: new mongoose_2.Types.ObjectId(serverId),
            });
            console.log("[WebSocket] All members of server:", allServerMembers);
            if (!isMember) {
                console.log("[WebSocket] User is not a member of server:", serverId);
                return this.send(client, "error", {
                    message: "Access denied. You are not a member of this server.",
                    details: {
                        serverId,
                        userDehiveId: meta.userDehiveId,
                        allUserMemberships,
                        allServerMembers,
                    },
                });
            }
            console.log("[WebSocket] User membership confirmed:", isMember);
            console.log("[WebSocket] Checking channel...");
            const channel = await this.channelModel.findById(channelId);
            if (!channel) {
                console.log("[WebSocket] Channel not found:", channelId);
                return this.send(client, "error", {
                    message: "Channel not found.",
                    details: { channelId },
                });
            }
            console.log("[WebSocket] Channel validation passed");
            console.log("[WebSocket] Checking category...");
            const category = await this.categoryModel.findById(channel.category_id);
            if (!category) {
                console.log("[WebSocket] Category not found:", channel.category_id);
                return this.send(client, "error", {
                    message: "Category not found.",
                    details: { categoryId: channel.category_id },
                });
            }
            if (category.server_id.toString() !== serverId) {
                console.log("[WebSocket] Category does not belong to server:", {
                    categoryServerId: category.server_id.toString(),
                    expectedServerId: serverId,
                });
                return this.send(client, "error", {
                    message: "Category does not belong to the specified server.",
                    details: {
                        categoryId: channel.category_id,
                        categoryServerId: category.server_id.toString(),
                        expectedServerId: serverId,
                    },
                });
            }
            console.log("[WebSocket] Category validation passed");
            const conversation = await this.channelConversationModel.findOneAndUpdate({ channelId: new mongoose_2.Types.ObjectId(channelId) }, { $setOnInsert: { channel_id: new mongoose_2.Types.ObjectId(channelId) } }, { upsert: true, new: true, runValidators: true });
            const conversationId = String(conversation._id);
            if (meta.currentRooms) {
                meta.currentRooms.forEach((roomId) => {
                    client.leave(roomId);
                });
                meta.currentRooms.clear();
            }
            await client.join(conversationId);
            meta.currentRooms?.add(conversationId);
            console.log(`[WebSocket] ✅ SUCCESS: User ${meta.userDehiveId} joined channel ${channelId}`);
            console.log(`[WebSocket] ✅ CONVERSATION ID: ${conversationId}`);
            console.log(`[WebSocket] ✅ ROOM JOINED: ${conversationId}`);
            this.send(client, "joinedChannel", {
                conversationId,
                message: "Joined channel room successfully",
            });
        }
        catch (error) {
            console.error("[WebSocket] Error handling joinChannel:", error);
            this.send(client, "error", {
                message: "Failed to join channel.",
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async handleMessage(data, client) {
        const meta = this.meta.get(client);
        if (!meta?.userDehiveId || !meta?.isAuthenticated) {
            return this.send(client, "error", {
                message: "Please identify yourself before sending a message.",
            });
        }
        try {
            let parsedData;
            if (typeof data === "string") {
                parsedData = JSON.parse(data);
            }
            else {
                parsedData = data;
            }
            if (!parsedData || typeof parsedData !== "object") {
                return this.send(client, "error", {
                    message: "Invalid payload.",
                });
            }
            const convId = parsedData.conversationId;
            if (!convId || !mongoose_2.Types.ObjectId.isValid(convId)) {
                return this.send(client, "error", {
                    message: "Invalid conversationId.",
                });
            }
            if (typeof parsedData.content !== "string") {
                return this.send(client, "error", {
                    message: "Content must be a string (0-2000 chars).",
                });
            }
            if (String(parsedData.content ?? "").length > 2000) {
                return this.send(client, "error", {
                    message: "Content must not exceed 2000 characters.",
                });
            }
            if (!Array.isArray(parsedData.uploadIds)) {
                return this.send(client, "error", {
                    message: "uploadIds is required and must be an array",
                });
            }
            if (parsedData.uploadIds.length > 0) {
                const allValid = parsedData.uploadIds.every((id) => {
                    return typeof id === "string" && mongoose_2.Types.ObjectId.isValid(id);
                });
                if (!allValid) {
                    return this.send(client, "error", {
                        message: "One or more uploadIds are invalid",
                    });
                }
            }
            if (parsedData.replyTo !== undefined && parsedData.replyTo !== null) {
                if (typeof parsedData.replyTo !== "string" ||
                    !mongoose_2.Types.ObjectId.isValid(parsedData.replyTo)) {
                    return this.send(client, "error", {
                        message: "replyTo must be a valid message ID",
                    });
                }
            }
            console.log(`[WebSocket] 📨 SEND MESSAGE: User ${meta.userDehiveId} sending to conversation ${convId}`);
            console.log(`[WebSocket] 📨 MESSAGE CONTENT: "${parsedData.content}"`);
            console.log(`[WebSocket] 📨 UPLOAD IDS: ${JSON.stringify(parsedData.uploadIds)}`);
            const savedMessage = (await this.messagingService.createMessage(parsedData, meta.userDehiveId));
            console.log(`[WebSocket] ✅ MESSAGE SAVED: ${savedMessage._id}`);
            await this.userDehiveModel.findById(savedMessage.senderId).lean();
            const messageToBroadcast = {
                _id: savedMessage._id,
                conversationId: savedMessage.conversationId?.toString?.(),
                sender: {
                    dehive_id: savedMessage.senderId,
                    username: `User_${savedMessage.senderId.toString()}`,
                },
                content: savedMessage.content,
                attachments: savedMessage.attachments || [],
                isEdited: savedMessage.isEdited || false,
                editedAt: savedMessage.editedAt || null,
                isDeleted: savedMessage.isDeleted || false,
                replyTo: savedMessage.replyTo || null,
                createdAt: savedMessage.createdAt,
                updatedAt: savedMessage.updatedAt,
            };
            this.server
                .to(String(parsedData.conversationId))
                .emit("newMessage", messageToBroadcast);
            console.log(`[WebSocket] 📢 MESSAGE BROADCASTED to room: ${parsedData.conversationId}`);
            console.log(`[WebSocket] 📢 BROADCAST DATA:`, JSON.stringify(messageToBroadcast, null, 2));
        }
        catch (error) {
            console.error("[WebSocket] Error handling message:", error);
            this.send(client, "error", {
                message: "Failed to send message.",
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async handleEditMessage(data, client) {
        const meta = this.meta.get(client);
        if (!meta?.userDehiveId || !meta?.isAuthenticated) {
            return this.send(client, "error", {
                message: "Please identify yourself before editing.",
            });
        }
        try {
            let parsedData;
            if (typeof data === "string") {
                parsedData = JSON.parse(data);
            }
            else {
                parsedData = data;
            }
            const updated = await this.messagingService.editMessage(parsedData.messageId, meta.userDehiveId, parsedData.content);
            const payload = {
                _id: updated._id,
                conversationId: updated.conversationId.toString(),
                sender: {
                    dehive_id: updated.senderId,
                    username: `User_${updated.senderId?.toString() || 'Unknown'}`,
                },
                content: updated.content,
                attachments: updated.attachments || [],
                isEdited: true,
                editedAt: updated.editedAt,
                isDeleted: updated.isDeleted || false,
                replyTo: updated.replyTo || null,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt,
            };
            this.server
                .to(String(payload.conversationId))
                .emit("messageEdited", payload);
        }
        catch (error) {
            this.send(client, "error", {
                message: "Failed to edit message.",
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async handleDeleteMessage(data, client) {
        const meta = this.meta.get(client);
        if (!meta?.userDehiveId || !meta?.isAuthenticated) {
            return this.send(client, "error", {
                message: "Please identify yourself before deleting.",
            });
        }
        try {
            let parsedData;
            if (typeof data === "string") {
                parsedData = JSON.parse(data);
            }
            else {
                parsedData = data;
            }
            const updated = await this.messagingService.deleteMessage(parsedData.messageId, meta.userDehiveId);
            const payload = {
                _id: updated._id,
                conversationId: updated.conversationId.toString(),
                sender: {
                    dehive_id: updated.senderId,
                    username: `User_${updated.senderId?.toString() || 'Unknown'}`,
                },
                content: updated.content,
                attachments: updated.attachments || [],
                isEdited: updated.isEdited || false,
                editedAt: updated.editedAt || null,
                isDeleted: true,
                replyTo: updated.replyTo || null,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt,
            };
            this.server
                .to(String(payload.conversationId))
                .emit("messageDeleted", payload);
        }
        catch (error) {
            this.send(client, "error", {
                message: "Failed to delete message.",
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
    handlePing(client) {
        this.send(client, "pong", {
            timestamp: new Date().toISOString(),
            message: "Pong!",
        });
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)("identity"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleIdentity", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("joinChannel"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinChannel", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("sendMessage"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("editMessage"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleEditMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("deleteMessage"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleDeleteMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("ping"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handlePing", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: "*",
        },
    }),
    __param(1, (0, mongoose_1.InjectModel)(user_dehive_schema_1.UserDehive.name)),
    __param(2, (0, mongoose_1.InjectModel)(server_schema_1.Server.name)),
    __param(3, (0, mongoose_1.InjectModel)(category_schema_1.Category.name)),
    __param(4, (0, mongoose_1.InjectModel)(channel_schema_1.Channel.name)),
    __param(5, (0, mongoose_1.InjectModel)(user_dehive_server_schema_1.UserDehiveServer.name)),
    __param(6, (0, mongoose_1.InjectModel)(channel_conversation_schema_1.ChannelConversation.name)),
    __metadata("design:paramtypes", [channel_messaging_service_1.MessagingService,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], ChatGateway);


/***/ }),

/***/ "./apps/channel-messaging/schemas/channel-conversation.schema.ts":
/*!***********************************************************************!*\
  !*** ./apps/channel-messaging/schemas/channel-conversation.schema.ts ***!
  \***********************************************************************/
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
exports.ChannelConversationSchema = exports.ChannelConversation = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let ChannelConversation = class ChannelConversation {
    channelId;
    key_contract;
};
exports.ChannelConversation = ChannelConversation;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "Channel",
        required: true,
        unique: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChannelConversation.prototype, "channelId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], ChannelConversation.prototype, "key_contract", void 0);
exports.ChannelConversation = ChannelConversation = __decorate([
    (0, mongoose_1.Schema)({ collection: "channel_conversation", timestamps: true })
], ChannelConversation);
exports.ChannelConversationSchema = mongoose_1.SchemaFactory.createForClass(ChannelConversation);


/***/ }),

/***/ "./apps/channel-messaging/schemas/channel-message.schema.ts":
/*!******************************************************************!*\
  !*** ./apps/channel-messaging/schemas/channel-message.schema.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChannelMessageSchema = exports.ChannelMessage = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let ChannelMessage = class ChannelMessage {
    content;
    conversationId;
    senderId;
    channelId;
    attachments;
    isEdited;
    editedAt;
    isDeleted;
    replyTo;
};
exports.ChannelMessage = ChannelMessage;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 2000 }),
    __metadata("design:type", String)
], ChannelMessage.prototype, "content", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "ChannelConversation",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChannelMessage.prototype, "conversationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "UserDehive",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChannelMessage.prototype, "senderId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "Channel", required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChannelMessage.prototype, "channelId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ type: Object }], default: [] }),
    __metadata("design:type", Array)
], ChannelMessage.prototype, "attachments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChannelMessage.prototype, "isEdited", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], ChannelMessage.prototype, "editedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChannelMessage.prototype, "isDeleted", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "ChannelMessage",
        required: false,
        default: null,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChannelMessage.prototype, "replyTo", void 0);
exports.ChannelMessage = ChannelMessage = __decorate([
    (0, mongoose_1.Schema)({ collection: "channel_message", timestamps: true })
], ChannelMessage);
exports.ChannelMessageSchema = mongoose_1.SchemaFactory.createForClass(ChannelMessage);


/***/ }),

/***/ "./apps/channel-messaging/schemas/upload.schema.ts":
/*!*********************************************************!*\
  !*** ./apps/channel-messaging/schemas/upload.schema.ts ***!
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UploadSchema = exports.Upload = void 0;
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
let Upload = class Upload {
    ownerId;
    serverId;
    channelId;
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
exports.Upload = Upload;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: "UserDehive",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Upload.prototype, "ownerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "Server", required: false, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Upload.prototype, "serverId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "Channel", required: false, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Upload.prototype, "channelId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Upload.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Upload.prototype, "url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Upload.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Upload.prototype, "size", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Upload.prototype, "mimeType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], Upload.prototype, "width", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], Upload.prototype, "height", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Number)
], Upload.prototype, "durationMs", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Upload.prototype, "thumbnailUrl", void 0);
exports.Upload = Upload = __decorate([
    (0, mongoose_1.Schema)({ collection: "channel_upload", timestamps: true })
], Upload);
exports.UploadSchema = mongoose_1.SchemaFactory.createForClass(Upload);


/***/ }),

/***/ "./apps/channel-messaging/src/auth-service.client.ts":
/*!***********************************************************!*\
  !*** ./apps/channel-messaging/src/auth-service.client.ts ***!
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
var AuthServiceClient_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthServiceClient = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const ioredis_1 = __webpack_require__(/*! @nestjs-modules/ioredis */ "@nestjs-modules/ioredis");
const ioredis_2 = __webpack_require__(/*! ioredis */ "ioredis");
const rxjs_1 = __webpack_require__(/*! rxjs */ "rxjs");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
let AuthServiceClient = AuthServiceClient_1 = class AuthServiceClient {
    httpService;
    redis;
    configService;
    logger = new common_1.Logger(AuthServiceClient_1.name);
    authServiceUrl;
    PROFILE_CACHE_TTL = 900;
    PROFILE_CACHE_PREFIX = "user_profile:";
    constructor(httpService, redis, configService) {
        this.httpService = httpService;
        this.redis = redis;
        this.configService = configService;
        this.authServiceUrl =
            this.configService.get("AUTH_SERVICE_URL") ||
                "http://localhost:4006";
    }
    async getUserProfile(userId) {
        const cacheKey = `${this.PROFILE_CACHE_PREFIX}${userId}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.authServiceUrl}/auth/profile/${userId}`, {
                timeout: 5000,
            }));
            if (!response.data.success || !response.data.data) {
                return null;
            }
            const profile = response.data.data;
            await this.redis.setex(cacheKey, this.PROFILE_CACHE_TTL, JSON.stringify(profile));
            return profile;
        }
        catch {
            this.logger.error(`Failed to fetch user profile: ${userId}`);
            return null;
        }
    }
    async batchGetProfiles(userIds) {
        if (!userIds || userIds.length === 0) {
            return {};
        }
        const uniqueIds = [...new Set(userIds)];
        const pipeline = this.redis.pipeline();
        uniqueIds.forEach((id) => {
            pipeline.get(`${this.PROFILE_CACHE_PREFIX}${id}`);
        });
        const cachedResults = await pipeline.exec();
        const profiles = {};
        const missingIds = [];
        uniqueIds.forEach((id, idx) => {
            if (cachedResults && cachedResults[idx]) {
                const [err, data] = cachedResults[idx];
                if (!err && data) {
                    try {
                        profiles[id] = JSON.parse(data);
                    }
                    catch {
                        missingIds.push(id);
                    }
                }
                else {
                    missingIds.push(id);
                }
            }
            else {
                missingIds.push(id);
            }
        });
        if (missingIds.length > 0) {
            const fetchPromises = missingIds.map((id) => this.getUserProfile(id).then((profile) => ({ id, profile })));
            const results = await Promise.all(fetchPromises);
            results.forEach(({ id, profile }) => {
                if (profile) {
                    profiles[id] = profile;
                }
            });
        }
        return profiles;
    }
};
exports.AuthServiceClient = AuthServiceClient;
exports.AuthServiceClient = AuthServiceClient = AuthServiceClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [axios_1.HttpService,
        ioredis_2.Redis,
        config_1.ConfigService])
], AuthServiceClient);


/***/ }),

/***/ "./apps/channel-messaging/src/channel-messaging.controller.ts":
/*!********************************************************************!*\
  !*** ./apps/channel-messaging/src/channel-messaging.controller.ts ***!
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MessagingController = void 0;
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const platform_express_1 = __webpack_require__(/*! @nestjs/platform-express */ "@nestjs/platform-express");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const channel_messaging_service_1 = __webpack_require__(/*! ./channel-messaging.service */ "./apps/channel-messaging/src/channel-messaging.service.ts");
const get_messages_dto_1 = __webpack_require__(/*! ../dto/get-messages.dto */ "./apps/channel-messaging/dto/get-messages.dto.ts");
const channel_upload_dto_1 = __webpack_require__(/*! ../dto/channel-upload.dto */ "./apps/channel-messaging/dto/channel-upload.dto.ts");
const list_channel_upload_dto_1 = __webpack_require__(/*! ../dto/list-channel-upload.dto */ "./apps/channel-messaging/dto/list-channel-upload.dto.ts");
const create_message_dto_1 = __webpack_require__(/*! ../dto/create-message.dto */ "./apps/channel-messaging/dto/create-message.dto.ts");
const auth_guard_1 = __webpack_require__(/*! ../common/guards/auth.guard */ "./apps/channel-messaging/common/guards/auth.guard.ts");
const current_user_decorator_1 = __webpack_require__(/*! ../common/decorators/current-user.decorator */ "./apps/channel-messaging/common/decorators/current-user.decorator.ts");
const common_2 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
let MessagingController = class MessagingController {
    messagingService;
    constructor(messagingService) {
        this.messagingService = messagingService;
    }
    async sendMessage(userId, createMessageDto) {
        const savedMessage = await this.messagingService.createMessage(createMessageDto, userId);
        return {
            success: true,
            statusCode: 201,
            message: "Message sent successfully",
            data: savedMessage,
        };
    }
    getMessages(conversationId, query) {
        return this.messagingService
            .getMessagesByConversationId(conversationId, query)
            .then((messages) => ({
            success: true,
            statusCode: 200,
            message: "Fetched conversation messages successfully",
            data: messages,
        }));
    }
    async upload(file, body, userId) {
        const result = await this.messagingService.handleUpload(file, body, userId);
        return {
            success: true,
            statusCode: 201,
            message: "File uploaded successfully",
            data: result,
        };
    }
    async listUploads(userId, query) {
        const result = await this.messagingService.listUploads({
            serverId: query.serverId,
            userId,
            type: query.type,
            page: query.page,
            limit: query.limit,
        });
        return {
            success: true,
            statusCode: 200,
            message: "Fetched uploads successfully",
            data: result,
        };
    }
    async getConversationByChannelId(channelId) {
        const conversation = await this.messagingService.getOrCreateConversationByChannelId(channelId);
        return {
            success: true,
            statusCode: 200,
            message: "Conversation ID retrieved successfully",
            data: {
                conversationId: String(conversation._id),
                channelId: String(conversation.channelId),
                createdAt: conversation.createdAt,
            },
        };
    }
};
exports.MessagingController = MessagingController;
__decorate([
    (0, common_1.Post)("send"),
    (0, swagger_1.ApiOperation)({ summary: "Send a message to a channel conversation" }),
    (0, swagger_1.ApiHeader)({
        name: "x-session-id",
        description: "Session ID of authenticated user",
        required: true,
    }),
    (0, swagger_1.ApiBody)({ type: create_message_dto_1.CreateMessageDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: "Message sent successfully." }),
    (0, swagger_1.ApiResponse)({ status: 400, description: "Invalid input or missing fields." }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: "User is not allowed to post in this channel (future implementation).",
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: "Conversation not found." }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)("userId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_message_dto_1.CreateMessageDto]),
    __metadata("design:returntype", Promise)
], MessagingController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)("conversation/:conversationId"),
    (0, swagger_1.ApiOperation)({ summary: "Get paginated messages for a conversation" }),
    (0, swagger_1.ApiHeader)({
        name: "x-session-id",
        description: "Session ID of authenticated user",
        required: true,
    }),
    (0, swagger_1.ApiParam)({
        name: "conversationId",
        description: "The ID of the channel conversation to retrieve messages from",
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Returns a list of messages." }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "No messages found for the channel.",
    }),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)("conversationId")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, get_messages_dto_1.GetMessagesDto]),
    __metadata("design:returntype", void 0)
], MessagingController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)("files/upload"),
    (0, swagger_1.ApiOperation)({ summary: "Upload a file and return metadata" }),
    (0, swagger_1.ApiHeader)({
        name: "x-session-id",
        description: "Session ID of authenticated user",
        required: true,
    }),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, swagger_1.ApiBody)({
        schema: {
            type: "object",
            properties: {
                file: { type: "string", format: "binary" },
                serverId: { type: "string", description: "Server ID (MongoId)" },
                conversationId: {
                    type: "string",
                    description: " Channel Conversation ID (MongoId)",
                },
            },
            required: ["file", "serverId", "conversationId"],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: "File uploaded successfully.",
        type: channel_upload_dto_1.UploadResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Missing header, invalid/missing serverId, not a member, or size/type exceeds limits.",
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, channel_upload_dto_1.UploadInitDto, String]),
    __metadata("design:returntype", Promise)
], MessagingController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)("files/list"),
    (0, swagger_1.ApiOperation)({ summary: "List previously uploaded files (gallery)" }),
    (0, swagger_1.ApiHeader)({
        name: "x-session-id",
        description: "Session ID of authenticated user",
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Returns paginated uploads." }),
    (0, swagger_1.ApiResponse)({ status: 400, description: "Invalid query or header." }),
    (0, swagger_1.ApiResponse)({ status: 403, description: "Not allowed." }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)("userId")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, list_channel_upload_dto_1.ListUploadsDto]),
    __metadata("design:returntype", Promise)
], MessagingController.prototype, "listUploads", null);
__decorate([
    (0, common_1.Get)("conversation/by-channel/:channelId"),
    (0, swagger_1.ApiOperation)({ summary: "Get or create conversation ID for a channel" }),
    (0, swagger_1.ApiHeader)({
        name: "x-session-id",
        description: "Session ID of authenticated user",
        required: true,
    }),
    (0, swagger_1.ApiParam)({
        name: "channelId",
        description: "The ID of the channel to get conversation for",
        example: "68c5adb6ec465897d540c58",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Returns conversation ID for the channel",
        schema: {
            type: "object",
            properties: {
                success: { type: "boolean" },
                statusCode: { type: "number" },
                message: { type: "string" },
                data: {
                    type: "object",
                    properties: {
                        conversationId: { type: "string" },
                        channelId: { type: "string" },
                        createdAt: { type: "string", format: "date-time" },
                    },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: "Invalid channelId." }),
    (0, swagger_1.ApiResponse)({ status: 404, description: "Channel not found." }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)("channelId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MessagingController.prototype, "getConversationByChannelId", null);
exports.MessagingController = MessagingController = __decorate([
    (0, swagger_1.ApiTags)("Channel Messages"),
    (0, common_1.Controller)("messages"),
    (0, common_2.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [channel_messaging_service_1.MessagingService])
], MessagingController);


/***/ }),

/***/ "./apps/channel-messaging/src/channel-messaging.module.ts":
/*!****************************************************************!*\
  !*** ./apps/channel-messaging/src/channel-messaging.module.ts ***!
  \****************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MessagingModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const axios_1 = __webpack_require__(/*! @nestjs/axios */ "@nestjs/axios");
const ioredis_1 = __webpack_require__(/*! @nestjs-modules/ioredis */ "@nestjs-modules/ioredis");
const chat_gateway_1 = __webpack_require__(/*! ../gateway/chat.gateway */ "./apps/channel-messaging/gateway/chat.gateway.ts");
const channel_messaging_controller_1 = __webpack_require__(/*! ./channel-messaging.controller */ "./apps/channel-messaging/src/channel-messaging.controller.ts");
const channel_messaging_service_1 = __webpack_require__(/*! ./channel-messaging.service */ "./apps/channel-messaging/src/channel-messaging.service.ts");
const auth_service_client_1 = __webpack_require__(/*! ./auth-service.client */ "./apps/channel-messaging/src/auth-service.client.ts");
const channel_message_schema_1 = __webpack_require__(/*! ../schemas/channel-message.schema */ "./apps/channel-messaging/schemas/channel-message.schema.ts");
const upload_schema_1 = __webpack_require__(/*! ../schemas/upload.schema */ "./apps/channel-messaging/schemas/upload.schema.ts");
const user_dehive_schema_1 = __webpack_require__(/*! ../../user-dehive-server/schemas/user-dehive.schema */ "./apps/user-dehive-server/schemas/user-dehive.schema.ts");
const server_schema_1 = __webpack_require__(/*! ../../server/schemas/server.schema */ "./apps/server/schemas/server.schema.ts");
const category_schema_1 = __webpack_require__(/*! ../../server/schemas/category.schema */ "./apps/server/schemas/category.schema.ts");
const channel_schema_1 = __webpack_require__(/*! ../../server/schemas/channel.schema */ "./apps/server/schemas/channel.schema.ts");
const channel_conversation_schema_1 = __webpack_require__(/*! ../schemas/channel-conversation.schema */ "./apps/channel-messaging/schemas/channel-conversation.schema.ts");
const user_dehive_server_schema_1 = __webpack_require__(/*! ../../user-dehive-server/schemas/user-dehive-server.schema */ "./apps/user-dehive-server/schemas/user-dehive-server.schema.ts");
const auth_guard_1 = __webpack_require__(/*! ../common/guards/auth.guard */ "./apps/channel-messaging/common/guards/auth.guard.ts");
let MessagingModule = class MessagingModule {
};
exports.MessagingModule = MessagingModule;
exports.MessagingModule = MessagingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ".env",
            }),
            axios_1.HttpModule.register({
                timeout: 5000,
                maxRedirects: 5,
            }),
            ioredis_1.RedisModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    type: "single",
                    url: config.get("REDIS_URI"),
                }),
                inject: [config_1.ConfigService],
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    uri: configService.get("MONGODB_URI"),
                    dbName: "dehive_db",
                }),
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: channel_message_schema_1.ChannelMessage.name, schema: channel_message_schema_1.ChannelMessageSchema },
                { name: upload_schema_1.Upload.name, schema: upload_schema_1.UploadSchema },
                { name: user_dehive_schema_1.UserDehive.name, schema: user_dehive_schema_1.UserDehiveSchema },
                { name: server_schema_1.Server.name, schema: server_schema_1.ServerSchema },
                { name: category_schema_1.Category.name, schema: category_schema_1.CategorySchema },
                { name: channel_schema_1.Channel.name, schema: channel_schema_1.ChannelSchema },
                { name: user_dehive_server_schema_1.UserDehiveServer.name, schema: user_dehive_server_schema_1.UserDehiveServerSchema },
                { name: channel_conversation_schema_1.ChannelConversation.name, schema: channel_conversation_schema_1.ChannelConversationSchema },
            ]),
        ],
        controllers: [channel_messaging_controller_1.MessagingController],
        providers: [channel_messaging_service_1.MessagingService, chat_gateway_1.ChatGateway, auth_guard_1.AuthGuard, auth_service_client_1.AuthServiceClient],
    })
], MessagingModule);


/***/ }),

/***/ "./apps/channel-messaging/src/channel-messaging.service.ts":
/*!*****************************************************************!*\
  !*** ./apps/channel-messaging/src/channel-messaging.service.ts ***!
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
exports.MessagingService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const mongoose_1 = __webpack_require__(/*! @nestjs/mongoose */ "@nestjs/mongoose");
const mongoose_2 = __webpack_require__(/*! mongoose */ "mongoose");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const fs = __webpack_require__(/*! fs */ "fs");
const path = __webpack_require__(/*! path */ "path");
const auth_service_client_1 = __webpack_require__(/*! ./auth-service.client */ "./apps/channel-messaging/src/auth-service.client.ts");
const crypto_1 = __webpack_require__(/*! crypto */ "crypto");
const channel_message_schema_1 = __webpack_require__(/*! ../schemas/channel-message.schema */ "./apps/channel-messaging/schemas/channel-message.schema.ts");
const channel_conversation_schema_1 = __webpack_require__(/*! ../schemas/channel-conversation.schema */ "./apps/channel-messaging/schemas/channel-conversation.schema.ts");
const upload_schema_1 = __webpack_require__(/*! ../schemas/upload.schema */ "./apps/channel-messaging/schemas/upload.schema.ts");
const enum_1 = __webpack_require__(/*! ../enum/enum */ "./apps/channel-messaging/enum/enum.ts");
const sharp_1 = __webpack_require__(/*! sharp */ "sharp");
const childProcess = __webpack_require__(/*! child_process */ "child_process");
const ffmpeg_static_1 = __webpack_require__(/*! ffmpeg-static */ "ffmpeg-static");
const ffprobe_static_1 = __webpack_require__(/*! ffprobe-static */ "ffprobe-static");
const user_dehive_server_schema_1 = __webpack_require__(/*! ../../user-dehive-server/schemas/user-dehive-server.schema */ "./apps/user-dehive-server/schemas/user-dehive-server.schema.ts");
const user_dehive_schema_1 = __webpack_require__(/*! ../../user-dehive-server/schemas/user-dehive.schema */ "./apps/user-dehive-server/schemas/user-dehive.schema.ts");
let MessagingService = class MessagingService {
    channelMessageModel;
    channelConversationModel;
    uploadModel;
    userDehiveServerModel;
    userDehiveModel;
    configService;
    authClient;
    constructor(channelMessageModel, channelConversationModel, uploadModel, userDehiveServerModel, userDehiveModel, configService, authClient) {
        this.channelMessageModel = channelMessageModel;
        this.channelConversationModel = channelConversationModel;
        this.uploadModel = uploadModel;
        this.userDehiveServerModel = userDehiveServerModel;
        this.userDehiveModel = userDehiveModel;
        this.configService = configService;
        this.authClient = authClient;
    }
    detectAttachmentType(mime) {
        if (mime.startsWith("image/"))
            return enum_1.AttachmentType.IMAGE;
        if (mime.startsWith("video/"))
            return enum_1.AttachmentType.VIDEO;
        if (mime.startsWith("audio/"))
            return enum_1.AttachmentType.AUDIO;
        return enum_1.AttachmentType.FILE;
    }
    getLimits() {
        const toBytes = (mb, def) => (parseInt(mb || "", 10) || def) * 1024 * 1024;
        return {
            image: toBytes(this.configService.get("MAX_IMAGE_MB") ?? "10", 10),
            video: toBytes(this.configService.get("MAX_VIDEO_MB") ?? "100", 100),
            file: toBytes(this.configService.get("MAX_FILE_MB") ?? "25", 25),
        };
    }
    validateUploadSize(mime, size) {
        const type = this.detectAttachmentType(mime);
        const limits = this.getLimits();
        if (type === enum_1.AttachmentType.IMAGE && size > limits.image)
            throw new common_1.BadRequestException(`Image exceeds size limit (${limits.image} bytes)`);
        if (type === enum_1.AttachmentType.VIDEO && size > limits.video)
            throw new common_1.BadRequestException(`Video exceeds size limit (${limits.video} bytes)`);
        if (type !== enum_1.AttachmentType.IMAGE &&
            type !== enum_1.AttachmentType.VIDEO &&
            size > limits.file)
            throw new common_1.BadRequestException(`File exceeds size limit (${limits.file} bytes)`);
    }
    async handleUpload(file, body, userId) {
        if (!file || typeof file !== "object")
            throw new common_1.BadRequestException("File is required");
        const uploaded = file;
        const mime = uploaded.mimetype || "application/octet-stream";
        const size = uploaded.size ?? 0;
        this.validateUploadSize(mime, size);
        if (!body.serverId) {
            throw new common_1.BadRequestException("serverId is required");
        }
        if (!mongoose_2.Types.ObjectId.isValid(body.serverId)) {
            throw new common_1.BadRequestException("Invalid serverId");
        }
        if (!body.conversationId) {
            throw new common_1.BadRequestException("conversationId is required");
        }
        if (!mongoose_2.Types.ObjectId.isValid(body.conversationId)) {
            throw new common_1.BadRequestException("Invalid conversationId");
        }
        if (!userId || !mongoose_2.Types.ObjectId.isValid(userId)) {
            throw new common_1.BadRequestException("Invalid or missing user_dehive_id");
        }
        const isMember = await this.userDehiveServerModel.exists({
            user_dehive_id: userId,
            server_id: new mongoose_2.Types.ObjectId(body.serverId),
        });
        if (!isMember) {
            throw new common_1.BadRequestException("User is not a member of this server");
        }
        const conversation = await this.channelConversationModel.findById(body.conversationId);
        if (!conversation) {
            throw new common_1.NotFoundException("Conversation not found");
        }
        const storage = (this.configService.get("STORAGE") || "local").toLowerCase();
        const cdnBase = this.configService.get("CDN_BASE_URL") ||
            "http://localhost:4003/uploads";
        let fileUrl = "";
        const originalName = uploaded.originalname || "upload.bin";
        const ext = path.extname(originalName) || "";
        const safeName = `${(0, crypto_1.randomUUID)()}${ext}`;
        if (storage === "local") {
            const uploadDir = path.resolve(process.cwd(), "uploads");
            if (!fs.existsSync(uploadDir))
                fs.mkdirSync(uploadDir, { recursive: true });
            const dest = path.join(uploadDir, safeName);
            const buffer = Buffer.isBuffer(uploaded.buffer)
                ? uploaded.buffer
                : Buffer.from("");
            fs.writeFileSync(dest, buffer);
            fileUrl = `${cdnBase.replace(/\/$/, "")}/${safeName}`;
        }
        else {
            throw new common_1.BadRequestException("S3/MinIO not implemented yet");
        }
        const type = this.detectAttachmentType(mime);
        let width;
        let height;
        let durationMs;
        let thumbnailUrl;
        try {
            if (type === enum_1.AttachmentType.IMAGE) {
                const inputBuffer = uploaded.buffer || Buffer.alloc(0);
                const metadata = await (0, sharp_1.default)(inputBuffer).metadata();
                width = metadata.width;
                height = metadata.height;
            }
            else if (type === enum_1.AttachmentType.VIDEO ||
                type === enum_1.AttachmentType.AUDIO) {
                const probeMeta = ffprobe_static_1.default;
                const probeBin = (typeof probeMeta === "object" && probeMeta?.path) ||
                    (typeof probeMeta === "string" ? probeMeta : "ffprobe");
                const tmpFilePath = path.resolve(process.cwd(), "uploads", safeName);
                const probe = childProcess.spawnSync(probeBin, [
                    "-v",
                    "error",
                    "-print_format",
                    "json",
                    "-show_format",
                    "-show_streams",
                    tmpFilePath,
                ], { encoding: "utf-8" });
                if (probe.status === 0 && probe.stdout) {
                    const info = JSON.parse(String(probe.stdout));
                    const videoStream = info.streams?.find((s) => s.codec_type === "video");
                    if (videoStream) {
                        width = videoStream.width;
                        height = videoStream.height;
                    }
                    const dur = (videoStream?.duration && parseFloat(videoStream.duration)) ||
                        (info.format?.duration && parseFloat(info.format.duration)) ||
                        undefined;
                    if (dur && !Number.isNaN(dur))
                        durationMs = Math.round(dur * 1000);
                    if (type === enum_1.AttachmentType.VIDEO) {
                        const thumbName = `${safeName.replace(ext, "")}_thumb.jpg`;
                        const thumbPath = path.resolve(process.cwd(), "uploads", thumbName);
                        const ffmpegBin = ffmpeg_static_1.default || "ffmpeg";
                        const ffmpeg = childProcess.spawnSync(ffmpegBin, [
                            "-i",
                            tmpFilePath,
                            "-ss",
                            "00:00:00.000",
                            "-vframes",
                            "1",
                            "-vf",
                            "scale=640:-1",
                            thumbPath,
                            "-y",
                        ], { encoding: "utf-8" });
                        if (ffmpeg.status === 0) {
                            thumbnailUrl = `${cdnBase.replace(/\/$/, "")}/${thumbName}`;
                        }
                    }
                }
            }
        }
        catch {
        }
        const doc = await this.uploadModel.create({
            ownerId: userId && mongoose_2.Types.ObjectId.isValid(userId)
                ? new mongoose_2.Types.ObjectId(userId)
                : new mongoose_2.Types.ObjectId(),
            serverId: body.serverId ? new mongoose_2.Types.ObjectId(body.serverId) : undefined,
            channelId: conversation.channelId,
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
            uploadId: String(doc._id),
            type,
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
    async createMessage(createMessageDto, senderId) {
        let attachments = [];
        if (Array.isArray(createMessageDto.uploadIds) &&
            createMessageDto.uploadIds.length > 0) {
            const validIds = createMessageDto.uploadIds.filter((id) => mongoose_2.Types.ObjectId.isValid(id));
            if (validIds.length !== createMessageDto.uploadIds.length) {
                throw new common_1.BadRequestException("One or more uploadIds are invalid");
            }
            const uploadObjectIds = validIds.map((id) => new mongoose_2.Types.ObjectId(id));
            const uploads = await this.uploadModel
                .find({
                _id: { $in: uploadObjectIds },
                ownerId: new mongoose_2.Types.ObjectId(senderId),
            })
                .lean();
            if (uploads.length !== uploadObjectIds.length) {
                throw new common_1.BadRequestException("You can only attach files that you uploaded");
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
        const conversation = await this.channelConversationModel.findById(createMessageDto.conversationId);
        if (!conversation) {
            throw new common_1.BadRequestException("Invalid conversationId");
        }
        let replyToMessageId;
        if (createMessageDto.replyTo) {
            if (!mongoose_2.Types.ObjectId.isValid(createMessageDto.replyTo)) {
                throw new common_1.BadRequestException("Invalid replyTo message id");
            }
            const replyToMessage = await this.channelMessageModel
                .findById(createMessageDto.replyTo)
                .lean();
            if (!replyToMessage) {
                throw new common_1.NotFoundException("Message being replied to not found");
            }
            if (String(replyToMessage.conversationId) !==
                createMessageDto.conversationId) {
                throw new common_1.BadRequestException("Cannot reply to a message from a different conversation");
            }
            replyToMessageId = new mongoose_2.Types.ObjectId(createMessageDto.replyTo);
        }
        const newMessage = new this.channelMessageModel({
            content: createMessageDto.content,
            attachments,
            senderId: new mongoose_2.Types.ObjectId(senderId),
            channelId: conversation.channelId,
            conversationId: conversation._id,
            replyTo: replyToMessageId || null,
        });
        const savedMessage = await newMessage.save();
        const populatedMessage = await this.channelMessageModel
            .findById(savedMessage._id)
            .populate("replyTo", "content senderId createdAt")
            .lean();
        const formattedMessage = {
            ...populatedMessage,
            replyTo: populatedMessage?.replyTo || null,
        };
        return formattedMessage;
    }
    async getOrCreateConversationByChannelId(channelId) {
        if (!mongoose_2.Types.ObjectId.isValid(channelId)) {
            throw new common_1.BadRequestException("Invalid channelId");
        }
        const conversation = await this.channelConversationModel.findOneAndUpdate({ channelId: new mongoose_2.Types.ObjectId(channelId) }, {
            $setOnInsert: {
                channelId: new mongoose_2.Types.ObjectId(channelId),
            },
        }, { upsert: true, new: true });
        return conversation;
    }
    async getMessagesByConversationId(conversationId, getMessagesDto) {
        const { page = 0, limit = 10 } = getMessagesDto;
        const skip = page * limit;
        if (!mongoose_2.Types.ObjectId.isValid(conversationId)) {
            throw new common_1.BadRequestException("Invalid conversationId");
        }
        const [messages, total] = await Promise.all([
            this.channelMessageModel
                .find({ conversationId: new mongoose_2.Types.ObjectId(conversationId) })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                path: "senderId",
                model: "UserDehive",
                select: "_id",
            })
                .populate("replyTo", "content senderId createdAt")
                .lean(),
            this.channelMessageModel.countDocuments({
                conversationId: new mongoose_2.Types.ObjectId(conversationId),
            }),
        ]);
        if (!messages || messages.length === 0) {
            return {
                items: [],
                metadata: {
                    page,
                    limit,
                    total: 0,
                    is_last_page: true,
                },
            };
        }
        const userIds = messages
            .map((m) => {
            const sender = m.senderId;
            return sender?._id?.toString();
        })
            .filter((id) => Boolean(id));
        const profiles = await this.authClient.batchGetProfiles(userIds);
        const items = messages.map((msg) => {
            const sender = msg.senderId;
            const userId = sender?._id?.toString() || "";
            const profile = profiles[userId] || {
                username: "Unknown User",
                display_name: "Unknown User",
                avatar: null,
            };
            return {
                _id: msg._id,
                content: msg.content,
                conversationId: msg.conversationId,
                channelId: msg.channelId,
                senderId: sender?._id,
                sender: {
                    user_id: userId,
                    user_dehive_id: sender?._id?.toString() || "",
                    username: profile.username,
                    display_name: profile.display_name || profile.username,
                    avatar: profile.avatar,
                },
                attachments: msg.attachments,
                isEdited: msg.isEdited,
                editedAt: msg.editedAt,
                replyTo: msg.replyTo || null,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt,
            };
        });
        const totalPages = Math.ceil(total / limit);
        const isLastPage = page >= totalPages - 1;
        return {
            items,
            metadata: {
                page,
                limit,
                total: items.length,
                is_last_page: isLastPage,
            },
        };
    }
    async editMessage(messageId, editorUserDehiveId, newContent) {
        if (!mongoose_2.Types.ObjectId.isValid(messageId)) {
            throw new common_1.BadRequestException("Invalid message id");
        }
        if (!mongoose_2.Types.ObjectId.isValid(editorUserDehiveId)) {
            throw new common_1.BadRequestException("Invalid user id");
        }
        if (typeof newContent !== "string") {
            throw new common_1.BadRequestException("Content must be a string");
        }
        const msg = await this.channelMessageModel.findById(messageId);
        if (!msg)
            throw new common_1.NotFoundException("Message not found");
        if (String(msg.senderId) !== editorUserDehiveId) {
            throw new common_1.BadRequestException("You can only edit your own message");
        }
        msg.content = newContent;
        msg.isEdited = true;
        msg.editedAt = new Date();
        await msg.save();
        const populatedMessage = await this.channelMessageModel
            .findById(msg._id)
            .populate("replyTo", "content senderId createdAt")
            .lean();
        const formattedMessage = {
            ...populatedMessage,
            replyTo: populatedMessage?.replyTo || null,
        };
        return formattedMessage;
    }
    async deleteMessage(messageId, requesterUserDehiveId) {
        if (!mongoose_2.Types.ObjectId.isValid(messageId)) {
            throw new common_1.BadRequestException("Invalid message id");
        }
        if (!mongoose_2.Types.ObjectId.isValid(requesterUserDehiveId)) {
            throw new common_1.BadRequestException("Invalid user id");
        }
        const msg = await this.channelMessageModel.findById(messageId);
        if (!msg)
            throw new common_1.NotFoundException("Message not found");
        if (String(msg.senderId) !== requesterUserDehiveId) {
            throw new common_1.BadRequestException("You can only delete your own message");
        }
        msg.isDeleted = true;
        msg.content = "[deleted]";
        msg.attachments = [];
        await msg.save();
        const populatedMessage = await this.channelMessageModel
            .findById(msg._id)
            .populate("replyTo", "content senderId createdAt")
            .lean();
        const formattedMessage = {
            ...populatedMessage,
            replyTo: populatedMessage?.replyTo || null,
        };
        return formattedMessage;
    }
    async listUploads(params) {
        const { serverId, userId, type, page, limit } = params;
        if (!serverId || !mongoose_2.Types.ObjectId.isValid(serverId)) {
            throw new common_1.BadRequestException("Invalid serverId");
        }
        if (!userId || !mongoose_2.Types.ObjectId.isValid(userId)) {
            throw new common_1.BadRequestException("Invalid user_dehive_id");
        }
        const membership = await this.userDehiveServerModel.exists({
            user_dehive_id: userId,
            server_id: new mongoose_2.Types.ObjectId(serverId),
        });
        if (!membership) {
            throw new common_1.BadRequestException("User is not a member of this server");
        }
        const query = {
            serverId: new mongoose_2.Types.ObjectId(serverId),
        };
        query.ownerId = new mongoose_2.Types.ObjectId(userId);
        if (type) {
            const allowed = new Set([
                enum_1.AttachmentType.IMAGE,
                enum_1.AttachmentType.VIDEO,
                enum_1.AttachmentType.AUDIO,
                enum_1.AttachmentType.FILE,
            ]);
            if (!allowed.has(type)) {
                throw new common_1.BadRequestException("Invalid type");
            }
            query.type = type;
        }
        const skip = page * limit;
        const [items, total] = await Promise.all([
            this.uploadModel
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.uploadModel.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / limit);
        const isLastPage = page >= totalPages - 1;
        return {
            items: items.map((u) => ({
                _id: u._id,
                type: u.type,
                url: u.url,
                name: u.name,
                size: u.size,
                mimeType: u.mimeType,
                width: u.width,
                height: u.height,
                durationMs: u.durationMs,
                thumbnailUrl: u.thumbnailUrl,
                createdAt: u?.createdAt,
            })),
            metadata: {
                page,
                limit,
                total: items.length,
                is_last_page: isLastPage,
            },
        };
    }
};
exports.MessagingService = MessagingService;
exports.MessagingService = MessagingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(channel_message_schema_1.ChannelMessage.name)),
    __param(1, (0, mongoose_1.InjectModel)(channel_conversation_schema_1.ChannelConversation.name)),
    __param(2, (0, mongoose_1.InjectModel)(upload_schema_1.Upload.name)),
    __param(3, (0, mongoose_1.InjectModel)(user_dehive_server_schema_1.UserDehiveServer.name)),
    __param(4, (0, mongoose_1.InjectModel)(user_dehive_schema_1.UserDehive.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        auth_service_client_1.AuthServiceClient])
], MessagingService);


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
const openapi = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
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
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String, minLength: 1, maxLength: 100 }, type: { required: true, enum: (__webpack_require__(/*! ./create-channel.dto */ "./apps/server/dto/create-channel.dto.ts").ChannelType) }, topic: { required: false, type: () => String, minLength: 0, maxLength: 1024 } };
    }
}
exports.CreateChannelDto = CreateChannelDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "The name of the new channel.",
        example: "general-chat",
    }),
    (0, class_validator_1.IsString)({ message: "Name must be a string." }),
    (0, class_validator_1.IsNotEmpty)({ message: "Name cannot be empty." }),
    (0, class_validator_1.Length)(1, 100, { message: "Name must be between 1 and 100 characters." }),
    __metadata("design:type", String)
], CreateChannelDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "The type of the channel.",
        enum: ChannelType,
        example: ChannelType.TEXT,
    }),
    (0, class_validator_1.IsEnum)(ChannelType, { message: "Type must be either TEXT or VOICE." }),
    (0, class_validator_1.IsNotEmpty)({ message: "Type cannot be empty." }),
    __metadata("design:type", String)
], CreateChannelDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "The topic of the channel (optional).",
        example: "General discussion for all members.",
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 1024, { message: "Topic must not exceed 1024 characters." }),
    __metadata("design:type", String)
], CreateChannelDto.prototype, "topic", void 0);


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
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "Server", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Category.prototype, "server_id", void 0);
exports.Category = Category = __decorate([
    (0, mongoose_1.Schema)({ collection: "category", timestamps: true })
], Category);
exports.CategorySchema = mongoose_1.SchemaFactory.createForClass(Category);


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
    __metadata("design:type", String)
], Channel.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "Category", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Channel.prototype, "category_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, maxlength: 1024 }),
    __metadata("design:type", String)
], Channel.prototype, "topic", void 0);
exports.Channel = Channel = __decorate([
    (0, mongoose_1.Schema)({ collection: "channel", timestamps: true })
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
    (0, mongoose_1.Schema)({ collection: "server", timestamps: true })
], Server);
exports.ServerSchema = mongoose_1.SchemaFactory.createForClass(Server);


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
        ref: "UserDehive",
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], UserDehiveServer.prototype, "user_dehive_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "Server", required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], UserDehiveServer.prototype, "server_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: enum_1.ServerRole, default: enum_1.ServerRole.MEMBER }),
    __metadata("design:type", String)
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
    __metadata("design:type", Date)
], UserDehiveServer.prototype, "joined_at", void 0);
exports.UserDehiveServer = UserDehiveServer = __decorate([
    (0, mongoose_1.Schema)({ collection: "user_dehive_server", timestamps: true })
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
        default: "USER",
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
    (0, mongoose_1.Prop)({ type: String, default: "" }),
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
        collection: "user_dehive",
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

/***/ "axios":
/*!************************!*\
  !*** external "axios" ***!
  \************************/
/***/ ((module) => {

module.exports = require("axios");

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
/*!********************************************!*\
  !*** ./apps/channel-messaging/src/main.ts ***!
  \********************************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
const core_1 = __webpack_require__(/*! @nestjs/core */ "@nestjs/core");
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const channel_messaging_module_1 = __webpack_require__(/*! ./channel-messaging.module */ "./apps/channel-messaging/src/channel-messaging.module.ts");
const platform_socket_io_1 = __webpack_require__(/*! @nestjs/platform-socket.io */ "@nestjs/platform-socket.io");
const express = __webpack_require__(/*! express */ "express");
const path = __webpack_require__(/*! path */ "path");
async function bootstrap() {
    const app = await core_1.NestFactory.create(channel_messaging_module_1.MessagingModule);
    const configService = app.get(config_1.ConfigService);
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    app.enableCors({ origin: "*" });
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
    const config = new swagger_1.DocumentBuilder()
        .setTitle("Dehive - Channel Messaging Service")
        .setDescription("API and WebSocket documentation for real-time channel chat.")
        .setVersion("1.0")
        .addTag("Channel Messages")
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup("api-docs", app, document);
    const port = configService.get("CHANNEL_MESSAGING_PORT") || 4003;
    const host = configService.get("CLOUD_HOST") || "localhost";
    await app.listen(port, host);
    console.log(`[Dehive] Channel-Messaging service is running on: ${await app.getUrl()}`);
    console.log(`[Dehive] Swagger UI available at: http://localhost:${port}/api-docs`);
}
void bootstrap();

})();

/******/ })()
;
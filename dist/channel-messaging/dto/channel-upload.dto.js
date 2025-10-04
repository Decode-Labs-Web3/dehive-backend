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
exports.UploadResponseDto = exports.UploadInitDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const enum_1 = require("../enum/enum");
class UploadInitDto {
    serverId;
    conversationId;
}
exports.UploadInitDto = UploadInitDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Server ID for permission check' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], UploadInitDto.prototype, "serverId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Channel ConversationId ID for permission check',
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
}
exports.UploadResponseDto = UploadResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Upload ID (MongoId) to reference in chat' }),
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
    (0, swagger_1.ApiProperty)({ description: 'File size in bytes' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UploadResponseDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'image/jpeg' }),
    __metadata("design:type", String)
], UploadResponseDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Error message if upload failed' }),
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
//# sourceMappingURL=channel-upload.dto.js.map
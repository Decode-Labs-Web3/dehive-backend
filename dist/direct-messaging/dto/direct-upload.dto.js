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
exports.DirectUploadResponseDto = exports.DirectUploadInitDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const enum_1 = require("../enum/enum");
class DirectUploadInitDto {
    conversationId;
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
//# sourceMappingURL=direct-upload.dto.js.map
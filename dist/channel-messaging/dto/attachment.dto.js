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
exports.AttachmentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const enum_1 = require("../enum/enum");
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
}
exports.AttachmentDto = AttachmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: enum_1.AttachmentType }),
    (0, class_validator_1.IsEnum)(enum_1.AttachmentType),
    __metadata("design:type", String)
], AttachmentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Public URL to access the file' }),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], AttachmentDto.prototype, "url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Original file name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AttachmentDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'File size in bytes', example: 123456 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], AttachmentDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'MIME type of the file', example: 'image/jpeg' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AttachmentDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Width in pixels (image/video)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AttachmentDto.prototype, "width", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Height in pixels (image/video)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AttachmentDto.prototype, "height", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Duration in milliseconds (audio/video)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], AttachmentDto.prototype, "durationMs", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Thumbnail/preview URL (image/video)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttachmentDto.prototype, "thumbnailUrl", void 0);
//# sourceMappingURL=attachment.dto.js.map
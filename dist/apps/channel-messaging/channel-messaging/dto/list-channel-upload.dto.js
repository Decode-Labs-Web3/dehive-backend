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
exports.ListUploadsDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const enum_1 = require("../enum/enum");
class ListUploadsDto {
    serverId;
    type;
    page = 1;
    limit = 30;
    static _OPENAPI_METADATA_FACTORY() {
        return { serverId: { required: true, type: () => String }, type: { required: false, enum: require("../enum/enum").AttachmentType }, page: { required: true, type: () => Object, default: 1, minimum: 1 }, limit: { required: true, type: () => Object, default: 30, minimum: 1, maximum: 100 } };
    }
}
exports.ListUploadsDto = ListUploadsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Server ID for scoping and permission',
        example: '68db1234abcd5678efgh9013',
    }),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], ListUploadsDto.prototype, "serverId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by attachment type',
        enum: enum_1.AttachmentType,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(enum_1.AttachmentType),
    __metadata("design:type", String)
], ListUploadsDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Page number (starting at 1)',
        default: 1,
        type: Number,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], ListUploadsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Items per page (max 100)',
        default: 30,
        type: Number,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], ListUploadsDto.prototype, "limit", void 0);
//# sourceMappingURL=list-channel-upload.dto.js.map
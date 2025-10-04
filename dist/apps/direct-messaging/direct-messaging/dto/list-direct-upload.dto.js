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
exports.ListDirectUploadsDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const enum_1 = require("../enum/enum");
class ListDirectUploadsDto {
    type;
    page = 1;
    limit = 50;
    static _OPENAPI_METADATA_FACTORY() {
        return { type: { required: false, enum: require("../enum/enum").AttachmentType }, page: { required: true, type: () => Object, default: 1, minimum: 1 }, limit: { required: true, type: () => Object, default: 50, minimum: 1, maximum: 100 } };
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
//# sourceMappingURL=list-direct-upload.dto.js.map
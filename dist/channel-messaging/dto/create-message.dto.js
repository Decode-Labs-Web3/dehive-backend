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
exports.CreateMessageDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const attachment_dto_1 = require("./attachment.dto");
class CreateMessageDto {
    conversationId;
    content;
    uploadIds;
    attachments;
}
exports.CreateMessageDto = CreateMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the channel conversation to send the message to.',
        example: '68c5adb6ec465897d540c58',
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'conversationId is required' }),
    (0, class_validator_1.IsMongoId)({ message: 'conversationId must be a valid MongoId' }),
    __metadata("design:type", String)
], CreateMessageDto.prototype, "conversationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The text content of the message (empty string if only sending files)',
        example: 'Hello everyone! How is the project going?',
        maxLength: 2000,
        default: '',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 2000),
    __metadata("design:type", String)
], CreateMessageDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [String],
        description: 'List of upload IDs to attach (empty array if no files)',
        example: ['68db1234abcd5678efgh9013'],
        default: [],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsMongoId)({ each: true, message: 'Each uploadId must be a valid MongoId' }),
    __metadata("design:type", Array)
], CreateMessageDto.prototype, "uploadIds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: [attachment_dto_1.AttachmentDto],
        description: 'Optional explicit attachments; server may ignore if uploadIds provided',
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateMessageDto.prototype, "attachments", void 0);
//# sourceMappingURL=create-message.dto.js.map
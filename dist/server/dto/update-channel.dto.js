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
exports.UpdateChannelDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateChannelDto {
    name;
    topic;
    position;
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
        description: 'The new position of the channel in the list.',
        example: 0,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateChannelDto.prototype, "position", void 0);
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
//# sourceMappingURL=update-channel.dto.js.map
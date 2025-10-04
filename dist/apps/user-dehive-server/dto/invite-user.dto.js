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
exports.InviteUserDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class InviteUserDto {
    inviter_id;
    invitee_id;
    server_id;
}
exports.InviteUserDto = InviteUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The Dehive Profile ID of the user sending the invite.',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], InviteUserDto.prototype, "inviter_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The Dehive Profile ID of the user being invited.',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], InviteUserDto.prototype, "invitee_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The ID of the server to invite to.' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], InviteUserDto.prototype, "server_id", void 0);
//# sourceMappingURL=invite-user.dto.js.map
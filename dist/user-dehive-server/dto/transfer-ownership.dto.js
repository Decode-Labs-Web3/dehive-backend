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
exports.TransferOwnershipDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
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
//# sourceMappingURL=transfer-ownership.dto.js.map
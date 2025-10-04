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
exports.AssignRoleDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const enum_1 = require("../enum/enum");
class AssignRoleDto {
    server_id;
    target_session_id;
    role;
}
exports.AssignRoleDto = AssignRoleDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the server.',
        example: '68c5adb6ec465897d540c58',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], AssignRoleDto.prototype, "server_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The session ID of the target user to assign role.',
        example: 'c7b3ae91-ca16-4c53-bb61-21eac681457d',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AssignRoleDto.prototype, "target_session_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The new role to assign.',
        enum: enum_1.ServerRole,
        example: enum_1.ServerRole.MODERATOR,
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(enum_1.ServerRole),
    __metadata("design:type", String)
], AssignRoleDto.prototype, "role", void 0);
//# sourceMappingURL=assign-role.dto.js.map
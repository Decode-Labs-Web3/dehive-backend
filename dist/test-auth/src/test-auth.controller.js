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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestAuthController = void 0;
const common_1 = require("@nestjs/common");
const test_auth_service_1 = require("./test-auth.service");
const auth_guard_1 = require("./common/guards/auth.guard");
const current_user_decorator_1 = require("./common/decorators/current-user.decorator");
let TestAuthController = class TestAuthController {
    testAuthService;
    constructor(testAuthService) {
        this.testAuthService = testAuthService;
    }
    getPublicMessage() {
        return {
            message: 'This is a public endpoint - no authentication required',
            timestamp: new Date().toISOString(),
        };
    }
    getProtectedMessage(user) {
        return {
            message: 'This endpoint is protected by AuthGuard',
            user,
            timestamp: new Date().toISOString(),
        };
    }
};
exports.TestAuthController = TestAuthController;
__decorate([
    (0, common_1.Get)('public'),
    (0, auth_guard_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], TestAuthController.prototype, "getPublicMessage", null);
__decorate([
    (0, common_1.Get)('protected'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], TestAuthController.prototype, "getProtectedMessage", null);
exports.TestAuthController = TestAuthController = __decorate([
    (0, common_1.Controller)('test-auth'),
    __metadata("design:paramtypes", [test_auth_service_1.TestAuthService])
], TestAuthController);
//# sourceMappingURL=test-auth.controller.js.map
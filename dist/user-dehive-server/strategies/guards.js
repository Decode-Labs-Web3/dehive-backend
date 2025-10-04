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
exports.IsModeratorGuard = exports.IsMemberGuard = exports.IsServerOwnerGuard = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const enum_1 = require("../enum/enum");
function getRequestBody(context) {
    const request = context.switchToHttp().getRequest();
    return request.body;
}
let IsServerOwnerGuard = class IsServerOwnerGuard {
    userDehiveServerModel;
    constructor(userDehiveServerModel) {
        this.userDehiveServerModel = userDehiveServerModel;
    }
    async canActivate(context) {
        const { user_dehive_id, server_id } = getRequestBody(context);
        if (!user_dehive_id || !server_id) {
            return false;
        }
        const membership = await this.userDehiveServerModel
            .findOne({
            user_dehive_id: new mongoose_2.Types.ObjectId(user_dehive_id),
            server_id: new mongoose_2.Types.ObjectId(server_id),
            role: enum_1.ServerRole.OWNER,
        })
            .lean();
        if (!membership) {
            throw new common_1.ForbiddenException('Only the server owner can perform this action');
        }
        return true;
    }
};
exports.IsServerOwnerGuard = IsServerOwnerGuard;
exports.IsServerOwnerGuard = IsServerOwnerGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('UserDehiveServer')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], IsServerOwnerGuard);
let IsMemberGuard = class IsMemberGuard {
    userDehiveServerModel;
    constructor(userDehiveServerModel) {
        this.userDehiveServerModel = userDehiveServerModel;
    }
    async canActivate(context) {
        const { user_dehive_id, server_id } = getRequestBody(context);
        if (!user_dehive_id || !server_id) {
            return false;
        }
        const membership = await this.userDehiveServerModel
            .findOne({
            user_dehive_id: new mongoose_2.Types.ObjectId(user_dehive_id),
            server_id: new mongoose_2.Types.ObjectId(server_id),
            is_banned: false,
        })
            .lean();
        return !!membership;
    }
};
exports.IsMemberGuard = IsMemberGuard;
exports.IsMemberGuard = IsMemberGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('UserDehiveServer')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], IsMemberGuard);
let IsModeratorGuard = class IsModeratorGuard {
    userDehiveServerModel;
    constructor(userDehiveServerModel) {
        this.userDehiveServerModel = userDehiveServerModel;
    }
    async canActivate(context) {
        const { server_id, moderator_id } = getRequestBody(context);
        if (!server_id || !moderator_id) {
            return false;
        }
        const moderator = await this.userDehiveServerModel
            .findOne({
            server_id: new mongoose_2.Types.ObjectId(server_id),
            user_dehive_id: new mongoose_2.Types.ObjectId(moderator_id),
            is_banned: false,
            role: { $in: [enum_1.ServerRole.OWNER, enum_1.ServerRole.MODERATOR] },
        })
            .lean();
        if (!moderator) {
            throw new common_1.ForbiddenException('Only owners and moderators can perform this action');
        }
        return true;
    }
};
exports.IsModeratorGuard = IsModeratorGuard;
exports.IsModeratorGuard = IsModeratorGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('UserDehiveServer')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], IsModeratorGuard);
//# sourceMappingURL=guards.js.map
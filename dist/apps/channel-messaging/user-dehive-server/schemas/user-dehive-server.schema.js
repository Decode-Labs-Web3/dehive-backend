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
exports.UserDehiveServerSchema = exports.UserDehiveServer = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const enum_1 = require("../enum/enum");
let UserDehiveServer = class UserDehiveServer {
    user_dehive_id;
    server_id;
    role;
    is_muted;
    is_banned;
    joined_at;
};
exports.UserDehiveServer = UserDehiveServer;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'UserDehive',
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], UserDehiveServer.prototype, "user_dehive_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Server', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], UserDehiveServer.prototype, "server_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: enum_1.ServerRole, default: enum_1.ServerRole.MEMBER }),
    __metadata("design:type", String)
], UserDehiveServer.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], UserDehiveServer.prototype, "is_muted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], UserDehiveServer.prototype, "is_banned", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], UserDehiveServer.prototype, "joined_at", void 0);
exports.UserDehiveServer = UserDehiveServer = __decorate([
    (0, mongoose_1.Schema)({ collection: 'user_dehive_server', timestamps: true })
], UserDehiveServer);
exports.UserDehiveServerSchema = mongoose_1.SchemaFactory.createForClass(UserDehiveServer);
exports.UserDehiveServerSchema.index({
    user_dehive_id: 1,
    server_id: 1,
}, { unique: true });
//# sourceMappingURL=user-dehive-server.schema.js.map
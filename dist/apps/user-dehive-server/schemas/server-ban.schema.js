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
exports.ServerBanSchema = exports.ServerBan = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ServerBan = class ServerBan {
    server_id;
    user_dehive_id;
    banned_by;
    reason;
    expires_at;
};
exports.ServerBan = ServerBan;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Server', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ServerBan.prototype, "server_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'UserDehive', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ServerBan.prototype, "user_dehive_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'UserDehive', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ServerBan.prototype, "banned_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], ServerBan.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: false }),
    __metadata("design:type", Date)
], ServerBan.prototype, "expires_at", void 0);
exports.ServerBan = ServerBan = __decorate([
    (0, mongoose_1.Schema)({ collection: 'server_ban', timestamps: true })
], ServerBan);
exports.ServerBanSchema = mongoose_1.SchemaFactory.createForClass(ServerBan);
exports.ServerBanSchema.index({ server_id: 1, user_dehive_id: 1 }, { unique: true });
//# sourceMappingURL=server-ban.schema.js.map
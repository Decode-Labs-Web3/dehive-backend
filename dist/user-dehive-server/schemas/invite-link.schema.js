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
exports.InviteLinkSchema = exports.InviteLink = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let InviteLink = class InviteLink {
    code;
    server_id;
    expiredAt;
    creator_id;
    isUsed;
};
exports.InviteLink = InviteLink;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], InviteLink.prototype, "code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true, ref: 'Server' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], InviteLink.prototype, "server_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], InviteLink.prototype, "expiredAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true, ref: 'UserDehive' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], InviteLink.prototype, "creator_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], InviteLink.prototype, "isUsed", void 0);
exports.InviteLink = InviteLink = __decorate([
    (0, mongoose_1.Schema)({ collection: 'invite_link', timestamps: true })
], InviteLink);
exports.InviteLinkSchema = mongoose_1.SchemaFactory.createForClass(InviteLink);
//# sourceMappingURL=invite-link.schema.js.map
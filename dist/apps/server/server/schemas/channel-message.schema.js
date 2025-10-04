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
exports.ChannelMessageSchema = exports.ChannelMessage = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ChannelMessage = class ChannelMessage {
    message;
    sender;
    channel_id;
    is_encrypted;
    attachments;
    is_edited;
};
exports.ChannelMessage = ChannelMessage;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 2000 }),
    __metadata("design:type", String)
], ChannelMessage.prototype, "message", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'UserDehive', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChannelMessage.prototype, "sender", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Channel', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChannelMessage.prototype, "channel_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChannelMessage.prototype, "is_encrypted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ type: Object }], default: [] }),
    __metadata("design:type", Array)
], ChannelMessage.prototype, "attachments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChannelMessage.prototype, "is_edited", void 0);
exports.ChannelMessage = ChannelMessage = __decorate([
    (0, mongoose_1.Schema)({ collection: 'channel_message', timestamps: true })
], ChannelMessage);
exports.ChannelMessageSchema = mongoose_1.SchemaFactory.createForClass(ChannelMessage);
//# sourceMappingURL=channel-message.schema.js.map
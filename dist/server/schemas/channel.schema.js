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
exports.ChannelSchema = exports.Channel = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const create_channel_dto_1 = require("../dto/create-channel.dto");
let Channel = class Channel {
    name;
    type;
    category_id;
    topic;
    position;
};
exports.Channel = Channel;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 100 }),
    __metadata("design:type", String)
], Channel.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: create_channel_dto_1.ChannelType, required: true }),
    __metadata("design:type", String)
], Channel.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Category', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Channel.prototype, "category_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, maxlength: 1024 }),
    __metadata("design:type", String)
], Channel.prototype, "topic", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], Channel.prototype, "position", void 0);
exports.Channel = Channel = __decorate([
    (0, mongoose_1.Schema)({ collection: 'channel', timestamps: true })
], Channel);
exports.ChannelSchema = mongoose_1.SchemaFactory.createForClass(Channel);
//# sourceMappingURL=channel.schema.js.map
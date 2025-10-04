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
exports.DirectConversationSchema = exports.DirectConversation = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let DirectConversation = class DirectConversation {
    userA;
    userB;
    is_encrypted;
};
exports.DirectConversation = DirectConversation;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'UserDehive',
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DirectConversation.prototype, "userA", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'UserDehive',
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DirectConversation.prototype, "userB", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Boolean)
], DirectConversation.prototype, "is_encrypted", void 0);
exports.DirectConversation = DirectConversation = __decorate([
    (0, mongoose_1.Schema)({ collection: 'direct_conversation', timestamps: true })
], DirectConversation);
exports.DirectConversationSchema = mongoose_1.SchemaFactory.createForClass(DirectConversation);
exports.DirectConversationSchema.pre('save', function (next) {
    if (this.userA.toString() > this.userB.toString()) {
        const temp = this.userA;
        this.userA = this.userB;
        this.userB = temp;
    }
    next();
});
exports.DirectConversationSchema.index({ userA: 1, userB: 1 }, { unique: true });
//# sourceMappingURL=direct-conversation.schema.js.map
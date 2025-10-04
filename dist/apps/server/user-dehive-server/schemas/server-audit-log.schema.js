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
exports.ServerAuditLogSchema = exports.ServerAuditLog = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const enum_1 = require("../enum/enum");
let ServerAuditLog = class ServerAuditLog {
    server_id;
    actor_id;
    target_id;
    action;
    changes;
    reason;
};
exports.ServerAuditLog = ServerAuditLog;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Server', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ServerAuditLog.prototype, "server_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'UserDehive', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ServerAuditLog.prototype, "actor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'UserDehive', required: false }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ServerAuditLog.prototype, "target_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(enum_1.AuditLogAction), required: true }),
    __metadata("design:type", String)
], ServerAuditLog.prototype, "action", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: false }),
    __metadata("design:type", Object)
], ServerAuditLog.prototype, "changes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", String)
], ServerAuditLog.prototype, "reason", void 0);
exports.ServerAuditLog = ServerAuditLog = __decorate([
    (0, mongoose_1.Schema)({ collection: 'server_audit_log', timestamps: true })
], ServerAuditLog);
exports.ServerAuditLogSchema = mongoose_1.SchemaFactory.createForClass(ServerAuditLog);
//# sourceMappingURL=server-audit-log.schema.js.map
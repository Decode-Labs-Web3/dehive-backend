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
exports.NotificationCache = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
let NotificationCache = class NotificationCache {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    getKey(userId, serverId) {
        return `notification:${userId}:${serverId}`;
    }
    async setNotificationPreference(userId, serverId, isMuted) {
        const key = this.getKey(userId.toString(), serverId.toString());
        await this.redis.set(key, isMuted ? '1' : '0');
    }
    async getNotificationPreference(userId, serverId) {
        const key = this.getKey(userId.toString(), serverId.toString());
        const value = await this.redis.get(key);
        return value === '1';
    }
};
exports.NotificationCache = NotificationCache;
exports.NotificationCache = NotificationCache = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [ioredis_2.default])
], NotificationCache);
//# sourceMappingURL=notification.cache.js.map
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
var RateLimitMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitMiddleware = void 0;
const common_1 = require("@nestjs/common");
let RateLimitMiddleware = RateLimitMiddleware_1 = class RateLimitMiddleware {
    constructor() {
        this.logger = new common_1.Logger(RateLimitMiddleware_1.name);
        this.rateLimitStore = new Map();
        this.maxRequests = 100;
        this.windowMs = 15 * 60 * 1000;
        this.cleanupInterval = 5 * 60 * 1000;
        setInterval(() => {
            this.cleanupExpiredEntries();
        }, this.cleanupInterval);
    }
    use(req, res, next) {
        const clientId = this.getClientId(req);
        const now = Date.now();
        let rateLimitInfo = this.rateLimitStore.get(clientId);
        if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
            rateLimitInfo = {
                count: 0,
                resetTime: now + this.windowMs
            };
        }
        rateLimitInfo.count++;
        this.rateLimitStore.set(clientId, rateLimitInfo);
        if (rateLimitInfo.count > this.maxRequests) {
            this.logger.warn(`Rate limit exceeded for client ${clientId}: ${rateLimitInfo.count}/${this.maxRequests}`);
            const resetTime = new Date(rateLimitInfo.resetTime);
            throw new common_1.HttpException({
                message: 'Too many requests',
                statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                retryAfter: Math.ceil((rateLimitInfo.resetTime - now) / 1000),
                resetTime: resetTime.toISOString()
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - rateLimitInfo.count).toString());
        res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime / 1000).toString());
        next();
    }
    getClientId(req) {
        return req.ip || req.connection.remoteAddress || 'unknown';
    }
    cleanupExpiredEntries() {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [clientId, rateLimitInfo] of this.rateLimitStore.entries()) {
            if (now > rateLimitInfo.resetTime) {
                this.rateLimitStore.delete(clientId);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            this.logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
        }
    }
    getRateLimitStats() {
        const stats = {};
        for (const [clientId, info] of this.rateLimitStore.entries()) {
            stats[clientId] = { ...info };
        }
        return stats;
    }
};
exports.RateLimitMiddleware = RateLimitMiddleware;
exports.RateLimitMiddleware = RateLimitMiddleware = RateLimitMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RateLimitMiddleware);
//# sourceMappingURL=rate-limit.middleware.js.map
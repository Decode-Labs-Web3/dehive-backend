"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SecurityMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityMiddleware = void 0;
const common_1 = require("@nestjs/common");
let SecurityMiddleware = SecurityMiddleware_1 = class SecurityMiddleware {
    constructor() {
        this.logger = new common_1.Logger(SecurityMiddleware_1.name);
    }
    use(req, res, next) {
        this.addSecurityHeaders(res);
        this.logSuspiciousRequests(req);
        this.validateRequest(req);
        next();
    }
    addSecurityHeaders(res) {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    }
    logSuspiciousRequests(req) {
        const { method, url, headers, ip } = req;
        const suspiciousPatterns = [
            /\.\./,
            /<script/i,
            /union.*select/i,
            /eval\(/i,
            /javascript:/i,
            /vbscript:/i,
            /onload=/i,
            /onerror=/i,
        ];
        const userAgent = headers['user-agent'] || '';
        const fullUrl = `${method} ${url}`;
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(url) || pattern.test(userAgent)) {
                this.logger.warn(`🚨 Suspicious request detected from ${ip}: ${fullUrl}`);
                this.logger.warn(`User-Agent: ${userAgent}`);
                break;
            }
        }
        const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip'];
        for (const header of suspiciousHeaders) {
            if (headers[header]) {
                this.logger.debug(`Request with ${header}: ${headers[header]} from ${ip}`);
            }
        }
    }
    validateRequest(req) {
        const { method, url, headers } = req;
        const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
        if (!allowedMethods.includes(method.toUpperCase())) {
            this.logger.warn(`Invalid HTTP method: ${method} for ${url}`);
        }
        if (url.length > 2048) {
            this.logger.warn(`URL too long: ${url.length} characters for ${url}`);
        }
        if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            const contentType = headers['content-type'];
            if (!contentType) {
                this.logger.warn(`Missing Content-Type header for ${method} ${url}`);
            }
        }
        const contentLength = parseInt(headers['content-length'] || '0');
        if (contentLength > 10 * 1024 * 1024) {
            this.logger.warn(`Request too large: ${contentLength} bytes for ${method} ${url}`);
        }
    }
};
exports.SecurityMiddleware = SecurityMiddleware;
exports.SecurityMiddleware = SecurityMiddleware = SecurityMiddleware_1 = __decorate([
    (0, common_1.Injectable)()
], SecurityMiddleware);
//# sourceMappingURL=security.middleware.js.map
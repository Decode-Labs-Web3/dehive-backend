"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('jwt', () => ({
    secret: {
        servicesToken: process.env.JWT_SERVICE_TOKEN_SECRET,
    },
    servicesToken: {
        expiresIn: '5s',
        algorithm: 'HS256',
        issuer: 'dehive-auth-service',
        audience: 'dehive-auth-service',
        servicesIssuer: 'dehive-services',
    },
}));
//# sourceMappingURL=jwt.config.js.map
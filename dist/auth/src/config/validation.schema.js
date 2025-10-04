"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationSchema = void 0;
const Joi = require("joi");
exports.validationSchema = Joi.object({
    API_GATEWAY_PORT: Joi.number().default(4000),
    API_GATEWAY_HOST: Joi.string().default('0.0.0.0'),
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    AUTH_HOST: Joi.string().uri().default('http://localhost'),
    AUTH_PORT: Joi.number().default(4001),
    USER_HOST: Joi.string().uri().default('http://localhost'),
    USER_PORT: Joi.number().default(4002),
    EMAIL_HOST: Joi.string().uri().default('http://localhost'),
    EMAIL_PORT: Joi.number().default(4003),
    RELATIONSHIP_HOST: Joi.string().uri().default('http://localhost'),
    RELATIONSHIP_PORT: Joi.number().default(4004),
    WALLET_HOST: Joi.string().uri().default('http://localhost'),
    WALLET_PORT: Joi.number().default(4005),
    JWT_SECRET: Joi.string().min(32).required(),
    CACHE_TTL: Joi.number().default(300),
});
//# sourceMappingURL=validation.schema.js.map
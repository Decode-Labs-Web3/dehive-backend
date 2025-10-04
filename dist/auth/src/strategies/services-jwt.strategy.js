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
var ServicesJwtStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesJwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
let ServicesJwtStrategy = ServicesJwtStrategy_1 = class ServicesJwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    jwtService;
    configService;
    logger = new common_1.Logger(ServicesJwtStrategy_1.name);
    constructor(jwtService, configService) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('jwt.secret.servicesToken') || '',
            issuer: configService.get('jwt.servicesToken.issuer') || '',
            audience: configService.get('jwt.servicesToken.audience') || '',
        });
        this.jwtService = jwtService;
        this.configService = configService;
    }
    validate(payload) {
        return {
            from_service: payload.from_service,
            to_service: payload.to_service,
        };
    }
    validateServicesToken(services_token) {
        try {
            const payload = this.jwtService.verify(services_token, {
                secret: this.configService.get('jwt.secret.servicesToken'),
                issuer: this.configService.get('jwt.servicesToken.servicesIssuer'),
                audience: this.configService.get('jwt.servicesToken.audience'),
            });
            if (payload.from_service !=
                (this.configService.get('jwt.servicesToken.servicesIssuer') ||
                    'dehive-services') ||
                payload.to_service !=
                    (this.configService.get('jwt.servicesToken.audience') ||
                        'dehive-auth-service')) {
                return {
                    success: false,
                    statusCode: 401,
                    message: 'Invalid services token',
                };
            }
            this.logger.log(`Services token validated successfully`);
            return {
                success: true,
                statusCode: 200,
                message: 'Services token validated',
                data: payload,
            };
        }
        catch {
            return {
                success: false,
                statusCode: 401,
                message: 'Invalid services token',
            };
        }
    }
};
exports.ServicesJwtStrategy = ServicesJwtStrategy;
exports.ServicesJwtStrategy = ServicesJwtStrategy = ServicesJwtStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], ServicesJwtStrategy);
//# sourceMappingURL=services-jwt.strategy.js.map
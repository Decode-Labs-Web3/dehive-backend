"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const auth_controller_1 = require("./auth.controller");
const session_service_1 = require("./services/session.service");
const register_service_1 = require("./services/register.service");
const user_service_1 = require("./services/user.service");
const mongoose_1 = require("@nestjs/mongoose");
const user_dehive_schema_1 = require("./schemas/user-dehive.schema");
const config_1 = require("@nestjs/config");
const decode_api_client_1 = require("./infrastructure/external-services/decode-api.client");
const redis_infrastructure_1 = require("./infrastructure/redis.infrastructure");
const ioredis_1 = require("@nestjs-modules/ioredis");
const axios_1 = require("@nestjs/axios");
const configuration_1 = require("./config/configuration");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    uri: config.get('MONGO_URI'),
                    dbName: 'dehive_db',
                }),
                inject: [config_1.ConfigService],
            }),
            axios_1.HttpModule,
            ioredis_1.RedisModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    type: 'single',
                    url: config.get('REDIS_URI'),
                }),
                inject: [config_1.ConfigService],
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: 'UserDehive', schema: user_dehive_schema_1.UserDehiveSchema },
            ]),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            session_service_1.SessionService,
            register_service_1.RegisterService,
            user_service_1.UserService,
            decode_api_client_1.DecodeApiClient,
            redis_infrastructure_1.RedisInfrastructure,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map
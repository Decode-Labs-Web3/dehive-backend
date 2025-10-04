"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDehiveServerModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const axios_1 = require("@nestjs/axios");
const ioredis_1 = require("@nestjs-modules/ioredis");
const user_dehive_server_controller_1 = require("./user-dehive-server.controller");
const user_dehive_server_service_1 = require("./user-dehive-server.service");
const user_dehive_schema_1 = require("../schemas/user-dehive.schema");
const server_schema_1 = require("../schemas/server.schema");
const invite_link_schema_1 = require("../schemas/invite-link.schema");
const server_audit_log_schema_1 = require("../schemas/server-audit-log.schema");
const server_ban_schema_1 = require("../schemas/server-ban.schema");
const user_dehive_server_schema_1 = require("../schemas/user-dehive-server.schema");
const auth_guard_1 = require("../common/guards/auth.guard");
const MONGOOSE_MODELS = mongoose_1.MongooseModule.forFeature([
    { name: 'UserDehive', schema: user_dehive_schema_1.UserDehiveSchema },
    { name: 'UserDehiveServer', schema: user_dehive_server_schema_1.UserDehiveServerSchema },
    { name: 'Server', schema: server_schema_1.ServerSchema },
    { name: 'ServerBan', schema: server_ban_schema_1.ServerBanSchema },
    { name: 'InviteLink', schema: invite_link_schema_1.InviteLinkSchema },
]);
let UserDehiveServerModule = class UserDehiveServerModule {
};
exports.UserDehiveServerModule = UserDehiveServerModule;
exports.UserDehiveServerModule = UserDehiveServerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            axios_1.HttpModule.register({
                timeout: 5000,
                maxRedirects: 5,
            }),
            ioredis_1.RedisModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    type: 'single',
                    url: config.get('REDIS_URI'),
                }),
                inject: [config_1.ConfigService],
            }),
            MONGOOSE_MODELS,
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    uri: configService.get('MONGODB_URI'),
                    dbName: 'dehive_db',
                }),
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: user_dehive_schema_1.UserDehive.name, schema: user_dehive_schema_1.UserDehiveSchema },
                { name: server_schema_1.Server.name, schema: server_schema_1.ServerSchema },
                { name: invite_link_schema_1.InviteLink.name, schema: invite_link_schema_1.InviteLinkSchema },
                { name: server_audit_log_schema_1.ServerAuditLog.name, schema: server_audit_log_schema_1.ServerAuditLogSchema },
                { name: server_ban_schema_1.ServerBan.name, schema: server_ban_schema_1.ServerBanSchema },
                { name: user_dehive_server_schema_1.UserDehiveServer.name, schema: user_dehive_server_schema_1.UserDehiveServerSchema },
            ]),
        ],
        controllers: [user_dehive_server_controller_1.UserDehiveServerController],
        providers: [user_dehive_server_service_1.UserDehiveServerService, auth_guard_1.AuthGuard],
        exports: [user_dehive_server_service_1.UserDehiveServerService, MONGOOSE_MODELS],
    })
], UserDehiveServerModule);
//# sourceMappingURL=user-dehive-server.module.js.map
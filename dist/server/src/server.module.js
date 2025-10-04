"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const axios_1 = require("@nestjs/axios");
const server_controller_1 = require("./server.controller");
const server_service_1 = require("./server.service");
const server_schema_1 = require("../schemas/server.schema");
const category_schema_1 = require("../schemas/category.schema");
const channel_schema_1 = require("../schemas/channel.schema");
const user_dehive_schema_1 = require("../../user-dehive-server/schemas/user-dehive.schema");
const user_dehive_server_schema_1 = require("../../user-dehive-server/schemas/user-dehive-server.schema");
const channel_message_schema_1 = require("../schemas/channel-message.schema");
const user_dehive_server_module_1 = require("../../user-dehive-server/src/user-dehive-server.module");
const auth_guard_1 = require("../common/guards/auth.guard");
let ServerModule = class ServerModule {
};
exports.ServerModule = ServerModule;
exports.ServerModule = ServerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: `.env`,
            }),
            axios_1.HttpModule.register({
                timeout: 5000,
                maxRedirects: 5,
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    uri: configService.get('MONGODB_URI'),
                    dbName: 'dehive_db',
                }),
            }),
            user_dehive_server_module_1.UserDehiveServerModule,
            mongoose_1.MongooseModule.forFeature([
                { name: server_schema_1.Server.name, schema: server_schema_1.ServerSchema },
                { name: category_schema_1.Category.name, schema: category_schema_1.CategorySchema },
                { name: channel_schema_1.Channel.name, schema: channel_schema_1.ChannelSchema },
                { name: user_dehive_schema_1.UserDehive.name, schema: user_dehive_schema_1.UserDehiveSchema },
                { name: user_dehive_server_schema_1.UserDehiveServer.name, schema: user_dehive_server_schema_1.UserDehiveServerSchema },
                { name: channel_message_schema_1.ChannelMessage.name, schema: channel_message_schema_1.ChannelMessageSchema },
            ]),
        ],
        controllers: [server_controller_1.ServerController],
        providers: [server_service_1.ServerService, auth_guard_1.AuthGuard],
    })
], ServerModule);
//# sourceMappingURL=server.module.js.map
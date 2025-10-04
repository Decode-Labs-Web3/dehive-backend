"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const axios_1 = require("@nestjs/axios");
const ioredis_1 = require("@nestjs-modules/ioredis");
const chat_gateway_1 = require("../gateway/chat.gateway");
const channel_messaging_controller_1 = require("./channel-messaging.controller");
const channel_messaging_service_1 = require("./channel-messaging.service");
const auth_service_client_1 = require("./auth-service.client");
const channel_message_schema_1 = require("../schemas/channel-message.schema");
const upload_schema_1 = require("../schemas/upload.schema");
const user_dehive_schema_1 = require("../../user-dehive-server/schemas/user-dehive.schema");
const server_schema_1 = require("../../server/schemas/server.schema");
const category_schema_1 = require("../../server/schemas/category.schema");
const channel_schema_1 = require("../../server/schemas/channel.schema");
const channel_conversation_schema_1 = require("../schemas/channel-conversation.schema");
const user_dehive_server_schema_1 = require("../../user-dehive-server/schemas/user-dehive-server.schema");
const auth_guard_1 = require("../common/guards/auth.guard");
let MessagingModule = class MessagingModule {
};
exports.MessagingModule = MessagingModule;
exports.MessagingModule = MessagingModule = __decorate([
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
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    uri: configService.get('MONGODB_URI'),
                    dbName: 'dehive_db',
                }),
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: channel_message_schema_1.ChannelMessage.name, schema: channel_message_schema_1.ChannelMessageSchema },
                { name: upload_schema_1.Upload.name, schema: upload_schema_1.UploadSchema },
                { name: user_dehive_schema_1.UserDehive.name, schema: user_dehive_schema_1.UserDehiveSchema },
                { name: server_schema_1.Server.name, schema: server_schema_1.ServerSchema },
                { name: category_schema_1.Category.name, schema: category_schema_1.CategorySchema },
                { name: channel_schema_1.Channel.name, schema: channel_schema_1.ChannelSchema },
                { name: user_dehive_server_schema_1.UserDehiveServer.name, schema: user_dehive_server_schema_1.UserDehiveServerSchema },
                { name: channel_conversation_schema_1.ChannelConversation.name, schema: channel_conversation_schema_1.ChannelConversationSchema },
            ]),
        ],
        controllers: [channel_messaging_controller_1.MessagingController],
        providers: [channel_messaging_service_1.MessagingService, chat_gateway_1.ChatGateway, auth_guard_1.AuthGuard, auth_service_client_1.AuthServiceClient],
    })
], MessagingModule);
//# sourceMappingURL=channel-messaging.module.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectMessagingModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const axios_1 = require("@nestjs/axios");
const direct_messaging_controller_1 = require("./direct-messaging.controller");
const direct_messaging_service_1 = require("./direct-messaging.service");
const direct_conversation_schema_1 = require("../schemas/direct-conversation.schema");
const direct_message_schema_1 = require("../schemas/direct-message.schema");
const direct_upload_schema_1 = require("../schemas/direct-upload.schema");
const direct_message_gateway_1 = require("../gateway/direct-message.gateway");
const user_dehive_schema_1 = require("../../user-dehive-server/schemas/user-dehive.schema");
const auth_guard_1 = require("../common/guards/auth.guard");
let DirectMessagingModule = class DirectMessagingModule {
};
exports.DirectMessagingModule = DirectMessagingModule;
exports.DirectMessagingModule = DirectMessagingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            axios_1.HttpModule.register({
                timeout: 5000,
                maxRedirects: 5,
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    uri: config.get('MONGODB_URI'),
                    dbName: 'dehive_db',
                }),
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: direct_conversation_schema_1.DirectConversation.name, schema: direct_conversation_schema_1.DirectConversationSchema },
                { name: direct_message_schema_1.DirectMessage.name, schema: direct_message_schema_1.DirectMessageSchema },
                { name: direct_upload_schema_1.DirectUpload.name, schema: direct_upload_schema_1.DirectUploadSchema },
                { name: user_dehive_schema_1.UserDehive.name, schema: user_dehive_schema_1.UserDehiveSchema },
            ]),
        ],
        controllers: [direct_messaging_controller_1.DirectMessagingController],
        providers: [direct_messaging_service_1.DirectMessagingService, direct_message_gateway_1.DmGateway, auth_guard_1.AuthGuard],
    })
], DirectMessagingModule);
//# sourceMappingURL=direct-messaging.module.js.map
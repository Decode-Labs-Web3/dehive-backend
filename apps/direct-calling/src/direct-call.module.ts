import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { RedisModule } from "@nestjs-modules/ioredis";

import {
  DirectCallController,
  StreamController,
} from "./direct-call.controller";
import { DirectCallService } from "./service/direct-call.service";
import { StreamCallService } from "./service/stream-call.service";
import { DirectCallGateway } from "../gateway/direct-call.gateway";
import { AuthGuard } from "../common/guards/auth.guard";
import { DecodeApiClient } from "../clients/decode-api.client";

// Schemas
import { DmCall, DmCallSchema } from "../schemas/dm-call.schema";
import {
  DirectConversation,
  DirectConversationSchema,
} from "../schemas/direct-conversation.schema";
import {
  DirectMessage,
  DirectMessageSchema,
} from "../schemas/direct-message.schema";
import {
  UserDehive,
  UserDehiveSchema,
} from "../../user-dehive-server/schemas/user-dehive.schema";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI"),
        dbName: "dehive_db",
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: DmCall.name, schema: DmCallSchema },
      { name: DirectConversation.name, schema: DirectConversationSchema },
      { name: DirectMessage.name, schema: DirectMessageSchema },
      { name: UserDehive.name, schema: UserDehiveSchema },
    ]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: "single",
        url: configService.get<string>("REDIS_URI") || "redis://localhost:6379",
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [DirectCallController, StreamController],
  providers: [
    AuthGuard,
    DecodeApiClient,
    StreamCallService,
    DirectCallService,
    DirectCallGateway,
  ],
  exports: [DirectCallService, StreamCallService],
})
export class DirectCallModule {}

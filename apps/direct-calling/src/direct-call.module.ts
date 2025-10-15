import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { RedisModule } from "@nestjs-modules/ioredis";

import { DirectCallController, TurnController } from "./direct-call.controller";
import { DirectCallService } from "./direct-call.service";
import { DirectCallGateway } from "../gateway/direct-call.gateway";
import { AuthGuard } from "../common/guards/auth.guard";
import { DecodeApiClient } from "../clients/decode-api.client";

// Schemas
import { DmCall, DmCallSchema } from "../schemas/dm-call.schema";
import { RtcSession, RtcSessionSchema } from "../schemas/rtc-session.schema";
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
      envFilePath: [".env", ".env.local"],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI"),
        dbName: configService.get<string>("MONGODB_DB_NAME"),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: DmCall.name, schema: DmCallSchema },
      { name: RtcSession.name, schema: RtcSessionSchema },
      { name: DirectConversation.name, schema: DirectConversationSchema },
      { name: DirectMessage.name, schema: DirectMessageSchema },
      { name: UserDehive.name, schema: UserDehiveSchema },
    ]),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (_configService: ConfigService) => ({
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          "Content-Type": "application/json",
        },
      }),
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: "single",
        url: configService.get<string>("REDIS_URL") || "redis://localhost:6379",
        options: {
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [DirectCallController, TurnController],
  providers: [DirectCallService, DirectCallGateway, AuthGuard, DecodeApiClient],
  exports: [DirectCallService],
})
export class DirectCallModule {}

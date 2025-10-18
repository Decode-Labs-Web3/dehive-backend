import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { HttpModule } from "@nestjs/axios";
import { RedisModule } from "@nestjs-modules/ioredis";
import { ChannelCallService } from "./channel-call.service";
import { StreamCallService } from "./stream-call.service";
import { ChannelCallController } from "./channel-call.controller";
import { ChannelCallGateway } from "../gateway/channel-call.gateway";
import { AuthGuard } from "../common/guards/auth.guard";
import { DecodeApiClient } from "../clients/decode-api.client";
import { ChannelCall, ChannelCallSchema } from "../schemas/channel-call.schema";
import {
  ChannelParticipant,
  ChannelParticipantSchema,
} from "../schemas/channel-participant.schema";
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
      { name: ChannelCall.name, schema: ChannelCallSchema },
      { name: ChannelParticipant.name, schema: ChannelParticipantSchema },
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
  controllers: [ChannelCallController],
  providers: [
    ChannelCallService,
    StreamCallService,
    ChannelCallGateway,
    AuthGuard,
    DecodeApiClient,
  ],
  exports: [ChannelCallService, StreamCallService],
})
export class ChannelCallModule {}

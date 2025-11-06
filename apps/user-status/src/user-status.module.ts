import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { RedisModule } from "@nestjs-modules/ioredis";
import { ScheduleModule } from "@nestjs/schedule";
import { UserStatusService } from "./services/user-status.service";
import { UserStatusController } from "./user-status.controller";
import { UserStatusGateway } from "../gateway/user-status.gateway";
import { AuthGuard } from "../common/guards/auth.guard";
import {
  UserStatusSchema,
  UserStatusModel,
} from "../schemas/user-status.schema";
import { DecodeApiClient } from "../clients/decode-api.client";
import { UserStatusCacheService } from "./services/user-status-cache.service";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI"),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: UserStatusSchema.name, schema: UserStatusModel },
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
        options: {
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UserStatusController],
  providers: [
    UserStatusService,
    UserStatusGateway,
    AuthGuard,
    DecodeApiClient,
    UserStatusCacheService,
  ],
})
export class UserStatusModule {}

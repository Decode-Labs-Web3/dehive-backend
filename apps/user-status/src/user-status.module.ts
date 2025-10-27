import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { UserStatusService } from "./user-status.service";
import { UserStatusController } from "./user-status.controller";
import { UserStatusGateway } from "../gateway/user-status.gateway";
import {
  UserStatusSchema,
  UserStatusModel,
} from "../schemas/user-status.schema";
import { DecodeApiClient } from "../clients/decode-api.client";

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
  ],
  controllers: [UserStatusController],
  providers: [UserStatusService, UserStatusGateway, DecodeApiClient],
})
export class UserStatusModule {}

import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { HttpModule } from "@nestjs/axios";
import { RedisModule } from "@nestjs-modules/ioredis";
import { ChatGateway } from "../gateway/chat.gateway";
import { MessagingController } from "./channel-messaging.controller";
import { MessagingService } from "./services/channel-messaging.service";
import { SearchService } from "./services/search.service";
import { AuthServiceClient } from "./auth-service.client";
import { DecodeApiClient } from "../clients/decode-api.client";
import {
  ChannelMessage,
  ChannelMessageSchema,
} from "../schemas/channel-message.schema";
import { Upload, UploadSchema } from "../schemas/upload.schema";
import {
  UserDehive,
  UserDehiveSchema,
} from "../../user-dehive-server/schemas/user-dehive.schema";
import { Server, ServerSchema } from "../../server/schemas/server.schema";
import { Category, CategorySchema } from "../../server/schemas/category.schema";
import { Channel, ChannelSchema } from "../../server/schemas/channel.schema";
import {
  UserDehiveServer,
  UserDehiveServerSchema,
} from "../../user-dehive-server/schemas/user-dehive-server.schema";
import { AuthGuard } from "../common/guards/auth.guard";
import { IPFSService } from "./services/ipfs.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: "single",
        url: config.get<string>("REDIS_URI"),
      }),
      inject: [ConfigService],
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI"),
        dbName: "dehive_db",
      }),
    }),

    MongooseModule.forFeature([
      { name: ChannelMessage.name, schema: ChannelMessageSchema },
      { name: Upload.name, schema: UploadSchema },
      { name: UserDehive.name, schema: UserDehiveSchema },
      { name: Server.name, schema: ServerSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: UserDehiveServer.name, schema: UserDehiveServerSchema },
    ]),
  ],
  controllers: [MessagingController],
  providers: [
    MessagingService,
    SearchService,
    ChatGateway,
    AuthGuard,
    AuthServiceClient,
    DecodeApiClient,
    IPFSService,
  ],
})
export class MessagingModule {}

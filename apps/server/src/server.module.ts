import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { HttpModule } from "@nestjs/axios";
import { RedisModule } from "@nestjs-modules/ioredis";
import { ServerController } from "./server.controller";
import { ServerService } from "./services/server.service";
import { Server, ServerSchema } from "../schemas/server.schema";
import { IpfsMapping, IpfsMappingSchema } from "../schemas/ipfs-mapping.schema";
import { Category, CategorySchema } from "../schemas/category.schema";
import { Channel, ChannelSchema } from "../schemas/channel.schema";
import { UserDehive, UserDehiveSchema } from "../schemas/user-dehive.schema";
import {
  UserDehiveServer,
  UserDehiveServerSchema,
} from "../schemas/user-dehive-server.schema";
import {
  ChannelMessage,
  ChannelMessageSchema,
} from "../schemas/channel-message.schema";
import { AuthGuard } from "../common/guards/auth.guard";
import { IPFSService } from "./services/ipfs.service";
import { NftVerificationService } from "./services/nft-verification.service";
import { NetworkMappingService } from "./services/network-mapping.service";
import { AuditLogService } from "./services/audit-log.service";
import {
  ServerAuditLog,
  ServerAuditLogSchema,
} from "../schemas/server-audit-log.schema";
import { ServerEventsGateway } from "../gateway/server-events.gateway";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
    }),
    HttpModule.register({
      timeout: 10000,
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
      { name: Server.name, schema: ServerSchema },
      { name: IpfsMapping.name, schema: IpfsMappingSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: UserDehive.name, schema: UserDehiveSchema },
      { name: UserDehiveServer.name, schema: UserDehiveServerSchema },
      { name: ChannelMessage.name, schema: ChannelMessageSchema },
      { name: ServerAuditLog.name, schema: ServerAuditLogSchema },
    ]),
  ],
  controllers: [ServerController],
  providers: [
    ServerService,
    AuthGuard,
    IPFSService,
    NftVerificationService,
    NetworkMappingService,
    AuditLogService,
    ServerEventsGateway,
  ],
  exports: [ServerEventsGateway],
})
export class ServerModule {}

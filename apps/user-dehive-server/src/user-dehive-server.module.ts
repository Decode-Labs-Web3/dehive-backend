import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { HttpModule } from "@nestjs/axios";
import { RedisModule } from "@nestjs-modules/ioredis";
import { UserDehiveServerController } from "./user-dehive-server.controller";
import { UserDehiveServerService } from "./user-dehive-server.service";
import { AuditLogService } from "./audit-log.service";
import { DecodeApiClient } from "../clients/decode-api.client";
import { UserDehive, UserDehiveSchema } from "../schemas/user-dehive.schema";
import { Server, ServerSchema } from "../schemas/server.schema";
import { InviteLink, InviteLinkSchema } from "../schemas/invite-link.schema";
import {
  ServerAuditLog,
  ServerAuditLogSchema,
} from "../schemas/server-audit-log.schema";
import { ServerBan, ServerBanSchema } from "../schemas/server-ban.schema";
import {
  UserDehiveServer,
  UserDehiveServerSchema,
} from "../schemas/user-dehive-server.schema";
import { AuthGuard } from "../common/guards/auth.guard";
import { NftVerificationService } from "../../server/src/services/nft-verification.service";
import { ServerModule } from "../../server/src/server.module";

const MONGOOSE_MODELS = MongooseModule.forFeature([
  { name: "UserDehive", schema: UserDehiveSchema },
  { name: "UserDehiveServer", schema: UserDehiveServerSchema },
  { name: "Server", schema: ServerSchema },
  { name: "ServerBan", schema: ServerBanSchema },
  { name: "InviteLink", schema: InviteLinkSchema },
  { name: "ServerAuditLog", schema: ServerAuditLogSchema },
]);

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
    MONGOOSE_MODELS,

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI"),
        dbName: "dehive_db", // Explicitly set database name
      }),
    }),

    MongooseModule.forFeature([
      { name: UserDehive.name, schema: UserDehiveSchema },
      { name: Server.name, schema: ServerSchema },
      { name: InviteLink.name, schema: InviteLinkSchema },
      { name: ServerAuditLog.name, schema: ServerAuditLogSchema },
      { name: ServerBan.name, schema: ServerBanSchema },
      { name: UserDehiveServer.name, schema: UserDehiveServerSchema },
    ]),
    // Import ServerModule to access and reuse ServerEventsGateway (exported by ServerModule)
    forwardRef(() => ServerModule),
  ],
  controllers: [UserDehiveServerController],
  providers: [
    UserDehiveServerService,
    AuditLogService,
    DecodeApiClient,
    AuthGuard,
    NftVerificationService,
  ],
  exports: [UserDehiveServerService, AuditLogService, MONGOOSE_MODELS],
})
export class UserDehiveServerModule {}

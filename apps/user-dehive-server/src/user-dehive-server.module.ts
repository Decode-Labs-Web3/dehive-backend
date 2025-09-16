import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserDehiveServerController } from './user-dehive-server.controller';
import { UserDehiveServerService } from './user-dehive-server.service';
import { UserDehive, UserDehiveSchema } from '../schemas/user-dehive.schema';
import { Server, ServerSchema } from '../schemas/server.schema';
import { InviteLink, InviteLinkSchema } from '../schemas/invite-link.schema';
import { ServerAuditLog, ServerAuditLogSchema } from '../schemas/server-audit-log.schema';
import { ServerBan, ServerBanSchema } from '../schemas/server-ban.schema';
import { UserDehiveServer, UserDehiveServerSchema } from '../schemas/user-dehive-server.schema';
import { User, UserSchema } from '../../user/schemas/user.schema';
import { FakeAuthGuard } from '../guards/fake-auth.guard';

const MONGOOSE_MODELS = MongooseModule.forFeature([
  { name: 'UserDehive', schema: UserDehiveSchema },
  { name: 'UserDehiveServer', schema: UserDehiveServerSchema },
  { name: 'Server', schema: ServerSchema },
  { name: 'User', schema: UserSchema },
  { name: 'ServerBan', schema: ServerBanSchema },
  { name: 'InviteLink', schema: InviteLinkSchema },
]);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MONGOOSE_MODELS,

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),

    MongooseModule.forFeature([
      { name: UserDehive.name, schema: UserDehiveSchema },
      { name: Server.name, schema: ServerSchema },
      { name: InviteLink.name, schema: InviteLinkSchema },
      { name: ServerAuditLog.name, schema: ServerAuditLogSchema },
      { name: ServerBan.name, schema: ServerBanSchema },
      { name: UserDehiveServer.name, schema: UserDehiveServerSchema }, 
      { name: User.name, schema: UserSchema }, 
    ]),
  ],
  controllers: [UserDehiveServerController],
  providers: [
    UserDehiveServerService,
    FakeAuthGuard,
  ], 
  exports: [
    UserDehiveServerService,
    MONGOOSE_MODELS,
  ],
})
export class UserDehiveServerModule {}
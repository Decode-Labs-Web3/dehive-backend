import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { RedisModule } from '@nestjs-modules/ioredis';
import { UserDehiveServer, UserDehiveServerSchema } from '../entities/user-dehive-server.entity';
import { Server, ServerSchema } from '../schemas/server.schema';
import { ServerBan, ServerBanSchema } from '../schemas/server-ban.schema';
import { InviteLink, InviteLinkSchema } from '../schemas/invite-link.schema';
import { ServerAuditLog, ServerAuditLogSchema } from '../schemas/server-audit-log.schema';
import { UserDehiveServerService } from './user-dehive-server.service';
import { UserDehiveServerController } from './user-dehive-server.controller';
import { EventProducerService } from '../kafka/event-producer.service';
import { InviteLinkCache } from '../redis/invite-link.cache';
import { NotificationCache } from '../redis/notification.cache';
import { IsServerOwnerGuard, IsMemberGuard, IsModeratorGuard } from '../strategies/guards';
import { kafkaConfig } from '../kafka/kafka.config';
import { UserDehive, UserDehiveSchema } from '../../user-dehive/schemas/user-dehive.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: './apps/user-dehive-server/.env',
      isGlobal: true,
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'single',
        url: undefined,
        host: configService.get('REDIS_HOST') || 'localhost',
        port: parseInt(configService.get('REDIS_PORT') || '6379'),
        password: configService.get('REDIS_PASSWORD') || undefined,
        db: 0,
        keyPrefix: 'user-dehive-server:'
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        retryAttempts: 3,
        retryDelay: 1000,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: UserDehiveServer.name, schema: UserDehiveServerSchema },
      { name: Server.name, schema: ServerSchema },
      { name: ServerBan.name, schema: ServerBanSchema },
      { name: ServerAuditLog.name, schema: ServerAuditLogSchema },
      { name: InviteLink.name, schema: InviteLinkSchema },
      { name: UserDehive.name, schema: UserDehiveSchema }
    ]),
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        ...kafkaConfig
      }
    ])
  ],
  controllers: [UserDehiveServerController],
  providers: [
    UserDehiveServerService,
    EventProducerService,
    InviteLinkCache,
    NotificationCache,
    IsServerOwnerGuard,
    IsMemberGuard,
    IsModeratorGuard,
  ],
  exports: [UserDehiveServerService],
})
export class UserDehiveServerModule {}
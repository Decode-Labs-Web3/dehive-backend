import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule } from '@nestjs/microservices';
import { UserDehiveServer, UserDehiveServerSchema } from '../entities/user-dehive-server.entity';
import { UserDehiveServerService } from './user-dehive-server.service';
import { UserDehiveServerController } from './user-dehive-server.controller';
import { EventProducerService } from '../kafka/event-producer.service';
import { InviteLinkCache } from '../redis/invite-link.cache';
import { NotificationCache } from '../redis/notification.cache';
import { IsServerOwnerGuard, IsMemberGuard } from '../strategies/guards';
import { kafkaConfig } from '../kafka/kafka.config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDehiveServer.name, schema: UserDehiveServerSchema }
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
  ],
  exports: [UserDehiveServerService],
})
export class UserDehiveServerModule {}
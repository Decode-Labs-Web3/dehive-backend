import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { DirectMessagingController } from './direct-messaging.controller';
import { DirectMessagingService } from './direct-messaging.service';
import {
  DirectConversation,
  DirectConversationSchema,
} from '../schemas/direct-conversation.schema';
import {
  DirectMessage,
  DirectMessageSchema,
} from '../schemas/direct-message.schema';
import {
  DirectUpload,
  DirectUploadSchema,
} from '../schemas/direct-upload.schema';
import { DmGateway } from '../gateway/direct-message.gateway';
import {
  UserDehive,
  UserDehiveSchema,
} from '../../user-dehive-server/schemas/user-dehive.schema';
import { AuthGuard } from '../common/guards/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
        dbName: 'dehive_db',
      }),
    }),
    MongooseModule.forFeature([
      { name: DirectConversation.name, schema: DirectConversationSchema },
      { name: DirectMessage.name, schema: DirectMessageSchema },
      { name: DirectUpload.name, schema: DirectUploadSchema },
      { name: UserDehive.name, schema: UserDehiveSchema },
    ]),
  ],
  controllers: [DirectMessagingController],
  providers: [DirectMessagingService, DmGateway, AuthGuard],
})
export class DirectMessagingModule {}

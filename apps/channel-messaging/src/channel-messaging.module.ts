import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from '../gateway/chat.gateway';
import { MessagingController } from './channel-messaging.controller';
import { MessagingService } from './channel-messaging.service';
import {
  ChannelMessage,
  ChannelMessageSchema,
} from '../schemas/channel-message.schema';
import { Upload, UploadSchema } from '../schemas/upload.schema';
import {
  UserDehive,
  UserDehiveSchema,
} from '../../user-dehive-server/schemas/user-dehive.schema';
import { Server, ServerSchema } from '../../server/schemas/server.schema';
import { Category, CategorySchema } from '../../server/schemas/category.schema';
import { Channel, ChannelSchema } from '../../server/schemas/channel.schema';
import {
  ChannelConversation,
  ChannelConversationSchema,
} from '../schemas/channel-conversation.schema';
import {
  UserDehiveServer,
  UserDehiveServerSchema,
} from '../../user-dehive-server/schemas/user-dehive-server.schema';
import { User, UserSchema } from '../../user/schemas/user.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
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
      { name: User.name, schema: UserSchema },
      { name: ChannelConversation.name, schema: ChannelConversationSchema },
    ]),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, ChatGateway],
})
export class MessagingModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServerController } from './server.controller';
import { ServerService } from './server.service';
import { Server, ServerSchema } from '../schemas/server.schema';
import { Category, CategorySchema } from '../schemas/category.schema';
import { Channel, ChannelSchema } from '../schemas/channel.schema';
import {
  UserDehive,
  UserDehiveSchema,
} from '../../user-dehive-server/schemas/user-dehive.schema';
import {
  UserDehiveServer,
  UserDehiveServerSchema,
} from '../../user-dehive-server/schemas/user-dehive-server.schema';
import {
  ChannelMessage,
  ChannelMessageSchema,
} from '../schemas/channel-message.schema';
import { UserDehiveServerModule } from '../../user-dehive-server/src/user-dehive-server.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),

    UserDehiveServerModule,

    MongooseModule.forFeature([
      { name: Server.name, schema: ServerSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: UserDehive.name, schema: UserDehiveSchema },
      { name: UserDehiveServer.name, schema: UserDehiveServerSchema },
      { name: ChannelMessage.name, schema: ChannelMessageSchema },
    ]),
  ],
  controllers: [ServerController],
  providers: [ServerService],
})
export class ServerModule {}

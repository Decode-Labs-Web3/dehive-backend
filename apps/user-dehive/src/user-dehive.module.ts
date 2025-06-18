import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserDehiveController } from '../src/user-dehive.controller';
import { UserDehiveService } from '../src/user-dehive.service';
import { UserDehive, UserDehiveSchema } from '../schemas/user-dehive.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { UserDehiveServer, UserDehiveServerSchema } from '../../user-dehive-server/entities/user-dehive-server.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: './apps/user-dehive/.env',
      isGlobal: true,
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
      { name: UserDehive.name, schema: UserDehiveSchema },
      { name: User.name, schema: UserSchema },
      { name: UserDehiveServer.name, schema: UserDehiveServerSchema },
    ]),
  ],
  controllers: [UserDehiveController],
  providers: [UserDehiveService],
})
export class UserDehiveModule {}
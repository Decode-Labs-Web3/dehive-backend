import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SessionService } from './services/session.service';
import { RegisterService } from './services/register.service';
import { UserService } from './services/user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserDehiveSchema } from './schemas/user-dehive.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DecodeApiClient } from './infrastructure/external-services/decode-api.client';
import { RedisInfrastructure } from './infrastructure/redis.infrastructure';
import { RedisModule } from '@nestjs-modules/ioredis';
import { HttpModule } from '@nestjs/axios';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
        dbName: 'dehive_db', // Explicitly set database name
      }),
      inject: [ConfigService],
    }),
    HttpModule,
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: config.get<string>('REDIS_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: 'UserDehive', schema: UserDehiveSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    SessionService,
    RegisterService,
    UserService,
    DecodeApiClient,
    RedisInfrastructure,
  ],
})
export class AuthModule {}

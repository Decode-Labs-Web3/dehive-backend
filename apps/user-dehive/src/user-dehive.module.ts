import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserDehiveController } from './user-dehive.controller';
import { UserDehiveService } from './user-dehive.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [UserDehiveController],
  providers: [UserDehiveService],
})
export class UserDehiveModule {}

import { Module } from '@nestjs/common';
import { UserDehiveController } from './user-dehive.controller';
import { UserDehiveService } from './user-dehive.service';

@Module({
  imports: [],
  controllers: [UserDehiveController],
  providers: [UserDehiveService],
})
export class UserDehiveModule {}

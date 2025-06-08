import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserDehiveController } from '../src/user-dehive.controller';
import { UserDehiveService } from '../src/user-dehive.service';
import { UserDehive, UserDehiveSchema } from '../entities/user-dehive.entity';
import { User, UserSchema } from '../entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDehive.name, schema: UserDehiveSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [UserDehiveController],
  providers: [UserDehiveService],
})
export class UserDehiveModule {}
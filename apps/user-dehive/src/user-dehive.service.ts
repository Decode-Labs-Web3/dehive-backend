import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDehive } from '../entities/user-dehive.entity';
import { User } from '../entities/user.entity';
import { EnrichedUserDehive } from '../interfaces/enriched-user-dehive.interface';

@Injectable()
export class UserDehiveService {
  constructor(
    @InjectModel(UserDehive.name) private userDehiveModel: Model<UserDehive>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async getEnrichedUser(userDehiveId: string): Promise<EnrichedUserDehive> {
    const dehive = await this.userDehiveModel.findById(userDehiveId).lean();
    if (!dehive) throw new NotFoundException('UserDehive not found');

    const user = await this.userModel.findById(dehive.user_id).lean();
    if (!user) throw new NotFoundException('User not found');

    return {
      _id: dehive._id.toString(),
      user_id: dehive.user_id.toString(),
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_fallback_url,
      status: dehive.status,
      dehive_role: dehive.dehive_role,
      server_count: dehive.server_count,
      last_login: dehive.last_login,
    };
  }
}
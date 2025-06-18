import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDehive } from '../schemas/user-dehive.schema';
import { User } from '../schemas/user.schema';
import { EnrichedUserDehive } from '../interfaces/enriched-user-dehive.interface';
import { UserDehiveServer } from '../../user-dehive-server/entities/user-dehive-server.entity';

@Injectable()
export class UserDehiveService {
  constructor(
    @InjectModel(UserDehive.name) private userDehiveModel: Model<UserDehive>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserDehiveServer.name) private userDehiveServerModel: Model<UserDehiveServer>,
  ) {}
// Giống như xem Profile user 
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
      server_count: dehive.server_count,
      last_login: dehive.last_login,
    };
  }

  async getMemberInServer(userId: string, serverId: string) {
    console.log('Finding member with userId:', userId, 'in serverId:', serverId);
    
    const member = await this.userDehiveServerModel.findOne({
      user_dehive_id: new Types.ObjectId(userId),
      server_id: new Types.ObjectId(serverId),
    }).lean();

    console.log('Found member:', member);

    if (!member) {
      throw new NotFoundException('Member not found in server');
    }

    return {
      _id: member._id.toString(),
      user_dehive_id: member.user_dehive_id.toString(),
      server_id: member.server_id.toString(),
      role: member.role,
      is_banned: member.is_banned,
      joined_at: member.joined_at,
    };
  }
}